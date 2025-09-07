import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { backendGet, setAuthCookieHeaders, BACKEND_URL } from "../utils/backend.ts";

type Data = { error: string | null; username?: string; demoMode?: boolean };

export const handler: Handlers<Data> = {
  async GET(_req, ctx) {
    // Try to fetch public settings to detect demoMode
    try {
      const resp = await fetch(`${BACKEND_URL}/api/v1/demo-mode`);
      if (resp.ok) {
        const body = await resp.json();
        const demoMode = body?.demoMode === true || body?.demoMode === "true";
        return ctx.render({ error: null, demoMode });
      }
    } catch (_e) {
      // ignore
    }
    return ctx.render({ error: null });
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    if (!username || !password) {
      return ctx.render({ error: "Missing credentials", username });
    }
    const basic = `Basic ${btoa(`${username}:${password}`)}`;
    // Validate credentials by hitting a protected GET
    try {
      await backendGet("/api/v1/invoices", basic);
    } catch (_e) {
      return ctx.render({ error: "Invalid credentials", username });
    }
    const headers = new Headers({
      ...setAuthCookieHeaders(basic),
      Location: "/dashboard",
    });
    return new Response(null, { status: 303, headers });
  },
};

export default function LoginPage(props: PageProps<Data>) {
  const username = props.data.username || "";
  const dm = (props.data as unknown as { demoMode?: boolean | string }).demoMode;
  const demoMode = dm === true || dm === "true";
  return (
    <Layout path={new URL(props.url).pathname} demoMode={demoMode}>
      <div class="min-h-[65vh] flex items-center justify-center">
        <div class="w-full max-w-sm">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h1 class="text-2xl font-semibold text-center mb-2">Sign in</h1>

              {demoMode && (
                <div class="alert alert-info mb-4">
                  <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span class="font-semibold">Demo credentials:</span>
                    <div class="flex gap-3 flex-wrap">
                      <span>username: <code>demo</code></span>
                      <span>password: <code>demo</code></span>
                    </div>
                  </div>
                </div>
              )}

              {props.data.error && (
                <div class="alert alert-error mb-3">
                  <span>{props.data.error}</span>
                </div>
              )}

              <form method="post" class="space-y-3">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Username</span>
                  </label>
                  <input
                    class="input input-bordered w-full"
                    name="username"
                    value={username}
                    placeholder="Username"
                    autocomplete="username"
                    autoFocus
                    required
                  />
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text">Password</span>
                  </label>
                  <input
                    class="input input-bordered w-full"
                    name="password"
                    type="password"
                    placeholder="Password"
                    autocomplete="current-password"
                    required
                  />
                </div>
                <button type="submit" class="btn btn-primary w-full">
                  Login
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
