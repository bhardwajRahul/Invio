import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import { getAuthHeaderFromCookie } from "../../../utils/backend.ts";

type Data = { authed: boolean; id: string };

export const handler: Handlers<Data> = {
  GET(req, ctx) {
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
    return ctx.render({ authed: true, id });
  },
};

export default function CannotDeleteCustomer(props: PageProps<Data>) {
  const { id } = props.data;
  return (
    <Layout authed={props.data.authed} path={new URL(props.url).pathname} wide>
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-2">
          <h1 class="text-2xl font-semibold">Cannot Delete Customer</h1>
          <div class="flex items-center gap-2">
            <a href={`/customers/${id}`} class="btn btn-ghost btn-sm">
              Back to Customer
            </a>
            <a href="/invoices" class="btn btn-primary btn-sm">
              <i data-lucide="list" class="w-4 h-4"></i>
              Go to Invoices
            </a>
          </div>
        </div>

        <div class="alert alert-warning">
          <i data-lucide="alert-triangle" class="w-5 h-5"></i>
          <div>
            <h3 class="font-bold">Customer Has Associated Invoices</h3>
            <div class="text-sm mt-1">
              This customer has one or more invoices associated with them. You must delete those invoices first before you can delete the customer.
            </div>
          </div>
        </div>

        <div class="bg-base-200 rounded-box p-4">
          <h3 class="font-semibold mb-2">What you need to do:</h3>
          <ul class="list-disc pl-5 space-y-1 text-sm">
            <li>Delete or reassign all invoices for this customer</li>
            <li>Then return to the customer page and try again</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
