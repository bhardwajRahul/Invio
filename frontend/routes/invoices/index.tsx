import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Invoice = { id: string; customer?: { name?: string }; issue_date?: string; total?: number };
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
  return (
  <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Invoices</h1>
  <a href="/invoices/new" class="btn btn-primary btn-sm"><i data-lucide="plus" class="w-4 h-4"></i>New Invoice</a>
      </div>
  {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      <div class="overflow-x-auto rounded-box bg-base-100 border">
        <table class="table table-zebra w-full">
          <thead>
            <tr class="text-sm">
              <th>ID</th>
              <th>Customer</th>
              <th>Issue Date</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((inv) => (
              <tr class="hover">
                <td><a class="link" href={`/invoices/${inv.id}`}>{inv.id}</a></td>
                <td>{inv.customer?.name}</td>
                <td>{inv.issue_date}</td>
                <td>{inv.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
