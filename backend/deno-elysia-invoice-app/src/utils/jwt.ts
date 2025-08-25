import { create, verify, decode } from "https://deno.land/x/djwt/mod.ts";

const SECRET_KEY = Deno.env.get("JWT_SECRET") || "your-secret-key";

export function generateJWT(adminUser: string) {
  const payload = { user: adminUser };
  return create({ alg: "HS256", typ: "JWT" }, payload, SECRET_KEY);
}

export async function verifyJWT(token: string) {
  try {
    const payload = await verify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

export function decodeJWT(token: string) {
  return decode(token);
}