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
    <Layout authed={props.data.authed}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Invoices</h1>
        <a href="/invoices/new" class="bg-black text-white px-3 py-2 rounded text-sm">New Invoice</a>
      </div>
      {props.data.error && <p class="text-red-600">{props.data.error}</p>}
      <table class="min-w-full bg-white border">
        <thead>
          <tr class="bg-gray-50 text-left text-sm">
            <th class="p-2 border">ID</th>
            <th class="p-2 border">Customer</th>
            <th class="p-2 border">Issue Date</th>
            <th class="p-2 border">Total</th>
          </tr>
        </thead>
        <tbody>
          {list.map((inv) => (
            <tr>
              <td class="p-2 border"><a class="underline" href={`/invoices/${inv.id}`}>{inv.id}</a></td>
              <td class="p-2 border">{inv.customer?.name}</td>
              <td class="p-2 border">{inv.issue_date}</td>
              <td class="p-2 border">{inv.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}
