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
    <Layout>
      <h1 class="text-2xl font-semibold mb-4">Admin Login</h1>
      {props.data.error && <p class="text-red-600 mb-2">{props.data.error}</p>}
      <form method="post" class="space-y-3 max-w-sm">
        <div>
          <label class="block text-sm mb-1">Username</label>
          <input name="username" class="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label class="block text-sm mb-1">Password</label>
          <input name="password" type="password" class="border rounded px-3 py-2 w-full" />
        </div>
        <button type="submit" class="bg-black text-white px-4 py-2 rounded">Login</button>
      </form>
    </Layout>
  );
}
