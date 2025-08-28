import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Invoice = { id: string; customer?: { name?: string; email?: string; address?: string }; items?: unknown[]; total?: number };
type Data = { authed: boolean; invoice?: Invoice; error?: string };

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
};

export default function InvoiceDetail(props: PageProps<Data>) {
  const inv = props.data.invoice;
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Invoice {inv?.id}</h1>
      {props.data.error && <p class="text-red-600">{props.data.error}</p>}
      {inv && (
        <div class="space-y-2">
          <div><span class="text-gray-600">Customer:</span> {inv.customer?.name}</div>
          <div><span class="text-gray-600">Email:</span> {inv.customer?.email}</div>
          <div><span class="text-gray-600">Address:</span> {inv.customer?.address}</div>
          <div><span class="text-gray-600">Total:</span> {inv.total}</div>
        </div>
      )}
    </Layout>
  );
}
