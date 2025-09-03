import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { InvoiceEditor } from "../../components/InvoiceEditor.tsx";
import { backendGet, backendPost, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Customer = { id: string; name: string };
type Data = { authed: boolean; customers?: Customer[]; currency?: string; paymentTerms?: string; defaultNotes?: string; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    try {
      // Load customers and settings in parallel to get default currency
  const [customers, settings] = await Promise.all([
        backendGet("/api/v1/customers", auth) as Promise<Customer[]>,
        backendGet("/api/v1/settings", auth) as Promise<Record<string, string>>,
      ]);
  const currency = (settings && settings.currency) ? settings.currency : "USD";
  const paymentTerms = settings?.paymentTerms || "Due in 30 days";
  const defaultNotes = settings?.defaultNotes || "";
  return ctx.render({ authed: true, customers, currency, paymentTerms, defaultNotes });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
  async POST(req) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const form = await req.formData();
    const customerId = String(form.get("customerId") || "");
    let currency = String(form.get("currency") || "");
    const status = String(form.get("status") || "draft") as 'draft' | 'sent' | 'paid' | 'overdue';
    const issueDate = String(form.get("issueDate") || new Date().toISOString().slice(0,10));
    const dueDate = String(form.get("dueDate") || "");
  const notes = String(form.get("notes") || "");
  const paymentTerms = String(form.get("paymentTerms") || "");

    // Repeated items
    const descriptions = form.getAll("item_description") as string[];
    const quantities = form.getAll("item_quantity") as string[];
    const unitPrices = form.getAll("item_unitPrice") as string[];
    const itemNotes = form.getAll("item_notes") as string[];
  const items = [] as Array<{ description: string; quantity: number; unitPrice: number; notes?: string }>;
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
    if (!customerId || items.length === 0) return new Response("Missing required fields", { status: 400 });

    // If currency wasn't provided, fall back to configured default
    if (!currency) {
      try {
        const settings = await backendGet("/api/v1/settings", auth) as Record<string, string>;
        currency = settings.currency || "USD";
      } catch {
        currency = "USD";
      }
    }

    const payload = {
      customerId,
      currency,
      status,
      issueDate,
      dueDate: dueDate || undefined,
  notes: notes || undefined,
  paymentTerms: paymentTerms || undefined,
      items,
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
  const currency = props.data.currency || "USD";
  const paymentTerms = props.data.paymentTerms || "Due in 30 days";
  const defaultNotes = props.data.defaultNotes || "";
  return (
    <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      <h1 class="text-2xl font-semibold mb-4">Create Invoice</h1>
  {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
  <form method="post" class="space-y-4 w-full bg-base-100 border p-4 rounded-box">
        <InvoiceEditor
          mode="create"
          customers={customers}
          currency={currency}
          status="draft"
          paymentTerms={paymentTerms}
          notes={defaultNotes}
          items={[{ description: "", quantity: 1, unitPrice: 0 }]}
          showDates
        />
  <div class="pt-2"><button type="submit" class="btn btn-primary">Create Invoice</button></div>
      </form>
    </Layout>
  );
}
