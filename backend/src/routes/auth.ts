import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { createJWT } from "../utils/jwt.ts";

const authRoutes = new Hono();

const ADMIN_USER = Deno.env.get("ADMIN_USER") || "admin";
const ADMIN_PASS = Deno.env.get("ADMIN_PASS") || "supersecret";

authRoutes.post("/auth/login", basicAuth({
  username: ADMIN_USER,
  password: ADMIN_PASS,
}), async (c) => {
  // If basic auth succeeds, generate JWT
  const token = await createJWT({ username: ADMIN_USER });
  return c.json({ token });
});

export { authRoutes };