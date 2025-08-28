import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { backendGet, backendPut, getAuthHeaderFromCookie } from "../../../utils/backend.ts";

type Customer = { id: string; name?: string; email?: string; phone?: string; address?: string; taxId?: string };
type Data = { authed: boolean; customer?: Customer; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const { id } = ctx.params as { id: string };
    try {
      const customer = await backendGet(`/api/v1/customers/${id}`, auth) as Customer;
      return ctx.render({ authed: true, customer });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
  async POST(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const { id } = ctx.params as { id: string };
    const form = await req.formData();
    const payload = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
      taxId: String(form.get("taxId") || ""),
    };
    if (!payload.name) return new Response("Name is required", { status: 400 });
    try {
      await backendPut(`/api/v1/customers/${id}`, auth, payload);
      return new Response(null, { status: 303, headers: { Location: `/customers/${id}` } });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }
};

export default function EditCustomerPage(props: PageProps<Data>) {
  const c = props.data.customer;
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Edit Customer</h1>
      {props.data.error && <p class="text-red-600 mb-2">{props.data.error}</p>}
      {c && (
        <form method="post" class="space-y-3 max-w-xl bg-white border p-4 rounded">
          <div>
            <label class="block text-sm mb-1">Name</label>
            <input name="name" value={c.name || ""} class="border rounded px-3 py-2 w-full" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm mb-1">Email</label>
              <input type="email" name="email" value={c.email || ""} class="border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Phone</label>
              <input name="phone" value={c.phone || ""} class="border rounded px-3 py-2 w-full" />
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">Address</label>
            <textarea name="address" class="border rounded px-3 py-2 w-full" rows={3}>{c.address || ""}</textarea>
          </div>
          <div>
            <label class="block text-sm mb-1">Tax ID</label>
            <input name="taxId" value={c.taxId || ""} class="border rounded px-3 py-2 w-full" />
          </div>
          <div class="pt-2">
            <button type="submit" class="bg-black text-white px-4 py-2 rounded">Save</button>
          </div>
        </form>
      )}
    </Layout>
  );
}
