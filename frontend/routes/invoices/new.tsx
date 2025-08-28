import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, backendPost, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Customer = { id: string; name: string };
type Data = { authed: boolean; customers?: Customer[]; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    try {
      const customers = await backendGet("/api/v1/customers", auth) as Customer[];
      return ctx.render({ authed: true, customers });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
  async POST(req) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const form = await req.formData();
    const customerId = String(form.get("customerId") || "");
    const description = String(form.get("description") || "");
    const quantity = Number(form.get("quantity") || 1);
    const unitPrice = Number(form.get("unitPrice") || 0);
    const currency = String(form.get("currency") || "USD");
    const issueDate = String(form.get("issueDate") || new Date().toISOString().slice(0,10));
    const dueDate = String(form.get("dueDate") || "");
    const notes = String(form.get("notes") || "");

    if (!customerId || !description || isNaN(quantity) || isNaN(unitPrice)) {
      return new Response("Missing fields", { status: 400 });
    }

    const payload = {
      customerId,
      currency,
      issueDate,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      items: [
        { description, quantity, unitPrice }
      ]
    };

    try {
      const created = await backendPost("/api/v1/invoices", auth, payload) as { id: string };
      return new Response(null, { status: 303, headers: { Location: `/invoices/${created.id}` } });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }
};

export default function NewInvoicePage(props: PageProps<Data>) {
  const customers = props.data.customers ?? [];
  const today = new Date().toISOString().slice(0,10);
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Create Invoice</h1>
      {props.data.error && <p class="text-red-600 mb-2">{props.data.error}</p>}
      <form method="post" class="space-y-3 max-w-xl bg-white border p-4 rounded">
        <div>
          <label class="block text-sm mb-1">Customer</label>
          <select name="customerId" class="border rounded px-3 py-2 w-full" required>
            <option value="">Select customer</option>
            {customers.map(c => (
              <option value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1">Issue Date</label>
            <input type="date" name="issueDate" value={today} class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Due Date</label>
            <input type="date" name="dueDate" class="border rounded px-3 py-2 w-full" />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm mb-1">Currency</label>
            <input name="currency" value="USD" class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Quantity</label>
            <input type="number" step="1" min="1" name="quantity" value="1" class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Unit Price</label>
            <input type="number" step="0.01" min="0" name="unitPrice" value="0" class="border rounded px-3 py-2 w-full" />
          </div>
        </div>
        <div>
          <label class="block text-sm mb-1">Item Description</label>
          <input name="description" class="border rounded px-3 py-2 w-full" placeholder="e.g. Design services" required />
        </div>
        <div>
          <label class="block text-sm mb-1">Notes</label>
          <textarea name="notes" class="border rounded px-3 py-2 w-full" rows={3} />
        </div>
        <div class="pt-2">
          <button type="submit" class="bg-black text-white px-4 py-2 rounded">Create Invoice</button>
        </div>
      </form>
    </Layout>
  );
}
