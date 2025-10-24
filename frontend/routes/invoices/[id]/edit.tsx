import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { InvoiceEditor } from "../../../components/InvoiceEditor.tsx";
import { LuSave } from "../../../components/icons.tsx";
import {
  backendGet,
  backendPut,
  getAuthHeaderFromCookie,
} from "../../../utils/backend.ts";

type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  taxes?: Array<{ percent: number }>;
};
type Invoice = {
  id: string;
  invoiceNumber?: string;
  customer?: { name?: string };
  issue_date?: string;
  due_date?: string;
  items?: Item[];
  currency?: string;
  taxRate?: number;
  pricesIncludeTax?: boolean;
  roundingMode?: string;
  notes?: string;
  paymentTerms?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  taxes?: Array<{ percent: number; taxableAmount: number; taxAmount: number }>;
};
type Data = { authed: boolean; invoice?: Invoice; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    const { id } = ctx.params as { id: string };
    try {
      const invoice = await backendGet(
        `/api/v1/invoices/${id}`,
        auth,
      ) as Invoice;
      // Disallow editing once invoice is issued or expired (overdue)
      if (invoice.status && invoice.status !== "draft") {
        return new Response(null, {
          status: 303,
          headers: { Location: `/invoices/${id}` },
        });
      }
      return ctx.render({ authed: true, invoice });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
  async POST(req, ctx) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    const { id } = ctx.params as { id: string };
    const form = await req.formData();
    const currency = String(form.get("currency") || "USD");
    const issueDate = String(form.get("issueDate") || "");
    const dueDate = String(form.get("dueDate") || "");
    const notes = String(form.get("notes") || "");
    const paymentTerms = String(form.get("paymentTerms") || "");
    const status = String(form.get("status") || "draft") as
      | "draft"
      | "sent"
      | "paid"
      | "overdue";
  const taxRate = Number(form.get("taxRate") || 0) || 0;
    const pricesIncludeTax = String(form.get("pricesIncludeTax") || 'false') === 'true';
    const roundingMode = String(form.get("roundingMode") || "line");
  const taxMode = String(form.get("taxMode") || 'invoice') as 'invoice' | 'line';

    // Collect items from repeated fields item_description[], item_quantity[], item_unitPrice[]
    const descriptions = form.getAll("item_description") as string[];
    const quantities = form.getAll("item_quantity") as string[];
    const unitPrices = form.getAll("item_unitPrice") as string[];
    const itemNotes = form.getAll("item_notes") as string[];
    const itemTaxPercents = form.getAll("item_tax_percent") as string[];
    const items: Item[] = [];
    for (let i = 0; i < descriptions.length; i++) {
      const description = String(descriptions[i] || "").trim();
      if (!description) continue;
      const taxPercentRaw = String(itemTaxPercents[i] || "").trim();
      let taxes: Array<{ percent: number }> | undefined = undefined;
      if (taxMode === 'line' && taxPercentRaw !== "") {
        const n = Number(taxPercentRaw);
        if (!isNaN(n) && isFinite(n) && n >= 0) {
          taxes = [{ percent: n }];
        }
      }
      items.push({
        description,
        quantity: Number(quantities[i] || 1),
        unitPrice: Number(unitPrices[i] || 0),
        notes: String(itemNotes[i] || "") || undefined,
        ...(taxes ? { taxes } : {}),
      });
    }
    if (items.length === 0) {
      return new Response("At least one item required", { status: 400 });
    }

    try {
      // Send notes as-is, including empty string, so existing notes get cleared when user deletes them
      const invoiceNumber = String(form.get("invoiceNumber") || "").trim();
      // Adjust items based on tax mode
      if (taxMode === 'invoice') {
        items.forEach((it) => { delete (it as Record<string, unknown>).taxes; });
      }
      await backendPut(`/api/v1/invoices/${id}`, auth, {
        currency,
        status,
        notes,
        paymentTerms,
        taxRate: taxMode === 'invoice' ? taxRate : 0,
        pricesIncludeTax,
        roundingMode,
        invoiceNumber: invoiceNumber || undefined,
        issueDate: issueDate || undefined,
        dueDate: dueDate || null,
        items,
        taxMode, // informational only for now
      });
      return new Response(null, {
        status: 303,
        headers: { Location: `/invoices/${id}` },
      });
    } catch (e) {
      const msg = String(e);
      if (/409|already exists|duplicate/i.test(msg)) {
        const invoice = await backendGet(`/api/v1/invoices/${id}`, auth) as Invoice;
        return ctx.render({ authed: true, invoice, error: "Invoice number already exists" });
      }
      return new Response(String(e), { status: 500 });
    }
  },
};

export default function EditInvoicePage(props: PageProps<Data>) {
  const demoMode = ((props.data as unknown) as { settings?: Record<string, unknown> }).settings?.demoMode === "true";
  const inv = props.data.invoice;
  return (
    <Layout authed={props.data.authed} demoMode={demoMode} path={new URL(props.url).pathname} wide>
      {props.data.error && (
        <div class="alert alert-error mb-3">
          <span>{props.data.error}</span>
        </div>
      )}
      {inv && (
    <form method="post" class="space-y-4" data-writable>
          <div class="flex items-center justify-between gap-2">
            <h1 class="text-2xl font-semibold">Edit Invoice</h1>
            <div class="flex items-center gap-2">
              <a href={`/invoices/${inv.id}`} class="btn btn-ghost btn-sm">
                Cancel
              </a>
      <button type="submit" class="btn btn-primary" data-writable disabled={demoMode}>
                <LuSave size={16} />
                Save
              </button>
            </div>
          </div>

          <InvoiceEditor
            mode="edit"
            customerName={inv.customer?.name}
            currency={inv.currency}
            status={inv.status}
            invoiceNumber={inv.invoiceNumber}
            taxRate={inv.taxRate as number}
            pricesIncludeTax={inv.pricesIncludeTax as boolean}
            roundingMode={inv.roundingMode as string}
            taxMode={(inv.items && inv.items.some(i => i.taxes && i.taxes.length)) ? 'line' : 'invoice'}
            showDates
            issueDate={(inv.issue_date as string) || ""}
            dueDate={(inv.due_date as string) || ""}
            notes={inv.notes}
            paymentTerms={inv.paymentTerms}
            items={(inv.items ||
              [{ description: "", quantity: 1, unitPrice: 0 }]).map((it) => {
                // If item has single tax entry, surface its percent for UI
                const single = it.taxes && it.taxes.length === 1
                  ? it.taxes[0].percent
                  : undefined;
                return { ...it, taxPercent: single } as Item & { taxPercent?: number };
              })}
            demoMode={demoMode}
            invoiceNumberError={props.data.error}
          />
        </form>
      )}
    </Layout>
  );
}
