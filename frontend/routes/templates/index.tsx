import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendGet, backendDelete, getAuthHeaderFromCookie } from "../../utils/backend.ts";

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
  async POST(req, ctx) {
    // Handle template deletion via form POST with _method=DELETE
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const form = await req.formData();
    const intent = String(form.get("intent") || "");
    if (intent === "delete-template") {
      const id = String(form.get("id") || "");
      if (!id) return new Response("Missing template id", { status: 400 });
      try {
        await backendDelete(`/api/v1/templates/${id}`, auth);
        return new Response(null, { status: 303, headers: { Location: "/templates" } });
      } catch (e) {
        return ctx.render({ authed: true, error: String(e) });
      }
    }
    return new Response("Unsupported action", { status: 400 });
  }
};

export default function Templates(props: PageProps<Data>) {
  const list = props.data.templates ?? [];
  return (
  <Layout authed={props.data.authed} path={new URL(props.url).pathname}>
      <h1 class="text-2xl font-semibold mb-4">Templates</h1>
      {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      <div class="overflow-x-auto rounded-box bg-base-100 border">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th class="w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => {
              const isBuiltin = t.id === "professional-modern" || t.id === "minimalist-clean";
              return (
                <tr class="hover">
                  <td>{t.name || t.id}</td>
                  <td>{t.isDefault ? <span class="badge">default</span> : null}</td>
                  <td class="text-right">
                    {!isBuiltin && (
                      <form method="post" class="inline" onSubmit={(e) => { if (!confirm('Delete this template?')) e.preventDefault(); }}>
                        <input type="hidden" name="intent" value="delete-template" />
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" class="btn btn-sm btn-outline btn-error">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                          Delete
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
