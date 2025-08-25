import { create, verify, decode } from "djwt";

const secretKey = Deno.env.get("JWT_SECRET") || "your-secret-key-change-this-in-production";

async function getKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
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