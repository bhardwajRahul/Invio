export const BACKEND_URL = Deno.env.get("BACKEND_URL") ||
  "http://localhost:3000";
const AUTH_COOKIE = "invio_auth";

export function getAuthHeaderFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(/;\s*/).map((p) => {
      const i = p.indexOf("=");
      if (i === -1) return [p, ""];
      return [
        decodeURIComponent(p.slice(0, i)),
        decodeURIComponent(p.slice(i + 1)),
      ];
    }),
  );
  const b64 = cookies[AUTH_COOKIE];
  if (!b64) return null;
  return `Basic ${b64}`;
}

export function setAuthCookieHeaders(basic: string): HeadersInit {
  // Expect 'basic' to be 'Basic <base64>' or just base64
  let b64 = basic;
  if (basic.startsWith("Basic ")) {
    b64 = basic.slice("Basic ".length);
  }
  const cookie = `${AUTH_COOKIE}=${
    encodeURIComponent(b64)
  }; HttpOnly; Path=/; SameSite=Lax`;
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

export async function backendPost(
  path: string,
  authHeader: string,
  body: unknown,
) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

export async function backendPut(
  path: string,
  authHeader: string,
  body: unknown,
) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PUT",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

export async function backendPatch(
  path: string,
  authHeader: string,
  body: unknown,
) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

export async function backendDelete(path: string, authHeader: string) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: authHeader },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  // Some DELETEs may return 204 No Content
  const contentType = res.headers.get("content-type") || "";
  if (res.status === 204 || !contentType.includes("application/json")) {
    return undefined;
  }
  return await res.json();
}
