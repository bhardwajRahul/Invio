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
      {props.data.error && <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>}
      <div class="mb-4 card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title">Theme</h2>
          <div class="join">
            <button type="button" class="btn join-item" id="theme-light">Light</button>
            <button type="button" class="btn join-item" id="theme-dark">Dark</button>
          </div>
          <p class="text-sm opacity-70">Applies instantly and persists for your browser.</p>
        </div>
      </div>
      <form method="post" class="space-y-4 bg-base-100 border rounded-box p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label"><span class="label-text">Company Name</span></div>
            <input name="companyName" value={(s.companyName as string) || ""} class="input input-bordered w-full" />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Currency</span></div>
            <input name="currency" value={(s.currency as string) || "USD"} class="input input-bordered w-full" />
          </label>
        </div>

        <label class="form-control">
          <div class="label"><span class="label-text">Company Address</span></div>
          <textarea name="companyAddress" class="textarea textarea-bordered" rows={2}>{(s.companyAddress as string) || ""}</textarea>
        </label>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="form-control">
            <div class="label"><span class="label-text">Email</span></div>
            <input name="email" value={(s.email as string) || (s.companyEmail as string) || ""} class="input input-bordered w-full" />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Phone</span></div>
            <input name="phone" value={(s.phone as string) || (s.companyPhone as string) || ""} class="input input-bordered w-full" />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Tax ID</span></div>
            <input name="taxId" value={(s.taxId as string) || (s.companyTaxId as string) || ""} class="input input-bordered w-full" />
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label"><span class="label-text">Logo (data URL)</span></div>
            <input name="logo" value={(s.logo as string) || ""} class="input input-bordered w-full" placeholder="data:image/png;base64,..." />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Logo URL</span></div>
            <input name="logoUrl" value={(s.logoUrl as string) || ""} class="input input-bordered w-full" placeholder="https://..." />
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="form-control">
            <div class="label"><span class="label-text">Default Template</span></div>
            <select name="templateId" class="select select-bordered w-full" value={(s.templateId as string) || "professional-modern"}>
              <option value="professional-modern">Professional Modern</option>
              <option value="minimalist-clean">Minimalist Clean</option>
            </select>
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Highlight Color</span></div>
            <input name="highlight" value={(s.highlight as string) || "#6B4EFF"} class="input input-bordered w-full" placeholder="#6B4EFF" />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Brand Layout</span></div>
            <select name="brandLayout" class="select select-bordered w-full" value={(s.brandLayout as string) || "logo-left"}>
              <option value="logo-left">Logo Left</option>
              <option value="logo-right">Logo Right</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label"><span class="label-text">Payment Methods</span></div>
            <input name="paymentMethods" value={(s.paymentMethods as string) || "Bank Transfer"} class="input input-bordered w-full" />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Bank Account</span></div>
            <input name="bankAccount" value={(s.bankAccount as string) || ""} class="input input-bordered w-full" />
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label"><span class="label-text">Payment Terms</span></div>
            <input name="paymentTerms" value={(s.paymentTerms as string) || "Due in 30 days"} class="input input-bordered w-full" />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Default Notes</span></div>
            <input name="defaultNotes" value={(s.defaultNotes as string) || ""} class="input input-bordered w-full" />
          </label>
        </div>

        <div class="pt-2">
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </div>
      </form>
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          function setTheme(t){
            localStorage.setItem('theme', t);
            document.documentElement.setAttribute('data-theme', t);
          }
          var l = document.getElementById('theme-light');
          var d = document.getElementById('theme-dark');
          if(l) l.addEventListener('click', function(){ setTheme('light'); });
          if(d) d.addEventListener('click', function(){ setTheme('dark'); });
        })();
      `}} />
    </Layout>
  );
}
