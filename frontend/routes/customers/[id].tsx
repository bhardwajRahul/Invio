import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, backendDelete, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Customer = { id: string; name?: string; email?: string; address?: string };
type Data = { authed: boolean; customer?: Customer; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const { id } = ctx.params as { id: string };
    try {
      const customer = await backendGet(`/api/v1/customers/${id}`, auth) as Customer;
      return ctx.render({ authed: true, customer });
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
        await backendDelete(`/api/v1/customers/${id}`, auth);
        return new Response(null, { status: 303, headers: { Location: "/customers" } });
  } catch (_e) {
        // Redirect to an informational page when deletion is blocked (e.g., existing invoices)
        return new Response(null, { status: 303, headers: { Location: `/customers/${id}/cannot-delete` } });
      }
    }
    return new Response("Unsupported action", { status: 400 });
  }
};

export default function CustomerDetail(props: PageProps<Data>) {
  const c = props.data.customer;
  return (
    <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Customer {c?.name || c?.id}</h1>
        {c && (
          <div class="flex gap-2">
            <a href={`/customers/${c.id}/edit`} class="btn btn-sm">
              <i data-lucide="pencil" class="w-4 h-4"></i>
              Edit
            </a>
            <form method="post" data-confirm="Delete this customer? This cannot be undone.">
              <input type="hidden" name="intent" value="delete" />
              <button type="submit" class="btn btn-sm btn-outline btn-error">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
                Delete
              </button>
            </form>
          </div>
        )}
      </div>
      {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      {c && (
        <div class="space-y-2">
          {c.email && <div><span class="opacity-70">Email:</span> {c.email}</div>}
          {c.address && <div><span class="opacity-70">Address:</span> {c.address}</div>}
        </div>
      )}
      <script>{`(function(){
        document.addEventListener('submit', function(e){
          var t = e.target;
          if (t && t.matches && t.matches('form[data-confirm]')) {
            var msg = t.getAttribute('data-confirm') || 'Are you sure?';
            if(!confirm(msg)) e.preventDefault();
          }
        }, true);
      })();`}</script>
    </Layout>
  );
}
