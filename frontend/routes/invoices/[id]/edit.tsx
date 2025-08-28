import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { backendGet, backendPut, getAuthHeaderFromCookie } from "../../../utils/backend.ts";

type Item = { itemCode?: string; description: string; quantity: number; unitPrice: number; notes?: string };
type Invoice = { id: string; customer?: { name?: string }; issue_date?: string; items?: Item[]; currency?: string; notes?: string; status?: 'draft' | 'sent' | 'paid' | 'overdue' };
type Data = { authed: boolean; invoice?: Invoice; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const { id } = ctx.params as { id: string };
    try {
      const invoice = await backendGet(`/api/v1/invoices/${id}`, auth) as Invoice;
      return ctx.render({ authed: true, invoice });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
  async POST(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const { id } = ctx.params as { id: string };
    const form = await req.formData();
  const currency = String(form.get("currency") || "USD");
    const notes = String(form.get("notes") || "");
  const status = String(form.get("status") || "draft") as 'draft' | 'sent' | 'paid' | 'overdue';

    // Collect items from repeated fields item_description[], item_quantity[], item_unitPrice[]
    const descriptions = form.getAll("item_description") as string[];
    const quantities = form.getAll("item_quantity") as string[];
    const unitPrices = form.getAll("item_unitPrice") as string[];
    const itemCodes = form.getAll("item_code") as string[];
    const itemNotes = form.getAll("item_notes") as string[];
    const items: Item[] = [];
    for (let i = 0; i < descriptions.length; i++) {
      const description = String(descriptions[i] || "").trim();
      if (!description) continue;
      items.push({
        itemCode: String(itemCodes[i] || "") || undefined,
        description,
        quantity: Number(quantities[i] || 1),
        unitPrice: Number(unitPrices[i] || 0),
        notes: String(itemNotes[i] || "") || undefined,
      });
    }
    if (items.length === 0) return new Response("At least one item required", { status: 400 });

    try {
      await backendPut(`/api/v1/invoices/${id}`, auth, { currency, status, notes: notes || undefined, items });
      return new Response(null, { status: 303, headers: { Location: `/invoices/${id}` } });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }
};

export default function EditInvoicePage(props: PageProps<Data>) {
  const inv = props.data.invoice;
  const items = inv?.items ?? [{ description: "", quantity: 1, unitPrice: 0 }];
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Edit Invoice</h1>
      {props.data.error && <p class="text-red-600 mb-2">{props.data.error}</p>}
      {inv && (
        <form method="post" class="space-y-4 max-w-3xl bg-white border p-4 rounded">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-sm mb-1">Customer</label>
              <input value={inv.customer?.name || ""} disabled class="border rounded px-3 py-2 w-full bg-gray-50" />
            </div>
            <div>
              <label class="block text-sm mb-1">Currency</label>
              <input name="currency" value={inv.currency || "USD"} class="border rounded px-3 py-2 w-full" />
            </div>
            <div>
              <label class="block text-sm mb-1">Status</label>
              <select name="status" class="border rounded px-3 py-2 w-full" value={inv.status || 'draft'}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm mb-1">Items</label>
            <div class="space-y-3">
              {items.map((it, _idx) => (
                <div class="grid grid-cols-1 sm:grid-cols-8 gap-2 items-end">
                  <input name="item_code" value={it.itemCode || ""} placeholder="Code" class="border rounded px-2 py-2 sm:col-span-1" />
                  <input name="item_description" value={it.description} placeholder="Description" class="border rounded px-2 py-2 sm:col-span-4" />
                  <input type="number" step="1" min="1" name="item_quantity" value={String(it.quantity)} class="border rounded px-2 py-2 sm:col-span-1" />
                  <input type="number" step="0.01" min="0" name="item_unitPrice" value={String(it.unitPrice)} class="border rounded px-2 py-2 sm:col-span-1" />
                  <input name="item_notes" value={it.notes || ""} placeholder="Notes" class="border rounded px-2 py-2 sm:col-span-1" />
                </div>
              ))}
            </div>
            <p class="text-xs text-gray-500 mt-1">(To add/remove rows dynamically, we can enhance later.)</p>
          </div>

          <div>
            <label class="block text-sm mb-1">Notes</label>
            <textarea name="notes" class="border rounded px-3 py-2 w-full" rows={3}>{inv.notes || ""}</textarea>
          </div>

          <div class="pt-2">
            <button type="submit" class="bg-black text-white px-4 py-2 rounded">Save</button>
          </div>
        </form>
      )}
    </Layout>
  );
}
