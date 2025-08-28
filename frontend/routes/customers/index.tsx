import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Customer = { id: string; name?: string; email?: string };
type Data = { authed: boolean; customers?: Customer[]; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    try {
      const customers = await backendGet("/api/v1/customers", auth) as Customer[];
      return ctx.render({ authed: true, customers });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
};

export default function Customers(props: PageProps<Data>) {
  const list = props.data.customers ?? [];
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Customers</h1>
      {props.data.error && <p class="text-red-600">{props.data.error}</p>}
      <ul class="space-y-2">
        {list.map((c) => (
          <li class="p-2 bg-white border rounded">
            <a class="underline" href={`/customers/${c.id}`}>{c.name || c.id}</a>
            {c.email && <span class="text-gray-500 ml-2">{c.email}</span>}
          </li>
        ))}
      </ul>
    </Layout>
  );
}
