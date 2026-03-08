import { hash, compare } from "bcrypt";

/**
 * Hash a plaintext password using bcrypt.
 * Returns the bcrypt hash string.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return await hash(plaintext);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(
  plaintext: string,
  hashedPassword: string,
): Promise<boolean> {
  return await compare(plaintext, hashedPassword);
}
