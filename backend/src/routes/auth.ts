import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { createJWT } from "../utils/jwt.ts";
import { getAdminCredentials } from "../utils/env.ts";

const authRoutes = new Hono();

const { username: ADMIN_USER, password: ADMIN_PASS } = getAdminCredentials();

authRoutes.post(
  "/auth/login",
  basicAuth({
    username: ADMIN_USER,
    password: ADMIN_PASS,
  }),
  async (c) => {
    // If basic auth succeeds, generate JWT
    const token = await createJWT({ username: ADMIN_USER });
    return c.json({ token });
  },
);

export { authRoutes };
