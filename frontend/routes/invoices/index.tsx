import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Invoice = { id: string; customer?: { name?: string }; issue_date?: string; total?: number; status?: 'draft' | 'sent' | 'paid' | 'overdue'; currency?: string };
type Data = { authed: boolean; invoices?: Invoice[]; error?: string; q?: string; status?: string; totalCount?: number };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    try {
      const url = new URL(req.url);
      const q = (url.searchParams.get("q") || "").trim();
      const status = (url.searchParams.get("status") || "").trim();
      const invoicesAll = await backendGet("/api/v1/invoices", auth) as Invoice[];
      const qLower = q.toLowerCase();
      const statusLower = status.toLowerCase();
      const invoices = invoicesAll.filter((inv) => {
        const st = String(inv.status || "").toLowerCase();
        const okStatus = !statusLower || st === statusLower;
        if (!qLower) return okStatus;
        const id = String(inv.id || "").toLowerCase();
        const cust = String(inv.customer?.name || "").toLowerCase();
        // Optionally include invoice number if present on list payloads
        const num = (inv as unknown as { invoiceNumber?: string }).invoiceNumber?.toLowerCase?.() || "";
        const okText = id.includes(qLower) || cust.includes(qLower) || num.includes(qLower);
        return okStatus && okText;
      });
      return ctx.render({ authed: true, invoices, q, status, totalCount: invoicesAll.length });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
};

export default function Invoices(props: PageProps<Data>) {
  const list = props.data.invoices ?? [];
  const q = props.data.q ?? "";
  const status = props.data.status ?? "";
  const totalCount = props.data.totalCount ?? list.length;
  const fmtDate = (s?: string) => {
    if (!s) return "";
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch { return s || ""; }
  };
  const formatMoney = (inv: Invoice) =>
    typeof inv.total === 'number'
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: inv.currency || 'USD' }).format(inv.total)
      : '';
  const statusBadge = (st?: Invoice["status"]) => {
    const cls = st === 'paid' ? 'badge-success' : st === 'overdue' ? 'badge-error' : st === 'sent' ? 'badge-info' : '';
    return <span class={`badge ${cls}`}>{st || ''}</span>;
  };
  const qsFor = (s: string) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (s) p.set('status', s);
    return `?${p.toString()}`;
  };
  return (
    <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Invoices</h1>
        <a href="/invoices/new" class="btn btn-sm btn-primary"><i data-lucide="plus" class="w-4 h-4"></i>New Invoice</a>
      </div>
  {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <form method="get" class="flex flex-wrap items-end gap-2">
          <label class="form-control w-64 max-w-full">
            <div class="label py-0"><span class="label-text text-xs">Search</span></div>
            <input name="q" value={q} placeholder="Customer, ID or number" class="input input-bordered input-sm" />
          </label>
          {/* preserve current status chosen via tags */}
          <input type="hidden" name="status" value={status} />
          <button type="submit" class="btn btn-sm">Apply</button>
          {(q || status) && (
            <a href="/invoices" class="btn btn-ghost btn-sm">Clear</a>
          )}
        </form>
        <div class="join">
          {[
            { v: '', l: 'All' },
            { v: 'draft', l: 'Draft' },
            { v: 'sent', l: 'Sent' },
            { v: 'paid', l: 'Paid' },
            { v: 'overdue', l: 'Overdue' },
          ].map(({ v, l }) => (
            <a href={qsFor(v)} class={`btn btn-sm join-item ${status === v ? 'btn-active' : 'btn-ghost'}`}>{l}</a>
          ))}
        </div>
      </div>
      <div class="mb-3 text-xs opacity-70">Showing <span class="font-medium">{list.length}</span> of <span class="font-medium">{totalCount}</span> invoices</div>
      <div class="overflow-x-auto rounded-box bg-base-100 border">
        <table class="table table-sm w-full text-sm">
          <thead>
            <tr>
              <th class="w-[22%]">ID</th>
              <th>Customer</th>
              <th class="w-[16%]">Date</th>
              <th class="w-[14%]">Status</th>
              <th class="w-[16%] text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((inv) => (
              <tr class="hover">
                <td class="cell-id"><a class="link" href={`/invoices/${inv.id}`}>{inv.id}</a></td>
                <td class="cell-customer">{inv.customer?.name}</td>
                <td class="cell-date">{fmtDate(inv.issue_date)}</td>
                <td class="cell-status">{statusBadge(inv.status)}</td>
                <td class="cell-total text-right font-medium font-mono tabular-nums">{formatMoney(inv)}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} class="text-center py-10 text-sm opacity-70">
                  {q || status ? (
                    <>
                      No invoices match your filters. {" "}
                      <a href="/invoices" class="link">Clear filters</a>
                    </>
                  ) : (
                    <>
                      No invoices yet. {" "}
                      <a href="/invoices/new" class="link">Create your first invoice</a>.
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
