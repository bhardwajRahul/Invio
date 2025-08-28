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
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Invoice {inv?.id}</h1>
        {inv && <a href={`/invoices/${inv.id}/edit`} class="bg-black text-white px-3 py-2 rounded text-sm">Edit</a>}
      </div>
      {props.data.error && <p class="text-red-600">{props.data.error}</p>}
      {inv && (
        <div class="space-y-2">
          <div><span class="text-gray-600">Customer:</span> {inv.customer?.name}</div>
          <div><span class="text-gray-600">Email:</span> {inv.customer?.email}</div>
          <div><span class="text-gray-600">Address:</span> {inv.customer?.address}</div>
          <div><span class="text-gray-600">Total:</span> {inv.total}</div>
          <div class="pt-4 flex gap-2">
            <a
              class="px-3 py-2 rounded border bg-white hover:bg-gray-50"
              href={`/invoices/${inv.id}/html?template=professional-modern`}
              target="_blank"
            >
              View HTML (professional)
            </a>
            <a
              class="px-3 py-2 rounded border bg-white hover:bg-gray-50"
              href={`/invoices/${inv.id}/html?template=minimalist-clean`}
              target="_blank"
            >
              View HTML (minimalist)
            </a>
            <a
              class="px-3 py-2 rounded border bg-black text-white"
              href={`/invoices/${inv.id}/pdf?template=professional-modern`}
            >
              Download PDF
            </a>
          </div>
        </div>
      )}
    </Layout>
  );
}
