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
      <h1 class="text-2xl font-semibold mb-2">Welcome to Invio</h1>
      <p class="text-gray-600">Login to browse invoices, customers, templates, and settings.</p>
    </Layout>
  );
}
