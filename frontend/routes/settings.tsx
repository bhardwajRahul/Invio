import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../utils/backend.ts";

type Settings = Record<string, unknown> & { companyName?: string; email?: string; phone?: string; taxId?: string };
type Data = { authed: boolean; settings?: Settings; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    try {
      const settings = await backendGet("/api/v1/settings", auth) as Settings;
      return ctx.render({ authed: true, settings });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
};

export default function SettingsPage(props: PageProps<Data>) {
  const s = props.data.settings;
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Settings</h1>
      {props.data.error && <p class="text-red-600">{props.data.error}</p>}
      {s && (
        <div class="bg-white border rounded p-4 space-y-2">
          <div><span class="text-gray-600">Company:</span> {s.companyName as string}</div>
          <div><span class="text-gray-600">Email:</span> {s.email as string}</div>
          <div><span class="text-gray-600">Phone:</span> {s.phone as string}</div>
          <div><span class="text-gray-600">Tax ID:</span> {s.taxId as string}</div>
        </div>
      )}
    </Layout>
  );
}
