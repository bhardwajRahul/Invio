import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";

export const handler: Handlers = {
  GET(_req, ctx) {
    const authed = Boolean(_req.headers.get("cookie"));
    return ctx.render({ authed });
  },
};

export default function Home(props: PageProps<{ authed: boolean }>) {
  return (
    <Layout authed={props.data.authed}>
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h1 class="card-title">Welcome to Invio</h1>
          <p class="text-base-content/70">Login to browse invoices, customers, templates, and settings.</p>
        </div>
      </div>
    </Layout>
  );
}
