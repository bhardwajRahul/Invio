import { Hono } from "hono";
import { createJWT } from "../utils/jwt.ts";
import { verifyJWTPayload } from "../utils/jwt.ts";
import {
  authenticateUser,
  consumeUserRecoveryCodeHash,
  getUserById,
  getUserTwoFactorState,
} from "../controllers/users.ts";
import {
  decryptTwoFactorSecret,
  hashRecoveryCode,
  verifyTotpToken,
} from "../utils/twoFactor.ts";
import {
  createRateLimitResponse,
  getClientIp,
  getRateLimitConfig,
  isRateLimited,
  recordFailedAttempt,
  resetRateLimit,
} from "../middleware/rateLimiter.ts";
import { generateUUID } from "../utils/uuid.ts";
import { isDemoMode } from "../utils/env.ts";

function getSessionTtlSeconds(): number {
  const parsed = parseInt(Deno.env.get("SESSION_TTL_SECONDS") || "3600", 10);
  const candidate = Number.isFinite(parsed) ? parsed : 3600;
  return Math.max(300, Math.min(60 * 60 * 12, candidate));
}

const TWO_FACTOR_CHALLENGE_TTL_SECONDS = 5 * 60;
const DEMO_MODE = isDemoMode();

type PendingLoginChallenge = {
  userId: string;
  expiresAt: number;
  used: boolean;
};

const pendingLoginChallenges = new Map<string, PendingLoginChallenge>();

function cleanupPendingLoginChallenges(now = Date.now()): void {
  for (const [key, value] of pendingLoginChallenges.entries()) {
    if (value.expiresAt <= now || value.used) {
      pendingLoginChallenges.delete(key);
    }
  }
}

async function issueSessionToken(c: {
  id: string;
  username: string;
  isAdmin: boolean;
}) {
  const sessionTtl = getSessionTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const token = await createJWT({
    userId: c.id,
    username: c.username,
    isAdmin: c.isAdmin,
    iat: now,
    exp: now + sessionTtl,
  });
  return { token, expiresIn: sessionTtl };
}

async function issueTwoFactorChallengeToken(c: {
  userId: string;
  username: string;
  isAdmin: boolean;
}): Promise<string> {
  cleanupPendingLoginChallenges();
  const now = Math.floor(Date.now() / 1000);
  const jti = generateUUID();
  pendingLoginChallenges.set(jti, {
    userId: c.userId,
    expiresAt: Date.now() + TWO_FACTOR_CHALLENGE_TTL_SECONDS * 1000,
    used: false,
  });
  return await createJWT({
    kind: "2fa_login",
    jti,
    userId: c.userId,
    username: c.username,
    isAdmin: c.isAdmin,
    iat: now,
    exp: now + TWO_FACTOR_CHALLENGE_TTL_SECONDS,
  });
}

function validateTwoFactorChallengePayload(payload: Record<string, unknown>):
  | { valid: true; jti: string; userId: string }
  | {
      valid: false;
      error: string;
    } {
  if (payload.kind !== "2fa_login") {
    return { valid: false, error: "Invalid 2FA token" };
  }
  const jti = typeof payload.jti === "string" ? payload.jti : "";
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  if (!jti || !userId) {
    return { valid: false, error: "Invalid 2FA token" };
  }
  const challenge = pendingLoginChallenges.get(jti);
  if (!challenge || challenge.userId !== userId) {
    return { valid: false, error: "Invalid or expired 2FA token" };
  }
  if (challenge.used || challenge.expiresAt <= Date.now()) {
    pendingLoginChallenges.delete(jti);
    return { valid: false, error: "Invalid or expired 2FA token" };
  }
  return { valid: true, jti, userId };
}

function markChallengeAsUsed(jti: string): void {
  const challenge = pendingLoginChallenges.get(jti);
  if (!challenge) return;
  challenge.used = true;
  pendingLoginChallenges.set(jti, challenge);
  cleanupPendingLoginChallenges();
}

const authRoutes = new Hono();

authRoutes.post("/auth/login", async (c) => {
  const config = getRateLimitConfig();
  const clientIp = getClientIp(c.req.raw.headers, config.trustProxy);

  let username: string | undefined;
  let password: string | undefined;

  try {
    const body = await c.req.json();
    if (
      body &&
      typeof body.username === "string" &&
      typeof body.password === "string"
    ) {
      username = body.username;
      password = body.password;
    }
  } catch {
    // ignore parse errors; fall through to missing credentials handling
  }

  if (!username || !password) {
    return c.json({ error: "Missing credentials" }, 400);
  }

  // Check rate limit before attempting authentication
  // This checks by IP, username, and IP+username combination
  const rateLimitCheck = isRateLimited(clientIp, username);
  if (rateLimitCheck.limited) {
    return createRateLimitResponse(rateLimitCheck.retryAfter);
  }

  // Authenticate against the users table
  const user = await authenticateUser(username, password);
  if (!user) {
    // Record failed attempt for rate limiting (tracks IP, username, and combination)
    recordFailedAttempt(clientIp, username);
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Successful login: reset rate limit counters
  resetRateLimit(clientIp, username);

  if (user.twoFactorEnabled && !DEMO_MODE) {
    const state = getUserTwoFactorState(user.id);
    if (!state?.enabled || !state.encryptedSecret) {
      return c.json(
        { error: "2FA is enabled but not configured correctly" },
        500,
      );
    }
    const challenge = await issueTwoFactorChallengeToken({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });
    return c.json({
      twoFactorRequired: true,
      twoFactorToken: challenge,
      expiresIn: TWO_FACTOR_CHALLENGE_TTL_SECONDS,
    });
  }

  const session = await issueSessionToken(user);
  return c.json(session);
});

authRoutes.post("/auth/verify-2fa", async (c) => {
  if (DEMO_MODE) {
    return c.json({ error: "2FA is not available in demo mode" }, 403);
  }

  const config = getRateLimitConfig();
  const clientIp = getClientIp(c.req.raw.headers, config.trustProxy);

  let twoFactorToken: string | undefined;
  let token: string | undefined;
  try {
    const body = await c.req.json();
    if (
      body &&
      typeof body.twoFactorToken === "string" &&
      typeof body.token === "string"
    ) {
      twoFactorToken = body.twoFactorToken;
      token = body.token;
    }
  } catch {
    // ignore parse errors
  }

  if (!twoFactorToken || !token) {
    return c.json({ error: "Missing 2FA verification payload" }, 400);
  }

  const payload = await verifyJWTPayload(twoFactorToken);
  if (!payload) return c.json({ error: "Invalid or expired 2FA token" }, 401);

  const parsed = validateTwoFactorChallengePayload(payload);
  if (!parsed.valid) return c.json({ error: parsed.error }, 401);

  // Rate-limit by IP + userId to block brute-force of TOTP codes
  const rateLimitCheck = isRateLimited(clientIp, parsed.userId);
  if (rateLimitCheck.limited)
    return createRateLimitResponse(rateLimitCheck.retryAfter);

  const user = getUserById(parsed.userId);
  if (!user || !user.isActive || !user.twoFactorEnabled) {
    return c.json({ error: "Invalid 2FA login state" }, 401);
  }
  const state = getUserTwoFactorState(parsed.userId);
  if (!state?.enabled || !state.encryptedSecret) {
    return c.json({ error: "2FA is not configured for this user" }, 401);
  }

  const secret = await decryptTwoFactorSecret(state.encryptedSecret);
  if (!secret || !verifyTotpToken(secret, user.username, token)) {
    recordFailedAttempt(clientIp, parsed.userId);
    return c.json({ error: "Invalid 2FA token" }, 401);
  }

  markChallengeAsUsed(parsed.jti);
  resetRateLimit(clientIp, parsed.userId);
  const session = await issueSessionToken(user);
  return c.json(session);
});

authRoutes.post("/auth/recover-2fa", async (c) => {
  if (DEMO_MODE) {
    return c.json({ error: "2FA is not available in demo mode" }, 403);
  }

  const config = getRateLimitConfig();
  const clientIp = getClientIp(c.req.raw.headers, config.trustProxy);

  let twoFactorToken: string | undefined;
  let recoveryCode: string | undefined;
  try {
    const body = await c.req.json();
    if (
      body &&
      typeof body.twoFactorToken === "string" &&
      typeof body.recoveryCode === "string"
    ) {
      twoFactorToken = body.twoFactorToken;
      recoveryCode = body.recoveryCode;
    }
  } catch {
    // ignore parse errors
  }

  if (!twoFactorToken || !recoveryCode) {
    return c.json({ error: "Missing 2FA recovery payload" }, 400);
  }

  const payload = await verifyJWTPayload(twoFactorToken);
  if (!payload) return c.json({ error: "Invalid or expired 2FA token" }, 401);
  const parsed = validateTwoFactorChallengePayload(payload);
  if (!parsed.valid) return c.json({ error: parsed.error }, 401);

  // Rate-limit by IP + userId to block brute-force of recovery codes
  const rateLimitCheck = isRateLimited(clientIp, parsed.userId);
  if (rateLimitCheck.limited)
    return createRateLimitResponse(rateLimitCheck.retryAfter);

  const user = getUserById(parsed.userId);
  if (!user || !user.isActive || !user.twoFactorEnabled) {
    return c.json({ error: "Invalid 2FA login state" }, 401);
  }

  const recoveryHash = await hashRecoveryCode(recoveryCode);
  const consumed = consumeUserRecoveryCodeHash(parsed.userId, recoveryHash);
  if (!consumed) {
    recordFailedAttempt(clientIp, parsed.userId);
    return c.json({ error: "Invalid recovery code" }, 401);
  }

  markChallengeAsUsed(parsed.jti);
  resetRateLimit(clientIp, parsed.userId);
  const session = await issueSessionToken(user);
  return c.json(session);
});

export { authRoutes };
