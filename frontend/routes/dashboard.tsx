import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../utils/backend.ts";

type Invoice = {
  id: string;
  invoiceNumber: string;
  customer?: { name?: string };
  issueDate?: string | Date;
  updatedAt?: string | Date;
  currency?: string;
  status: "draft" | "sent" | "paid" | "overdue";
  total?: number;
};

type Data = {
  authed: boolean;
  error?: string;
  counts?: { invoices: number; customers: number; templates: number };
  money?: {
    billed: number;
    paid: number;
    outstanding: number;
    currency: string;
  };
  status?: { draft: number; sent: number; paid: number; overdue: number };
  recent?: Invoice[];
};

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    try {
      const [invoices, customers, templates] = await Promise.all([
        backendGet("/api/v1/invoices", auth) as Promise<Invoice[]>,
        backendGet("/api/v1/customers", auth) as Promise<unknown[]>,
        backendGet("/api/v1/templates", auth) as Promise<unknown[]>,
      ]);

      const currency = (invoices[0]?.currency as string) || "USD";
      const billed = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
      const paid = invoices.filter((i) => i.status === "paid").reduce(
        (s, i) => s + (i.total || 0),
        0,
      );
      const outstanding = invoices.filter((i) =>
        i.status === "sent" || i.status === "overdue"
      ).reduce((s, i) => s + (i.total || 0), 0);
      const status = {
        draft: invoices.filter((i) => i.status === "draft").length,
        sent: invoices.filter((i) => i.status === "sent").length,
        paid: invoices.filter((i) => i.status === "paid").length,
        overdue: invoices.filter((i) => i.status === "overdue").length,
      };

      const recent = invoices
        .slice()
        .sort((a, b) =>
          new Date(b.updatedAt || b.issueDate || 0).getTime() -
          new Date(a.updatedAt || a.issueDate || 0).getTime()
        )
        .slice(0, 5);

      return ctx.render({
        authed: true,
        counts: {
          invoices: invoices.length,
          customers: customers.length,
          templates: templates.length,
        },
        money: { billed, paid, outstanding, currency },
        status,
        recent,
      });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
};

export default function Dashboard(props: PageProps<Data>) {
  const fmtMoney = (n: number) => {
    const cur = props.data.money?.currency || "USD";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: cur,
      }).format(n || 0);
    } catch {
      return `${cur} ${Number(n || 0).toFixed(2)}`;
    }
  };

  return (
    <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      <div class="mb-4">
        <h1 class="text-2xl font-semibold">Dashboard</h1>
      </div>

      {props.data.error && (
        <div class="alert alert-error mb-4">
          <span>{props.data.error}</span>
        </div>
      )}

      {props.data.counts && (
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Invoices</div>
              <div class="text-3xl font-extrabold">
                {props.data.counts.invoices}
              </div>
            </div>
          </div>
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Customers</div>
              <div class="text-3xl font-extrabold">
                {props.data.counts.customers}
              </div>
            </div>
          </div>
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Templates</div>
              <div class="text-3xl font-extrabold">
                {props.data.counts.templates}
              </div>
            </div>
          </div>
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Open Invoices</div>
              <div class="text-3xl font-extrabold">
                {(props.data.status?.sent || 0) +
                  (props.data.status?.overdue || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {props.data.money && (
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Total Billed</div>
              <div class="text-2xl font-bold">
                {fmtMoney(props.data.money.billed)}
              </div>
            </div>
          </div>
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Outstanding</div>
              <div class="text-2xl font-bold">
                {fmtMoney(props.data.money.outstanding)}
              </div>
            </div>
          </div>
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Paid</div>
              <div class="text-2xl font-bold">
                {fmtMoney(props.data.money.paid)}
              </div>
            </div>
          </div>
        </div>
      )}

      {props.data.status && (
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Draft</div>
              <div class="text-xl font-semibold">{props.data.status.draft}</div>
            </div>
          </div>
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Sent</div>
              <div class="text-xl font-semibold">{props.data.status.sent}</div>
            </div>
          </div>
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Paid</div>
              <div class="text-xl font-semibold">{props.data.status.paid}</div>
            </div>
          </div>
          <div class="card bg-base-100 border rounded-box">
            <div class="card-body">
              <div class="text-sm opacity-70">Overdue</div>
              <div class="text-xl font-semibold text-error">
                {props.data.status.overdue}
              </div>
            </div>
          </div>
        </div>
      )}

      {props.data.recent && props.data.recent.length > 0 && (
        <div class="bg-base-100 border rounded-box overflow-hidden">
          <div class="p-4 border-b flex items-center justify-between">
            <h2 class="font-semibold">Recent Invoices</h2>
            <a href="/invoices" class="btn btn-sm btn-ghost">View all</a>
          </div>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full text-sm">
              <thead class="bg-base-200 text-base-content">
                <tr class="text-sm font-medium">
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th class="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {props.data.recent.map((inv) => {
                  const d = inv.issueDate ? new Date(inv.issueDate) : undefined;
                  const date = d ? d.toLocaleDateString() : "";
                  const badge = inv.status === "paid"
                    ? "badge-success"
                    : inv.status === "overdue"
                    ? "badge-error"
                    : inv.status === "sent"
                    ? "badge-info"
                    : "";
                  return (
                    <tr class="hover" key={inv.id}>
                      <td class="font-semibold">{inv.invoiceNumber}</td>
                      <td>{inv.customer?.name || ""}</td>
                      <td>{date}</td>
                      <td>
                        <span class={`badge ${badge}`}>{inv.status}</span>
                      </td>
                      <td class="text-right">{fmtMoney(inv.total || 0)}</td>
                      <td class="text-right">
                        <a
                          class="btn btn-ghost btn-sm"
                          href={`/invoices/${inv.id}`}
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
