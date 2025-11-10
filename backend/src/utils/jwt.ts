import { create, decode, verify } from "djwt";
import { getJwtSecret } from "./env.ts";

async function getKey(): Promise<CryptoKey> {
  const secretKey = getJwtSecret();
  const secretBytes = new TextEncoder().encode(secretKey);
  if (secretBytes.length === 0) {
    throw new Error("JWT_SECRET must not be empty");
  }
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
