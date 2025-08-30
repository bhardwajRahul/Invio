import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../utils/backend.ts";

type Data = {
  authed: boolean;
  error?: string;
  counts?: { invoices: number; customers: number; templates: number };
};

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    try {
      const [invoices, customers, templates] = await Promise.all([
        backendGet("/api/v1/invoices", auth),
        backendGet("/api/v1/customers", auth),
        backendGet("/api/v1/templates", auth),
      ]);
      return ctx.render({ authed: true, counts: { invoices: invoices.length, customers: customers.length, templates: templates.length } });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
};

export default function Dashboard(props: PageProps<Data>) {
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Dashboard</h1>
      {props.data.error && (
        <div class="alert alert-error mb-4">
          <span>{props.data.error}</span>
        </div>
      )}
      {props.data.counts && (
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="text-sm opacity-70">Invoices</div>
              <div class="text-2xl font-bold">{props.data.counts.invoices}</div>
            </div>
          </div>
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="text-sm opacity-70">Customers</div>
              <div class="text-2xl font-bold">{props.data.counts.customers}</div>
            </div>
          </div>
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="text-sm opacity-70">Templates</div>
              <div class="text-2xl font-bold">{props.data.counts.templates}</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
