import { Hono } from "hono";
import { createJWT } from "../utils/jwt.ts";

function getAdminCredentials(): { username: string; password: string } {
  return {
    username: Deno.env.get("ADMIN_USER") || "admin",
    password: Deno.env.get("ADMIN_PASS") || "supersecret",
  };
}

function getSessionTtlSeconds(): number {
  const parsed = parseInt(Deno.env.get("SESSION_TTL_SECONDS") || "3600", 10);
  const candidate = Number.isFinite(parsed) ? parsed : 3600;
  return Math.max(300, Math.min(60 * 60 * 12, candidate));
}

const authRoutes = new Hono();

authRoutes.post("/auth/login", async (c) => {
  let username: string | undefined;
  let password: string | undefined;

  try {
    const body = await c.req.json();
    if (body && typeof body.username === "string" && typeof body.password === "string") {
      username = body.username;
      password = body.password;
    }
  } catch {
    // ignore parse errors; fall through to missing credentials handling
  }

  if (!username || !password) {
    return c.json({ error: "Missing credentials" }, 400);
  }

  const { username: adminUser, password: adminPass } = getAdminCredentials();
  if (username !== adminUser || password !== adminPass) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const sessionTtl = getSessionTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const token = await createJWT({ username: adminUser, iat: now, exp: now + sessionTtl });
  return c.json({ token, expiresIn: sessionTtl });
});

export { authRoutes };
