import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { backendGet, setAuthCookieHeaders } from "../utils/backend.ts";

type Data = { error: string | null; username?: string };

export const handler: Handlers<Data> = {
  GET(_req, ctx) {
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
  // Detect demoMode from window or document (set by Layout)
  const isDemo = typeof window !== "undefined" && (document.body.dataset.demo === "true" || document.documentElement.dataset.demo === "true");
  return (
    <Layout path={new URL(props.url).pathname}>
      <div class="min-h-[65vh] flex items-center justify-center">
        <div class="w-full max-w-sm">
          <div class="card bg-base-100 shadow-xl">
            <div class="card-body">
              <h1 class="text-2xl font-semibold text-center mb-2">Sign in</h1>

              {props.data.error && (
                <div class="alert alert-error mb-3">
                  <span>{props.data.error}</span>
                </div>
              )}

              <form method="post" class="space-y-3" id="demo-login-form">
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
              {/* Auto-login script for demo mode */}
              <script>
                {`(function(){
                  var demo = false;
                  try {
                    demo = document.body.dataset.demo === 'true' || document.documentElement.dataset.demo === 'true';
                  } catch {}
                  if(demo){
                    var f = document.getElementById('demo-login-form');
                    if(f){
                      var u = f.querySelector('input[name="username"]');
                      var p = f.querySelector('input[name="password"]');
                      if(u && p){
                        u.value = 'demo';
                        p.value = 'demo';
                        setTimeout(function(){ f.submit(); }, 300);
                      }
                    }
                  }
                })();`}
              </script>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
