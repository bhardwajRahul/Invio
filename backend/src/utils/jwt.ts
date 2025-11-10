import { create, decode, verify } from "djwt";
import { getJwtSecret, getAdminCredentials } from "./env.ts";

function validateSecret(secretKey: string) {
  if (!secretKey || secretKey.trim().length === 0) {
    throw new Error("JWT_SECRET must not be empty");
  }

  const trimmed = secretKey.trim();
  if (trimmed.length < 16) {
    console.warn("Warning: JWT_SECRET is shorter than 16 characters. Consider using a longer secret for better security.");
  }
}

function validateAdminCredentials() {
  const { username, password } = getAdminCredentials();
  if (!username || username.trim().length === 0) {
    throw new Error("ADMIN_USER must not be empty");
  }
  if (!password || password.trim().length === 0) {
    throw new Error("ADMIN_PASS must not be empty");
  }
}

async function getKey(): Promise<CryptoKey> {
  validateAdminCredentials();
  const secretKey = getJwtSecret();
  validateSecret(secretKey);
  const secretBytes = new TextEncoder().encode(secretKey.trim());
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return key;
}

export async function createJWT(payload: Record<string, unknown>) {
  const key = await getKey();
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

export async function generateJWT(adminUser: string) {
  const payload = { user: adminUser };
  const key = await getKey();
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

export async function verifyJWT(token: string) {
  try {
    const key = await getKey();
    const payload = await verify(token, key);
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export function decodeJWT(token: string) {
  return decode(token);
}
