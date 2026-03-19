import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { BACKEND_URL, SESSION_COOKIE, DEFAULT_SESSION_MAX_AGE } from "$lib/backend";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, "/dashboard");
  }

  let demoMode = false;
  try {
    const resp = await fetch(`${BACKEND_URL}/api/v1/demo-mode`);
    if (resp.ok) {
      const body = await resp.json();
      demoMode = body?.demoMode === true || body?.demoMode === "true";
    }
  } catch (e) {}

  return { demoMode };
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");

    if (!username || !password) {
      return fail(400, { error: "Missing credentials", username });
    }

    try {
      const resp = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!resp.ok) {
        let parsedError: any = null;
        try {
          parsedError = await resp.json();
        } catch {
          try {
            const text = await resp.text();
            parsedError = text ? { error: text } : null;
          } catch {
            parsedError = null;
          }
        }
        if (resp.status === 401) {
          return fail(401, { error: "Invalid credentials", username });
        }
        if (resp.status === 429) {
          const retryAfter = parsedError?.retryAfter;
          const minutes = retryAfter ? Math.ceil(retryAfter / 60) : 15;
          return fail(429, {
            error: "Too many login attempts. Please try again in {{minutes}} minute(s).",
            errorParams: { minutes },
            username,
          });
        }
        let message: string | null = null;
        if (parsedError && typeof parsedError === "object") {
          const candidate = parsedError.error ?? parsedError.message;
          if (typeof candidate === "string" && candidate.trim().length > 0) {
            message = candidate.trim();
          }
        } else if (typeof parsedError === "string" && parsedError.trim().length > 0) {
          message = parsedError.trim();
        }
        const msg = message ?? `${resp.status} ${resp.statusText}`;
        return fail(400, { error: msg, username });
      }

      const data = await resp.json() as { token?: string; expiresIn?: number };
      if (!data?.token) {
        return fail(400, { error: "Login response missing token", username });
      }
      
      const maxAge = data.expiresIn || DEFAULT_SESSION_MAX_AGE;
      
      cookies.set(SESSION_COOKIE, data.token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.COOKIE_SECURE !== "false",
        maxAge: maxAge > 0 ? maxAge : undefined
      });

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (/401|403/.test(errorMessage)) {
        return fail(401, { error: "Invalid credentials", username });
      }
      if (/5\d\d/.test(errorMessage)) {
        return fail(500, { error: "Server error. Please try again later.", username });
      }
      return fail(500, { error: "Unable to connect to server. Please check your connection and try again.", username });
    }
    
    throw redirect(303, "/dashboard");
  }
};
