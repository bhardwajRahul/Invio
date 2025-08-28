export const BACKEND_URL = Deno.env.get("BACKEND_URL") || "http://localhost:3000";
const AUTH_COOKIE = "invio_auth";

export function getAuthHeaderFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(/;\s*/).map((p) => {
      const i = p.indexOf("=");
      if (i === -1) return [p, ""]; 
      return [decodeURIComponent(p.slice(0, i)), decodeURIComponent(p.slice(i + 1))];
    }),
  );
  const b64 = cookies[AUTH_COOKIE];
  if (!b64) return null;
  try {
    const decoded = atob(b64);
    if (!decoded.startsWith("Basic ")) return `Basic ${b64}`; // fallback
    return decoded;
  } catch {
    return `Basic ${b64}`;
  }
}

export function setAuthCookieHeaders(basic: string): HeadersInit {
  const b64 = btoa(basic.startsWith("Basic ") ? basic.slice("Basic ".length) : basic.replace(/^Basic\s+/, ""));
  const cookie = `${AUTH_COOKIE}=${encodeURIComponent(b64)}; HttpOnly; Path=/; SameSite=Lax`;
  return { "Set-Cookie": cookie };
}

export function clearAuthCookieHeaders(): HeadersInit {
  const cookie = `${AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
  return { "Set-Cookie": cookie };
}

export async function backendGet(path: string, authHeader: string) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: authHeader },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}
