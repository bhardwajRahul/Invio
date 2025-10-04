import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import {
  backendDelete,
  backendGet,
  backendPost,
  backendPut,
  getAuthHeaderFromCookie,
} from "../../utils/backend.ts";

type Invoice = {
  id: string;
  invoiceNumber?: string;
  customer?: { name?: string; email?: string; address?: string };
  items?: { description: string }[];
  currency?: string;
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  total?: number;
  issueDate?: string | Date;
  dueDate?: string | Date;
  paymentTerms?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  shareToken?: string;
  taxRate?: number;
  pricesIncludeTax?: boolean;
  roundingMode?: string;
  taxes?: Array<{ percent: number; taxableAmount: number; taxAmount: number }>;
};
type Data = {
  authed: boolean;
  invoice?: Invoice;
  error?: string;
  showPublishedBanner?: boolean;
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
    const { id } = ctx.params as { id: string };
    try {
      const invoice = await backendGet(
        `/api/v1/invoices/${id}`,
        auth,
      ) as Invoice;
      const url = new URL(req.url);
      const showPublishedBanner = url.searchParams.get("published") === "1";
      return ctx.render({ authed: true, invoice, showPublishedBanner });
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
    const intent = String(form.get("intent") || "");
    if (intent === "delete") {
      try {
        await backendDelete(`/api/v1/invoices/${id}`, auth);
        return new Response(null, {
          status: 303,
          headers: { Location: "/invoices" },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    if (intent === "publish") {
      try {
        await backendPost(`/api/v1/invoices/${id}/publish`, auth, {});
        return new Response(null, {
          status: 303,
          headers: { Location: `/invoices/${id}?published=1` },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    if (intent === "mark-sent") {
      try {
        await backendPut(`/api/v1/invoices/${id}`, auth, { status: "sent" });
        return new Response(null, {
          status: 303,
          headers: { Location: `/invoices/${id}` },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    if (intent === "mark-paid") {
      try {
        await backendPut(`/api/v1/invoices/${id}`, auth, { status: "paid" });
        return new Response(null, {
          status: 303,
          headers: { Location: `/invoices/${id}` },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    if (intent === "duplicate") {
      try {
        const copy = await backendPost(
          `/api/v1/invoices/${id}/duplicate`,
          auth,
          {},
        );
        const newId = (copy && copy.id) ? String(copy.id) : null;
        if (!newId) throw new Error("Failed to duplicate invoice");
        return new Response(null, {
          status: 303,
          headers: { Location: `/invoices/${newId}/edit` },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    if (intent === "unpublish") {
      try {
        await backendPost(`/api/v1/invoices/${id}/unpublish`, auth, {});
        return new Response(null, {
          status: 303,
          headers: { Location: `/invoices/${id}` },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    return new Response("Unsupported action", { status: 400 });
  },
};

export default function InvoiceDetail(props: PageProps<Data>) {
  const inv = props.data.invoice;
  const currency = (inv?.currency as string) || "USD";
  const fmtMoney = (v?: number) =>
    typeof v === "number"
      ? new Intl.NumberFormat(undefined, { style: "currency", currency })
        .format(v)
      : "";
  const fmtDate = (d?: string | Date) => {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString();
  };
  const isOverdue = (() => {
    if (!inv) return false;
    if (inv.status === "paid") return false;
    const due = inv.dueDate ? new Date(inv.dueDate as string) : null;
    if (!due) return false;
    const today = new Date();
    // normalize to dates
    const dd = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dd < td;
  })();
  return (
    <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      {props.data.showPublishedBanner && props.data.invoice?.shareToken && (
        <div class="alert alert-success mb-4 shadow">
          <i data-lucide="check-circle-2" class="w-5 h-5"></i>
          <div class="flex-1">
            <div class="font-medium">Invoice published</div>
            <div class="text-sm opacity-80 break-all">
              Public link:{" "}
              <a
                id="public-link-url"
                class="link"
                href={`/public/invoices/${props.data.invoice.shareToken}`}
                target="_blank"
              >
                {new URL(`${props.url}`).origin}/public/invoices/{props.data
                  .invoice.shareToken}
              </a>
            </div>
          </div>
          <div class="flex gap-2">
            <a
              class="btn btn-xs btn-ghost"
              target="_blank"
              href={`/public/invoices/${props.data.invoice.shareToken}`}
            >
              Open
            </a>
            <button id="copy-public-link" type="button" class="btn btn-xs">
              Copy link
            </button>
            <a
              class="btn btn-xs btn-primary"
              href={`/public/invoices/${props.data.invoice.shareToken}/pdf`}
              target="_blank"
            >
              Download PDF
            </a>
          </div>
        </div>
      )}
      <div class="flex items-center justify-between mb-4 gap-2">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-semibold">
            Invoice {inv?.invoiceNumber || inv?.id}
          </h1>
          {inv?.status && (
            <span
              class={`badge ${
                inv.status === "paid"
                  ? "badge-success"
                  : inv.status === "overdue"
                  ? "badge-error"
                  : inv.status === "sent"
                  ? "badge-info"
                  : ""
              }`}
            >
              {isOverdue && inv?.status !== "paid" ? "overdue" : inv?.status}
            </span>
          )}
        </div>
        {inv && (
          <div class="flex items-center gap-2">
            <a href={`/invoices/${inv.id}/edit`} class="btn btn-sm">
              <i data-lucide="pencil" class="w-4 h-4"></i>
              Edit
            </a>
            {/* Contextual primary action */}
            {inv.status === "draft" && (
              <form method="post">
                <input type="hidden" name="intent" value="publish" />
                <button
                  type="submit"
                  class="btn btn-sm btn-success"
                  title="Make public and mark as sent"
                >
                  <i data-lucide="upload" class="w-4 h-4"></i>
                  Publish
                </button>
              </form>
            )}
            {(inv.status === "sent" || inv.status === "overdue") && (
              <form method="post">
                <input type="hidden" name="intent" value="mark-paid" />
                <button
                  type="submit"
                  class="btn btn-sm btn-primary"
                  title="Mark as Paid"
                >
                  <i data-lucide="check" class="w-4 h-4"></i>
                  Mark as Paid
                </button>
              </form>
            )}
            {/* Overflow menu for secondary actions */}
            <div class="dropdown dropdown-end">
              <div tabIndex={0} role="button" class="btn btn-ghost btn-sm">
                <i data-lucide="more-horizontal" class="w-4 h-4"></i>
                More
              </div>
              <ul
                tabIndex={0}
                class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-2 w-56 p-2 shadow"
              >
                <li>
                  <button
                    type="submit"
                    form={`inv-${inv.id}-duplicate`}
                    class="flex items-center gap-2"
                  >
                    <i data-lucide="copy" class="w-4 h-4"></i>
                    Duplicate
                  </button>
                </li>
                <li>
                  <a
                    href={`/invoices/${inv.id}/xml`}
                    target="_blank"
                    title="Download XML (uses default profile from Settings)"
                    class="flex items-center gap-2"
                  >
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                    Download XML
                  </a>
                </li>
                {inv.status !== "draft" && (
                  <li>
                    <button
                      type="submit"
                      form={`inv-${inv.id}-unpublish`}
                      class="flex items-center gap-2"
                    >
                      <i data-lucide="shield-off" class="w-4 h-4"></i>
                      Unpublish
                    </button>
                  </li>
                )}
                {inv.status !== "sent" && inv.status !== "paid" && (
                  <li>
                    <button
                      type="submit"
                      form={`inv-${inv.id}-mark-sent`}
                      class="flex items-center gap-2"
                    >
                      <i data-lucide="send" class="w-4 h-4"></i>
                      Mark as Sent
                    </button>
                  </li>
                )}
                {inv.status && inv.status !== "draft" && inv.shareToken && (
                  <li>
                    <a
                      href={`/public/invoices/${inv.shareToken}`}
                      target="_blank"
                      class="flex items-center gap-2"
                    >
                      <i data-lucide="external-link" class="w-4 h-4"></i>
                      View public link
                    </a>
                  </li>
                )}
                <li>
                  <button
                    type="submit"
                    form={`inv-${inv.id}-delete`}
                    class="flex items-center gap-2 text-error"
                  >
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                    Delete
                  </button>
                </li>
              </ul>
            </div>
            {/* Hidden forms for menu actions to keep li > button structure for DaisyUI */}
            <form id={`inv-${inv.id}-duplicate`} method="post" class="hidden">
              <input type="hidden" name="intent" value="duplicate" />
            </form>
            {inv.status !== "draft" && (
              <form id={`inv-${inv.id}-unpublish`} method="post" class="hidden">
                <input type="hidden" name="intent" value="unpublish" />
              </form>
            )}
            {inv.status !== "sent" && inv.status !== "paid" && (
              <form id={`inv-${inv.id}-mark-sent`} method="post" class="hidden">
                <input type="hidden" name="intent" value="mark-sent" />
              </form>
            )}
            <form
              id={`inv-${inv.id}-delete`}
              method="post"
              class="hidden"
              data-confirm="Delete this invoice? This cannot be undone."
            >
              <input type="hidden" name="intent" value="delete" />
            </form>
          </div>
        )}
      </div>
      {props.data.error && (
        <div class="alert alert-error mb-3">
          <span>{props.data.error}</span>
        </div>
      )}
      {inv && (
        <div class="space-y-2">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span class="opacity-70">Customer:</span> {inv.customer?.name}
            </div>
            <div>
            {inv.taxes && inv.taxes.length > 0 && (
              <div class="pt-2">
                <div class="font-medium mb-1">Tax Summary</div>
                <div class="overflow-x-auto">
                  <table class="table table-xs w-auto">
                    <thead>
                      <tr>
                        <th class="text-left">Rate</th>
                        <th class="text-right">Taxable</th>
                        <th class="text-right">Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.taxes.map((t) => (
                        <tr>
                          <td>VAT {t.percent}%</td>
                          <td class="text-right">{fmtMoney(t.taxableAmount)}</td>
                          <td class="text-right">{fmtMoney(t.taxAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td class="text-right font-medium" colspan={2}>Tax Total</td>
                        <td class="text-right font-medium">{fmtMoney(inv.taxAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
              <span class="opacity-70">Email:</span> {inv.customer?.email}
            </div>
            <div class="sm:col-span-2">
              <span class="opacity-70">Address:</span> {inv.customer?.address}
            </div>
            <div>
              <span class="opacity-70">Issue Date:</span>{" "}
              {fmtDate(inv.issueDate)}
            </div>
            <div>
              <span class="opacity-70">Due Date:</span> {fmtDate(inv.dueDate)}
              {" "}
              {isOverdue && inv.status !== "paid" && (
                <span class="badge badge-error ml-2">Overdue</span>
              )}
            </div>
            <div>
              <span class="opacity-70">Subtotal:</span> {fmtMoney(inv.subtotal)}
            </div>
            <div>
              <span class="opacity-70">Tax:</span> {fmtMoney(inv.taxAmount)}
            </div>
            <div class="text-xs opacity-70">
              {typeof inv.taxRate === 'number' ? `Tax rate: ${inv.taxRate}%` : ''}
              {typeof inv.pricesIncludeTax === 'boolean' ? ` · Prices include tax: ${inv.pricesIncludeTax ? 'Yes' : 'No'}` : ''}
              {inv.roundingMode ? ` · Rounding: ${inv.roundingMode}` : ''}
              {(() => {
                const mode = (inv.taxes && inv.taxes.length) ? 'line' : 'invoice';
                return ` · Tax mode: ${mode === 'line' ? 'Per line' : 'Invoice total'}`;
              })()}
            </div>
            <div>
              <span class="opacity-70">Discount:</span>{" "}
              {fmtMoney(inv.discountAmount)}
            </div>
            <div>
              <span class="opacity-70">Total:</span>{" "}
              <span class="font-medium">{fmtMoney(inv.total)}</span>
            </div>
          </div>
          {inv.paymentTerms && (
            <div>
              <span class="opacity-70">Payment Terms:</span> {inv.paymentTerms}
            </div>
          )}
          {inv.items && inv.items.length > 0 && (
            <div class="opacity-60 text-xs">{inv.items.length} item(s)</div>
          )}
          <div class="pt-4 flex gap-2 items-center flex-wrap">
            <a
              class="btn btn-sm btn-ghost"
              href={`/invoices/${inv.id}/html`}
              target="_blank"
            >
              <i data-lucide="file-code-2" class="w-4 h-4"></i>
              View HTML
            </a>
            <a
              class="btn btn-sm btn-primary"
              href={`/invoices/${inv.id}/pdf`}
            >
              <i data-lucide="download" class="w-4 h-4"></i>
              Download PDF
            </a>
            {/* Public share link (visible when published i.e., not draft) */}
            {inv.status && inv.status !== "draft" && inv.shareToken && (
              <a
                class="btn btn-sm btn-outline"
                href={`/public/invoices/${inv.shareToken}`}
                target="_blank"
              >
                <i data-lucide="external-link" class="w-4 h-4"></i>
                View public link
              </a>
            )}
          </div>
        </div>
      )}
      {/* Attach confirm behavior for delete safely on the client */}
      <script>
        {`(function(){
        function onReady(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { fn(); } }
        onReady(function(){
          document.addEventListener('submit', function(e){
            var t = e.target;
            if (t && t.matches && t.matches('form[data-confirm]')) {
              var msg = t.getAttribute('data-confirm') || 'Are you sure?';
              if(!confirm(msg)) e.preventDefault();
            }
          }, true);
        });
      })();`}
      </script>
      {props.data.showPublishedBanner && props.data.invoice?.shareToken && (
        <script>
          {`(function(){
          function onReady(fn){ if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', fn); } else { fn(); } }
          onReady(function(){
            var btn = document.getElementById('copy-public-link');
            var urlEl = document.getElementById('public-link-url');
            if(btn && urlEl){
              btn.addEventListener('click', async function(){
                try { await navigator.clipboard.writeText(urlEl.textContent || ''); btn.innerText = 'Copied!'; setTimeout(function(){ btn.innerText='Copy link'; }, 1200); } catch(_e){}
              });
            }
          });
        })();`}
        </script>
      )}
    </Layout>
  );
}
