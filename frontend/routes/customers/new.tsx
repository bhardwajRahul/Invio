import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendPost, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Data = { authed: boolean; error?: string };

export const handler: Handlers<Data> = {
  GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    return ctx.render({ authed: true });
  },
  async POST(req) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const form = await req.formData();
    const name = String(form.get("name") || "");
    const email = String(form.get("email") || "");
    const phone = String(form.get("phone") || "");
    const address = String(form.get("address") || "");
    const taxId = String(form.get("taxId") || "");

    if (!name) return new Response("Name is required", { status: 400 });

    try {
      const created = await backendPost("/api/v1/customers", auth, { name, email, phone, address, taxId }) as { id: string };
      return new Response(null, { status: 303, headers: { Location: `/customers/${created.id}` } });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }
};

export default function NewCustomerPage(props: PageProps<Data>) {
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Create Customer</h1>
      {props.data.error && <p class="text-red-600 mb-2">{props.data.error}</p>}
      <form method="post" class="space-y-3 max-w-xl bg-white border p-4 rounded">
        <div>
          <label class="block text-sm mb-1">Name</label>
          <input name="name" class="border rounded px-3 py-2 w-full" required />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1">Email</label>
            <input type="email" name="email" class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Phone</label>
            <input name="phone" class="border rounded px-3 py-2 w-full" />
          </div>
        </div>
        <div>
          <label class="block text-sm mb-1">Address</label>
          <textarea name="address" class="border rounded px-3 py-2 w-full" rows={3} />
        </div>
        <div>
          <label class="block text-sm mb-1">Tax ID</label>
          <input name="taxId" class="border rounded px-3 py-2 w-full" />
        </div>
        <div class="pt-2">
          <button type="submit" class="bg-black text-white px-4 py-2 rounded">Create Customer</button>
        </div>
      </form>
    </Layout>
  );
}
