import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, backendDelete, backendPost, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Invoice = { id: string; customer?: { name?: string; email?: string; address?: string }; items?: { description: string }[]; total?: number; status?: 'draft' | 'sent' | 'paid' | 'overdue' };
type Data = { authed: boolean; invoice?: Invoice; error?: string; published?: { shareToken: string; shareUrl: string } };

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
    const intent = String(form.get("intent") || "");
    if (intent === "delete") {
      try {
        await backendDelete(`/api/v1/invoices/${id}`, auth);
        return new Response(null, { status: 303, headers: { Location: "/invoices" } });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    if (intent === "publish") {
      try {
  const result = await backendPost(`/api/v1/invoices/${id}/publish`, auth, {}) as { shareToken: string; shareUrl: string };
        // Re-fetch invoice to render page state after publish
        const invoice = await backendGet(`/api/v1/invoices/${id}`, auth) as Invoice;
        return ctx.render({ authed: true, invoice, published: result });
      } catch (e) {
        return ctx.render({ authed: true, error: String(e) });
      }
    }
    if (intent === "unpublish") {
      try {
        await backendPost(`/api/v1/invoices/${id}/unpublish`, auth, {});
        const invoice = await backendGet(`/api/v1/invoices/${id}`, auth) as Invoice;
        return ctx.render({ authed: true, invoice });
      } catch (e) {
        return ctx.render({ authed: true, error: String(e) });
      }
    }
    return new Response("Unsupported action", { status: 400 });
  }
};

export default function InvoiceDetail(props: PageProps<Data>) {
  const inv = props.data.invoice;
  return (
    <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      <div class="flex items-center justify-between mb-4 gap-2">
        <h1 class="text-2xl font-semibold">Invoice {inv?.id}</h1>
        {inv && (
          <div class="flex gap-2">
            <a href={`/invoices/${inv.id}/edit`} class="btn btn-sm">
              <i data-lucide="pencil" class="w-4 h-4"></i>
              Edit
            </a>
            <form method="post">
              <input type="hidden" name="intent" value="publish" />
              <button type="submit" class="btn btn-sm btn-outline">
                <i data-lucide="share-2" class="w-4 h-4"></i>
                Publish
              </button>
            </form>
            {inv.status && inv.status !== 'draft' && (
              <form method="post">
                <input type="hidden" name="intent" value="unpublish" />
                <button type="submit" class="btn btn-sm btn-outline">
                  <i data-lucide="unlink-2" class="w-4 h-4"></i>
                  Unpublish
                </button>
              </form>
            )}
            <form method="post" onSubmit={(e) => { if (!confirm('Delete this invoice? This cannot be undone.')) { e.preventDefault(); } }}>
              <input type="hidden" name="intent" value="delete" />
              <button type="submit" class="btn btn-sm btn-outline btn-error">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
                Delete
              </button>
            </form>
          </div>
        )}
      </div>
      {props.data.error && (
        <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>
      )}
      {props.data.published && (
        <div class="alert alert-info mb-4 items-center">
          <div class="flex-1">
            <strong>Published!</strong> Share this link with your customer:
            <div class="mt-1">
              {(() => { const shareToken = props.data.published!.shareToken; const base = new URL(props.url).origin; const href = `/public/invoices/${shareToken}`; return (
                <a class="link" href={href} target="_blank">{`${base}${href}`}</a>
              ); })()}
            </div>
          </div>
          <button type="button" class="btn btn-sm" id="copy-share">Copy</button>
        </div>
      )}
      {inv && (
        <div class="space-y-2">
          <div><span class="opacity-70">Customer:</span> {inv.customer?.name}</div>
          <div><span class="opacity-70">Email:</span> {inv.customer?.email}</div>
          <div><span class="opacity-70">Address:</span> {inv.customer?.address}</div>
          <div><span class="opacity-70">Total:</span> {inv.total}</div>
          <div class="pt-4 flex gap-2">
            <a
              class="btn btn-sm btn-ghost"
              href={`/invoices/${inv.id}/html?template=professional-modern`}
              target="_blank"
            >
              <i data-lucide="file-code-2" class="w-4 h-4"></i>
              View HTML (professional)
            </a>
            <a
              class="btn btn-sm btn-ghost"
              href={`/invoices/${inv.id}/html?template=minimalist-clean`}
              target="_blank"
            >
              <i data-lucide="file-code-2" class="w-4 h-4"></i>
              View HTML (minimalist)
            </a>
            <a
              class="btn btn-sm btn-primary"
              href={`/invoices/${inv.id}/pdf?template=professional-modern`}
            >
              <i data-lucide="download" class="w-4 h-4"></i>
              Download PDF
            </a>
          </div>
        </div>
      )}
      {props.data.published && (
        <script dangerouslySetInnerHTML={{ __html: `(() => {
          const btn = document.getElementById('copy-share');
          if (!btn) return;
          const url = '${`${new URL(props.url).origin}/public/invoices/${props.data.published!.shareToken}`}'.replace(/'/g, "\\'");
          btn.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(url); btn.textContent = 'Copied'; setTimeout(()=>btn.textContent='Copy', 1500); } catch {}
          });
        })();` }} />
      )}
    </Layout>
  );
}
