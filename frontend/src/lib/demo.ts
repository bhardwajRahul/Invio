import { env } from "$env/dynamic/private";

export const BACKEND_URL = env.BACKEND_URL || "http://localhost:3000";

export async function getDemoMode() {
  const res = await fetch(`${BACKEND_URL}/api/v1/demp-mode`, {});
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}
