import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { InvoiceEditor } from "../../../components/InvoiceEditor.tsx";
import { backendGet, backendPut, getAuthHeaderFromCookie } from "../../../utils/backend.ts";

type Item = { description: string; quantity: number; unitPrice: number; notes?: string };
type Invoice = { id: string; customer?: { name?: string }; issue_date?: string; items?: Item[]; currency?: string; notes?: string; paymentTerms?: string; status?: 'draft' | 'sent' | 'paid' | 'overdue' };
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
  const paymentTerms = String(form.get("paymentTerms") || "");
  const status = String(form.get("status") || "draft") as 'draft' | 'sent' | 'paid' | 'overdue';

    // Collect items from repeated fields item_description[], item_quantity[], item_unitPrice[]
    const descriptions = form.getAll("item_description") as string[];
    const quantities = form.getAll("item_quantity") as string[];
    const unitPrices = form.getAll("item_unitPrice") as string[];
    const itemNotes = form.getAll("item_notes") as string[];
    const items: Item[] = [];
    for (let i = 0; i < descriptions.length; i++) {
      const description = String(descriptions[i] || "").trim();
      if (!description) continue;
  items.push({
        description,
        quantity: Number(quantities[i] || 1),
        unitPrice: Number(unitPrices[i] || 0),
        notes: String(itemNotes[i] || "") || undefined,
      });
    }
    if (items.length === 0) return new Response("At least one item required", { status: 400 });

    try {
  // Send notes as-is, including empty string, so existing notes get cleared when user deletes them
  await backendPut(`/api/v1/invoices/${id}`, auth, { currency, status, notes, paymentTerms, items });
      return new Response(null, { status: 303, headers: { Location: `/invoices/${id}` } });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }
};

export default function EditInvoicePage(props: PageProps<Data>) {
  const inv = props.data.invoice;
  return (
  <Layout authed={props.data.authed} path={new URL(props.url).pathname} wide>
      {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      {inv && (
        <form method="post" class="space-y-4">
          <div class="flex items-center justify-between gap-2">
            <h1 class="text-2xl font-semibold">Edit Invoice</h1>
            <div class="flex items-center gap-2">
              <a href={`/invoices/${inv.id}`} class="btn btn-ghost btn-sm">Cancel</a>
              <button type="submit" class="btn btn-primary">
                <i data-lucide="save" class="w-4 h-4"></i>
                Save
              </button>
            </div>
          </div>

          <InvoiceEditor
            mode="edit"
            customerName={inv.customer?.name}
            currency={inv.currency}
            status={inv.status}
            notes={inv.notes}
            paymentTerms={inv.paymentTerms}
            items={inv.items || [{ description: "", quantity: 1, unitPrice: 0 }]}
          />
        </form>
      )}
    </Layout>
  );
}
