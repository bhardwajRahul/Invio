import { Context, Next } from "elysia";
import { createHash } from "crypto";
import { verifyJWT, createJWT } from "../utils/jwt.ts";

const ADMIN_USER = Deno.env.get("ADMIN_USER") || "admin";
const ADMIN_PASS = Deno.env.get("ADMIN_PASS") || "supersecret";

export const basicAuth = async (ctx: Context, next: Next) => {
  const authHeader = ctx.request.headers.get("Authorization");
  
  if (!authHeader) {
    ctx.response.status = 401;
    ctx.response.headers.set("WWW-Authenticate", "Basic");
    return ctx.response.body = { message: "Authentication required" };
  }

  const [scheme, encoded] = authHeader.split(" ");
  
  if (scheme !== "Basic" || !encoded) {
    ctx.response.status = 401;
    ctx.response.headers.set("WWW-Authenticate", "Basic");
    return ctx.response.body = { message: "Invalid authentication format" };
  }

  const decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0)));
  const [username, password] = decoded.split(":");

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    await next();
  } else {
    ctx.response.status = 403;
    ctx.response.body = { message: "Forbidden" };
  }
};

export const jwtAuth = async (ctx: Context, next: Next) => {
  const token = ctx.request.headers.get("Authorization")?.split(" ")[1];

  if (!token) {
    ctx.response.status = 401;
    return ctx.response.body = { message: "Token required" };
  }

  try {
    const payload = await verifyJWT(token);
    ctx.state.user = payload;
    await next();
  } catch {
    ctx.response.status = 403;
    ctx.response.body = { message: "Invalid token" };
  }
};

export const generateToken = (username: string) => {
  return createJWT({ username });
};