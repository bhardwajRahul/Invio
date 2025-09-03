// Default UUID for IDs
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Generate a long random token suitable for share links (base64url, 32 bytes => 43 chars)
export function generateShareToken(bytes: number = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  // Convert to base64url without padding
  const b64 = btoa(String.fromCharCode(...arr as unknown as number[]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return b64;
}