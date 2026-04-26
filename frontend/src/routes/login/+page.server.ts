import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
  BACKEND_URL,
  SESSION_COOKIE,
  DEFAULT_SESSION_MAX_AGE,
} from "$lib/backend";

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
  login: async ({ request, cookies }) => {
    const form = await request.formData();

    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "").trim();

    if (!username || !password) {
      return fail(400, {
        error: "Missing credentials",
        username,
      });
    }

    let resp: Response;

    try {
      resp = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      return fail(500, {
        error: "Unable to reach authentication server",
        username,
      });
    }

    let data: any = null;

    try {
      data = await resp.json();
    } catch {
      return fail(500, {
        error: "Invalid server response",
        username,
      });
    }

    if (!resp.ok) {
      if (resp.status === 401) {
        return fail(401, { error: "Invalid credentials", username });
      }

      if (resp.status === 429) {
        const retryAfter = data?.retryAfter;
        const minutes = retryAfter ? Math.ceil(retryAfter / 60) : 15;

        return fail(429, {
          error: "Too many login attempts. Try again in {{minutes}} minute(s).",
          errorParams: { minutes },
          username,
        });
      }

      return fail(resp.status, {
        error: data?.error ?? "Login failed",
        username,
      });
    }

    if (!data?.token) {
      return fail(500, {
        error: "Login response missing token",
        username,
      });
    }

    cookies.set(SESSION_COOKIE, data.token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: data.expiresIn ?? DEFAULT_SESSION_MAX_AGE,
    });

    throw redirect(303, "/dashboard");
  },
};
