import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Invoice = { id: string; customer?: { name?: string }; issue_date?: string; total?: number; status?: 'draft' | 'sent' | 'paid' | 'overdue'; currency?: string };
type Data = { authed: boolean; invoices?: Invoice[]; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    try {
  const invoices = await backendGet("/api/v1/invoices", auth) as Invoice[];
      return ctx.render({ authed: true, invoices });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
};

export default function Invoices(props: PageProps<Data>) {
  const list = props.data.invoices ?? [];
  const formatMoney = (inv: Invoice) =>
    typeof inv.total === 'number'
      ? new Intl.NumberFormat(undefined, { style: 'currency', currency: inv.currency || 'USD' }).format(inv.total)
      : '';
  return (
    <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Invoices</h1>
        <a href="/invoices/new" class="btn btn-sm btn-primary"><i data-lucide="plus" class="w-4 h-4"></i>New Invoice</a>
      </div>
  {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      <div class="mb-3 flex gap-2 items-end">
        <div class="form-control">
          <div class="label"><span class="label-text">Search</span></div>
          <input id="search" placeholder="Customer or ID" class="input input-bordered" />
        </div>
        <div class="form-control">
          <div class="label"><span class="label-text">Status</span></div>
          <select id="status-filter" class="select select-bordered">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>
      <div class="overflow-x-auto rounded-box bg-base-100 border">
        <table class="table table-zebra w-full text-sm">
          <thead>
            <tr class="text-sm">
              <th>ID</th>
              <th>Customer</th>
              <th>Issue Date</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((inv) => (
              <tr class="hover invoice-row">
                <td class="cell-id"><a class="link" href={`/invoices/${inv.id}`}>{inv.id}</a></td>
                <td class="cell-customer">{inv.customer?.name}</td>
                <td class="cell-date">{inv.issue_date}</td>
                <td class="cell-status">{inv.status}</td>
                <td class="cell-total">{formatMoney(inv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <script>{`(function(){
        function onReady(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { fn(); } }
        onReady(function(){
          var q = document.getElementById('search');
          var s = document.getElementById('status-filter');
          var rows = Array.prototype.slice.call(document.querySelectorAll('.invoice-row'));
          function apply(){
            var text = (q && q.value || '').toLowerCase();
            var status = (s && s.value) || '';
            rows.forEach(function(r){
              var id = (r.querySelector('.cell-id')?.textContent || '').toLowerCase();
              var cust = (r.querySelector('.cell-customer')?.textContent || '').toLowerCase();
              var st = (r.querySelector('.cell-status')?.textContent || '').toLowerCase();
              var okText = !text || id.includes(text) || cust.includes(text);
              var okStatus = !status || st === status;
              r.style.display = (okText && okStatus) ? '' : 'none';
            });
          }
          if(q) q.addEventListener('input', apply);
          if(s) s.addEventListener('change', apply);
          // Run once on load to normalize any pre-filled values
          apply();
        });
      })();`}</script>
    </Layout>
  );
}
