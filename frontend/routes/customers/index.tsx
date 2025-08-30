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
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Customers</h1>
  <a href="/customers/new" class="btn btn-primary btn-sm"><i data-lucide="user-plus" class="w-4 h-4"></i>New Customer</a>
      </div>
      {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      <div class="overflow-x-auto rounded-box bg-base-100 border">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr class="hover">
                <td><a class="link" href={`/customers/${c.id}`}>{c.name || c.id}</a></td>
                <td class="opacity-70">{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
