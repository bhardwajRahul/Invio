import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { InvoiceEditor } from "../../components/InvoiceEditor.tsx";
import {
  backendGet,
  backendPost,
  getAuthHeaderFromCookie,
} from "../../utils/backend.ts";

type Customer = { id: string; name: string };
type Data = {
  authed: boolean;
  customers?: Customer[];
  currency?: string;
  paymentTerms?: string;
  defaultNotes?: string;
  defaultTaxRate?: number;
  defaultPricesIncludeTax?: boolean;
  defaultRoundingMode?: string;
  error?: string;
  invoiceNumberError?: string;
  invoiceNumberPrefill?: string;
};

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
    try {
      // Load customers and settings in parallel to get default currency
      const [customers, settings] = await Promise.all([
        backendGet("/api/v1/customers", auth) as Promise<Customer[]>,
        backendGet("/api/v1/settings", auth) as Promise<Record<string, string>>,
      ]);
      const currency = (settings && settings.currency)
        ? settings.currency
        : "USD";
      const paymentTerms = settings?.paymentTerms || "Due in 30 days";
      const defaultNotes = settings?.defaultNotes || "";
      const defaultTaxRate = Number(settings?.defaultTaxRate || 0) || 0;
      const defaultPricesIncludeTax = String(settings?.defaultPricesIncludeTax || 'false').toLowerCase() === 'true';
      const defaultRoundingMode = settings?.defaultRoundingMode || 'line';
      // Fetch next invoice number (if numbering pattern configured) to prefill
      let invoiceNumberPrefill: string | undefined = undefined;
      try {
        // Only prefill when advanced numbering pattern is configured and enabled
        const numberingEnabled = String(settings?.invoiceNumberingEnabled ?? 'true').toLowerCase() !== 'false';
        if (numberingEnabled && settings?.invoiceNumberPattern) {
          const nextResp = await backendGet('/api/v1/invoices/next-number', auth) as { next?: string };
          if (nextResp && nextResp.next) invoiceNumberPrefill = nextResp.next;
        }
      } catch(_e) { /* ignore prefill failure */ }
      return ctx.render({
        authed: true,
        customers,
        currency,
        paymentTerms,
        defaultNotes,
        defaultTaxRate,
        defaultPricesIncludeTax,
        defaultRoundingMode,
        invoiceNumberPrefill,
      });
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
    const form = await req.formData();
    const customerId = String(form.get("customerId") || "");
    let currency = String(form.get("currency") || "");
    const status = String(form.get("status") || "draft") as
      | "draft"
      | "sent"
      | "paid"
      | "overdue";
    const issueDate = String(
      form.get("issueDate") || new Date().toISOString().slice(0, 10),
    );
    const dueDate = String(form.get("dueDate") || "");
    const notes = String(form.get("notes") || "");
    const paymentTerms = String(form.get("paymentTerms") || "");
  const taxRate = Number(form.get("taxRate") || 0) || 0;
  const pricesIncludeTax = String(form.get("pricesIncludeTax") || 'false') === 'true';
  const roundingMode = String(form.get("roundingMode") || "line");
  const taxMode = String(form.get("taxMode") || 'invoice') as 'invoice' | 'line';

    // Repeated items
    const descriptions = form.getAll("item_description") as string[];
    const quantities = form.getAll("item_quantity") as string[];
    const unitPrices = form.getAll("item_unitPrice") as string[];
  const itemNotes = form.getAll("item_notes") as string[];
  const itemTaxPercents = form.getAll("item_tax_percent") as string[];
    const items = [] as Array<
      {
        description: string;
        quantity: number;
        unitPrice: number;
        notes?: string;
        taxes?: Array<{ percent: number }>;
      }
    >;
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
    if (!customerId || items.length === 0) {
      return new Response("Missing required fields", { status: 400 });
    }

    // If currency wasn't provided, fall back to configured default
    if (!currency) {
      try {
        const settings = await backendGet("/api/v1/settings", auth) as Record<
          string,
          string
        >;
        currency = settings.currency || "USD";
      } catch {
        currency = "USD";
      }
    }

    const invoiceNumber = String(form.get("invoiceNumber") || "").trim();
    const payload: Record<string, unknown> = {
      customerId,
      currency,
      status,
      invoiceNumber: invoiceNumber || undefined,
      issueDate,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      paymentTerms: paymentTerms || undefined,
      taxRate: taxMode === 'invoice' ? taxRate : 0,
      pricesIncludeTax,
      roundingMode,
      items,
    };
    if (taxMode === 'invoice') {
      const arr = payload.items as Array<Record<string, unknown>>;
      arr.forEach((i) => { if (i.taxes) delete i.taxes; });
    }
    payload.taxMode = taxMode; // not required by backend but useful for future extension

    try {
      const created = await backendPost("/api/v1/invoices", auth, payload) as { id: string };
      return new Response(null, { status: 303, headers: { Location: `/invoices/${created.id}` } });
    } catch (e) {
      const msg = String(e);
      if (/already exists|duplicate/i.test(msg)) {
        const [customers, settings] = await Promise.all([
          backendGet("/api/v1/customers", auth) as Promise<Customer[]>,
          backendGet("/api/v1/settings", auth) as Promise<Record<string, string>>,
        ]);
        const sCurrency = settings?.currency || currency || "USD";
        const sPaymentTerms = settings?.paymentTerms || paymentTerms || "Due in 30 days";
        const sDefaultNotes = settings?.defaultNotes || "";
        const sDefaultTaxRate = Number(settings?.defaultTaxRate || 0) || 0;
        const sDefaultPricesIncludeTax = String(settings?.defaultPricesIncludeTax || 'false').toLowerCase() === 'true';
        const sDefaultRoundingMode = settings?.defaultRoundingMode || 'line';
        return ctx.render({
          authed: true,
          customers,
          currency: sCurrency,
          paymentTerms: sPaymentTerms,
          defaultNotes: sDefaultNotes,
          defaultTaxRate: sDefaultTaxRate,
          defaultPricesIncludeTax: sDefaultPricesIncludeTax,
          defaultRoundingMode: sDefaultRoundingMode,
          invoiceNumberError: "Invoice number already exists",
        });
      }
      return new Response(String(e), { status: 500 });
    }
  },
};

export default function NewInvoicePage(props: PageProps<Data>) {
  const customers = props.data.customers ?? [];
  const demoMode = ((props.data as unknown) as { settings?: Record<string, unknown> }).settings?.demoMode === "true";
  const currency = props.data.currency || "USD";
  const paymentTerms = props.data.paymentTerms || "Due in 30 days";
  const defaultNotes = props.data.defaultNotes || "";
  const defaultTaxRate = props.data.defaultTaxRate ?? 0;
  const defaultPricesIncludeTax = props.data.defaultPricesIncludeTax ?? false;
  const defaultRoundingMode = props.data.defaultRoundingMode || 'line';
  return (
    <Layout authed={props.data.authed} demoMode={demoMode} path={new URL(props.url).pathname}>
      <h1 class="text-2xl font-semibold mb-4">Create Invoice</h1>
      {(props.data.error || props.data.invoiceNumberError) && (
        <div class="alert alert-error mb-3">
          <span>{props.data.invoiceNumberError || props.data.error}</span>
        </div>
      )}
      <form
        method="post"
        class="space-y-4 w-full bg-base-100 border p-4 rounded-box"
        data-writable
      >
        <InvoiceEditor
          mode="create"
          customers={customers}
          currency={currency}
          status="draft"
          invoiceNumberPrefill={props.data.invoiceNumberPrefill}
          paymentTerms={paymentTerms}
          notes={defaultNotes}
          demoMode={demoMode}
          items={[{ description: "", quantity: 1, unitPrice: 0 }]}
          showDates
          taxRate={defaultTaxRate}
          pricesIncludeTax={defaultPricesIncludeTax}
          roundingMode={defaultRoundingMode}
          taxMode="invoice"
          invoiceNumberError={props.data.invoiceNumberError}
        />
        <div class="pt-2">
          <button type="submit" class="btn btn-primary" data-writable>Create Invoice</button>
        </div>
      </form>
    </Layout>
  );
}
