import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Template = { id: string; name?: string; isDefault?: boolean };
type Data = { authed: boolean; templates?: Template[]; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    try {
      const templates = await backendGet("/api/v1/templates", auth) as Template[];
      return ctx.render({ authed: true, templates });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
};

export default function Templates(props: PageProps<Data>) {
  const list = props.data.templates ?? [];
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Templates</h1>
      {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      <div class="overflow-x-auto rounded-box bg-base-100 border">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr class="hover">
                <td>{t.name || t.id}</td>
                <td>{t.isDefault ? <span class="badge">default</span> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
