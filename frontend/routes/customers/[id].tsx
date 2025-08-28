import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../../utils/backend.ts";

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
};

export default function CustomerDetail(props: PageProps<Data>) {
  const c = props.data.customer;
  return (
    <Layout authed={props.data.authed}>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Customer {c?.name || c?.id}</h1>
        {c && <a href={`/customers/${c.id}/edit`} class="bg-black text-white px-3 py-2 rounded text-sm">Edit</a>}
      </div>
      {props.data.error && <p class="text-red-600">{props.data.error}</p>}
      {c && (
        <div class="space-y-2">
          <div><span class="text-gray-600">Email:</span> {c.email}</div>
          <div><span class="text-gray-600">Address:</span> {c.address}</div>
        </div>
      )}
    </Layout>
  );
}
