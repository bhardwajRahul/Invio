import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import { backendGet, backendPatch, getAuthHeaderFromCookie } from "../utils/backend.ts";

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
  async POST(req) {
    const auth = getAuthHeaderFromCookie(req.headers.get("cookie") || undefined);
    if (!auth) return new Response(null, { status: 303, headers: { Location: "/login" } });
    const form = await req.formData();
    const payload: Record<string, string> = {};
    const fields = [
      "companyName", "companyAddress", "email", "phone", "taxId",
      "currency", "paymentMethods", "bankAccount", "paymentTerms", "defaultNotes",
      "templateId", "highlight", "brandLayout", "logo", "logoUrl"
    ];
    for (const f of fields) {
      const v = String(form.get(f) ?? "");
      if (v !== "") payload[f] = v;
    }
    // Normalize aliases back to stored keys
    if (payload.email && !payload.companyEmail) payload.companyEmail = payload.email, delete payload.email;
    if (payload.phone && !payload.companyPhone) payload.companyPhone = payload.phone, delete payload.phone;
    if (payload.taxId && !payload.companyTaxId) payload.companyTaxId = payload.taxId, delete payload.taxId;
    try {
      await backendPatch("/api/v1/settings", auth, payload);
      return new Response(null, { status: 303, headers: { Location: "/settings" } });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }
};

export default function SettingsPage(props: PageProps<Data>) {
  const s = props.data.settings ?? {} as Settings;
  return (
    <Layout authed={props.data.authed}>
      <h1 class="text-2xl font-semibold mb-4">Settings</h1>
      {props.data.error && <p class="text-red-600">{props.data.error}</p>}
      <form method="post" class="space-y-4 bg-white border rounded p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1">Company Name</label>
            <input name="companyName" value={(s.companyName as string) || ""} class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Currency</label>
            <input name="currency" value={(s.currency as string) || "USD"} class="border rounded px-3 py-2 w-full" />
          </div>
        </div>

        <div>
          <label class="block text-sm mb-1">Company Address</label>
          <textarea name="companyAddress" class="border rounded px-3 py-2 w-full" rows={2}>{(s.companyAddress as string) || ""}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm mb-1">Email</label>
            <input name="email" value={(s.email as string) || (s.companyEmail as string) || ""} class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Phone</label>
            <input name="phone" value={(s.phone as string) || (s.companyPhone as string) || ""} class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Tax ID</label>
            <input name="taxId" value={(s.taxId as string) || (s.companyTaxId as string) || ""} class="border rounded px-3 py-2 w-full" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1">Logo (data URL)</label>
            <input name="logo" value={(s.logo as string) || ""} class="border rounded px-3 py-2 w-full" placeholder="data:image/png;base64,..." />
          </div>
          <div>
            <label class="block text-sm mb-1">Logo URL</label>
            <input name="logoUrl" value={(s.logoUrl as string) || ""} class="border rounded px-3 py-2 w-full" placeholder="https://..." />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm mb-1">Default Template</label>
            <select name="templateId" class="border rounded px-3 py-2 w-full" value={(s.templateId as string) || "professional-modern"}>
              <option value="professional-modern">Professional Modern</option>
              <option value="minimalist-clean">Minimalist Clean</option>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-1">Highlight Color</label>
            <input name="highlight" value={(s.highlight as string) || "#6B4EFF"} class="border rounded px-3 py-2 w-full" placeholder="#6B4EFF" />
          </div>
          <div>
            <label class="block text-sm mb-1">Brand Layout</label>
            <select name="brandLayout" class="border rounded px-3 py-2 w-full" value={(s.brandLayout as string) || "logo-left"}>
              <option value="logo-left">Logo Left</option>
              <option value="logo-right">Logo Right</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1">Payment Methods</label>
            <input name="paymentMethods" value={(s.paymentMethods as string) || "Bank Transfer"} class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Bank Account</label>
            <input name="bankAccount" value={(s.bankAccount as string) || ""} class="border rounded px-3 py-2 w-full" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1">Payment Terms</label>
            <input name="paymentTerms" value={(s.paymentTerms as string) || "Due in 30 days"} class="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">Default Notes</label>
            <input name="defaultNotes" value={(s.defaultNotes as string) || ""} class="border rounded px-3 py-2 w-full" />
          </div>
        </div>

        <div class="pt-2">
          <button type="submit" class="bg-black text-white px-4 py-2 rounded">Save Settings</button>
        </div>
      </form>
    </Layout>
  );
}
