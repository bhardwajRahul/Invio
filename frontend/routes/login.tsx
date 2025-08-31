import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { setAuthCookieHeaders, backendGet } from "../utils/backend.ts";

export const handler: Handlers = {
  GET(_req, ctx) {
    return ctx.render({ error: null });
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const username = String(form.get("username") || "");
    const password = String(form.get("password") || "");
    if (!username || !password) {
      return ctx.render({ error: "Missing credentials" });
    }
    const basic = `Basic ${btoa(`${username}:${password}`)}`;
    // Validate credentials by hitting a protected GET
    try {
      await backendGet("/api/v1/invoices", basic);
    } catch (_e) {
      return ctx.render({ error: "Invalid credentials" });
    }
    const headers = new Headers({ ...setAuthCookieHeaders(basic), Location: "/dashboard" });
    return new Response(null, { status: 303, headers });
  },
};

export default function LoginPage(props: PageProps<{ error: string | null }>) {
  return (
  <Layout path={new URL(props.url).pathname}>
      <h1 class="text-2xl font-semibold mb-4">Admin Login</h1>
      {props.data.error && (
        <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>
      )}
      <form method="post" class="space-y-3 max-w-sm">
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Username</span></div>
          <input name="username" class="input input-bordered w-full" />
        </label>
        <label class="form-control w-full">
          <div class="label"><span class="label-text">Password</span></div>
          <input name="password" type="password" class="input input-bordered w-full" />
        </label>
        <button type="submit" class="btn btn-primary">Login</button>
      </form>
    </Layout>
  );
}
