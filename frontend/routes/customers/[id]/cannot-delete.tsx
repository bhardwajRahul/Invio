import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { getAuthHeaderFromCookie } from "../../../utils/backend.ts";

type Data = { authed: boolean; id: string };

export const handler: Handlers<Data> = {
  GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const { id } = ctx.params as { id: string };
    return ctx.render({ authed: true, id });
  },
};

export default function CannotDeleteCustomer(props: PageProps<Data>) {
  const { id } = props.data;
  return (
    <Layout authed={props.data.authed}>
      <div class="max-w-2xl mx-auto bg-white border rounded p-6">
        <h1 class="text-2xl font-semibold mb-3">Cannot delete this customer</h1>
        <p class="mb-2">This customer has one or more invoices associated with them. You must delete those invoices first before you can delete the customer.</p>
  <ul class="list-disc pl-5 opacity-80 mb-4">
          <li>Delete or reassign all invoices for this customer</li>
          <li>Then return to the customer page and try again</li>
        </ul>
        <div class="flex gap-2">
          <a href={`/customers/${id}`} class="px-4 py-2 rounded border bg-white hover:bg-gray-50">Back to customer</a>
          <a href="/invoices" class="btn btn-primary">
            <i data-lucide="list" class="w-4 h-4"></i>
            Go to Invoices
          </a>
        </div>
      </div>
    </Layout>
  );
}
