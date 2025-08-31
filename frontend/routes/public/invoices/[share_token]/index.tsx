import { Handlers, PageProps } from "$fresh/server.ts";
import { BACKEND_URL } from "../../../../utils/backend.ts";

type Data = { invoice?: unknown; error?: string };

export const handler: Handlers<Data> = {
  async GET(_req, ctx) {
    const { share_token } = ctx.params as { share_token: string };
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/public/invoices/${share_token}`);
      if (!res.ok) return ctx.render({ error: `${res.status} ${res.statusText}` });
      const invoice = await res.json();
      return ctx.render({ invoice });
    } catch (e) {
      return ctx.render({ error: String(e) });
    }
  }
};

export default function PublicInvoicePage(props: PageProps<Data>) {
  return (
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-semibold mb-4">Invoice</h1>
      {props.data.error && <div class="alert alert-error"><span>{props.data.error}</span></div>}
      {props.data.invoice && (
        <pre class="bg-base-200 p-3 rounded-box overflow-auto text-sm">{JSON.stringify(props.data.invoice, null, 2)}</pre>
      )}
    </div>
  );
}
