import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../components/Layout.tsx";
import InstallTemplateForm from "../islands/InstallTemplateForm.tsx";
import SettingsEnhancements from "../islands/SettingsEnhancements.tsx";
import ThemeToggle from "../islands/ThemeToggle.tsx";
import ExportAll from "../islands/ExportAll.tsx";
// Using official Lucide icons via <i data-lucide="..."> (initialized in Layout's LucideInit)
import {
  backendGet,
  backendPatch,
  backendDelete,
  backendPost,
  getAuthHeaderFromCookie,
} from "../utils/backend.ts";

type Settings = Record<string, unknown> & {
  companyName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  embedXmlInHtml?: string;
};
type Template = { id: string; name: string; isDefault?: boolean; updatable?: boolean };
type Data = {
  authed: boolean;
  settings?: Settings;
  templates?: Template[];
  error?: string;
};

export const handler: Handlers<Data & { demoMode: boolean }> = {
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
      // Fetch demo mode from public endpoint (no auth)
      const demoModePromise = fetch("/api/public/demo-mode").then(async (r) => {
        if (!r.ok) return false;
        const data = await r.json();
        return !!data.demoMode;
      }).catch(() => false);
      const [settings, templates, demoMode] = await Promise.all([
        backendGet("/api/v1/settings", auth) as Promise<Settings>,
        backendGet("/api/v1/templates", auth).catch(() => []) as Promise<Template[]>,
        demoModePromise,
      ]);
      return ctx.render({ authed: true, settings, templates, demoMode });
    } catch (e) {
      // Try to still get demoMode if possible
      let demoMode = false;
      try {
        const r = await fetch("/api/public/demo-mode");
        if (r.ok) {
          const data = await r.json();
          demoMode = !!data.demoMode;
        }
  } catch { /* ignore */ }
      return ctx.render({ authed: true, error: String(e), demoMode });
    }
  },
  async POST(req) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    // Preserve the current tab by reading the section from the request URL
    const url = new URL(req.url);
    const sectionParam = url.searchParams.get("section") || "company";
    const form = await req.formData();
  const payload: Record<string, string> = {};
    // Handle delete template action early
    const deleteId = String(form.get("deleteTemplateId") ?? "").trim();
    if (deleteId) {
      try {
        await backendDelete(`/api/v1/templates/${deleteId}`, auth);
        return new Response(null, {
          status: 303,
          headers: { Location: `/settings?section=${encodeURIComponent(sectionParam)}` },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }
    // Handle template update action
    const updateId = String(form.get("updateTemplateId") ?? "").trim();
    if (updateId) {
      try {
        await backendPost(`/api/v1/templates/${updateId}/update`, auth, {});
        return new Response(null, {
          status: 303,
          headers: { Location: `/settings?section=${encodeURIComponent(sectionParam || "templates")}` },
        });
      } catch (e) {
        return new Response(String(e), { status: 500 });
      }
    }

    const fields = [
      "companyName",
      "companyAddress",
      "email",
      "phone",
      "taxId",
      "countryCode",
      "currency",
      "paymentMethods",
      "bankAccount",
      "paymentTerms",
      "defaultNotes",
      "templateId",
      "highlight",
      "logo",
      // XML export
      "xmlProfileId",
  "embedXmlInPdf",
  "embedXmlInHtml",
      // Defaults for taxes
      "defaultTaxRate",
      "defaultPricesIncludeTax",
      "defaultRoundingMode",
      // Numbering pattern
      "invoiceNumberPattern",
      // Toggle to enable/disable advanced invoice numbering pattern
      "invoiceNumberingEnabled",
    ];
    // Collect values; handle duplicate hidden + checkbox pattern (want last value = actual state)
    for (const f of fields) {
      const all = form.getAll(f).map((v) => String(v));
      if (all.length === 0) continue;
      // Take the last value, even if empty (to allow clearing optional fields)
      const chosen = all[all.length - 1];
      payload[f] = chosen;
    }
    // Normalize boolean-style toggles to explicit "true"/"false" strings
    ["embedXmlInPdf", "embedXmlInHtml", "invoiceNumberingEnabled"].forEach((k) => {
      if (k in payload) {
        const v = String(payload[k]).toLowerCase();
        payload[k] = v === "true" ? "true" : "false";
      }
    });
    // Normalize aliases back to stored keys
    if ("email" in payload && !("companyEmail" in payload)) {
      payload.companyEmail = payload.email;
      delete payload.email;
    }
    if ("phone" in payload && !("companyPhone" in payload)) {
      payload.companyPhone = payload.phone;
      delete payload.phone;
    }
    if ("taxId" in payload && !("companyTaxId" in payload)) {
      payload.companyTaxId = payload.taxId;
      delete payload.taxId;
    }
    if ("countryCode" in payload && !("companyCountryCode" in payload)) {
      payload.companyCountryCode = payload.countryCode;
      delete payload.countryCode;
    }
    try {
      await backendPatch("/api/v1/settings", auth, payload);
      return new Response(null, {
        status: 303,
        headers: { Location: `/settings?section=${encodeURIComponent(sectionParam)}` },
      });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  },
};

export default function SettingsPage(props: PageProps<Data & { demoMode: boolean }>) {
  const s = props.data.settings ?? {} as Settings;
  const templates = props.data.templates ?? [] as Template[];
  const selectedTemplateId = (s.templateId as string) ||
    (templates.find((t) => t.isDefault)?.id) ||
    "minimalist-clean";
  const xmlProfileId = (s.xmlProfileId as string) || 'ubl21';
  const embedXmlInPdf = String(s.embedXmlInPdf || 'false').toLowerCase() === 'true';
  const embedXmlInHtml = String(s.embedXmlInHtml || 'false').toLowerCase() === 'true';
  // Use demoMode from backend /demo-mode route
  const demoMode = props.data.demoMode;
  // Determine current section from query param
  const url = new URL(props.url);
  const sectionParam = url.searchParams.get("section") || "company";
  const allowed = new Set([
    "company",
    "branding",
    "appearance",
    "templates",
    "payments",
    "tax",
    "numbering",
    "xml",
    "export",
  ]);
  const section = allowed.has(sectionParam) ? sectionParam : "company";
  const hasTemplates = templates.length > 0;
  const link = (key: string) => `/settings?section=${encodeURIComponent(key)}`;
  return (
    <Layout authed={props.data.authed} demoMode={demoMode} path={new URL(props.url).pathname} wide>
      <SettingsEnhancements />
      
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-semibold">Settings</h1>
      </div>

      {demoMode && (
        <div class="alert alert-warning mb-4">
          <i data-lucide="alert-triangle" class="w-5 h-5"></i>
          <div>
            <strong>Demo Mode:</strong> The database resets every 30 minutes. Your changes are not permanent.
          </div>
        </div>
      )}
      {props.data.error && (
        <div class="alert alert-error mb-4">
          <span>{props.data.error}</span>
        </div>
      )}
      
      <div class="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-4">
        <aside>
          <ul class="menu bg-base-200 rounded-box w-full">
            <li>
              <a href={link("company")} class={section === "company" ? "active" : undefined}>
                <i data-lucide="building-2" class="w-5 h-5 mr-2"></i>
                Company
              </a>
            </li>
            <li>
              <a href={link("branding")} class={section === "branding" ? "active" : undefined}>
                <i data-lucide="palette" class="w-5 h-5 mr-2"></i>
                Branding
              </a>
            </li>
            <li>
              <a href={link("appearance")} class={section === "appearance" ? "active" : undefined}>
                <i data-lucide="sun" class="w-5 h-5 mr-2"></i>
                Appearance
              </a>
            </li>
            {hasTemplates && (
              <li>
                <a href={link("templates")} class={section === "templates" ? "active" : undefined}>
                  <i data-lucide="layout-template" class="w-5 h-5 mr-2"></i>
                  Templates
                </a>
              </li>
            )}
            <li>
              <a href={link("payments")} class={section === "payments" ? "active" : undefined}>
                <i data-lucide="credit-card" class="w-5 h-5 mr-2"></i>
                Payments
              </a>
            </li>
            <li>
              <a href={link("tax")} class={section === "tax" ? "active" : undefined}>
                <i data-lucide="percent" class="w-5 h-5 mr-2"></i>
                Tax
              </a>
            </li>
            <li>
              <a href={link("numbering")} class={section === "numbering" ? "active" : undefined}>
                <i data-lucide="hash" class="w-5 h-5 mr-2"></i>
                Numbering
              </a>
            </li>
            <li>
              <a href={link("xml")} class={section === "xml" ? "active" : undefined}>
                <i data-lucide="file-code-2" class="w-5 h-5 mr-2"></i>
                XML Export
              </a>
            </li>
            <li>
              <a href={link("export")} class={section === "export" ? "active" : undefined}>
                <i data-lucide="download" class="w-5 h-5 mr-2"></i>
                Export
              </a>
            </li>
          </ul>
        </aside>
        
        <section class="space-y-4">
          {section === "company" && (
            <form method="post" class="space-y-4" data-writable>
              <h2 class="text-xl font-semibold">Company Information</h2>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="form-control">
                  <div class="label"><span class="label-text">Company Name</span></div>
                  <input name="companyName" value={(s.companyName as string) || ""} class="input input-bordered w-full" data-writable />
                </label>
                <label class="form-control">
                  <div class="label"><span class="label-text">Currency</span></div>
                  <input name="currency" value={(s.currency as string) || "USD"} class="input input-bordered w-full" data-writable />
                </label>
              </div>
              <label class="form-control">
                <div class="label"><span class="label-text">Company Address</span></div>
                <textarea name="companyAddress" class="textarea textarea-bordered" rows={2} data-writable>{(s.companyAddress as string) || ""}</textarea>
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <label class="form-control"><div class="label"><span class="label-text">Email</span></div><input name="email" value={(s.email as string) || (s.companyEmail as string) || ""} class="input input-bordered w-full" data-writable /></label>
                <label class="form-control"><div class="label"><span class="label-text">Phone</span></div><input name="phone" value={(s.phone as string) || (s.companyPhone as string) || ""} class="input input-bordered w-full" data-writable /></label>
                <label class="form-control"><div class="label"><span class="label-text">Tax ID</span></div><input name="taxId" value={(s.taxId as string) || (s.companyTaxId as string) || ""} class="input input-bordered w-full" data-writable /></label>
                <label class="form-control"><div class="label"><span class="label-text">Country Code (ISO alpha-2)</span></div><input name="countryCode" value={(s.countryCode as string) || (s.companyCountryCode as string) || ""} class="input input-bordered w-full" placeholder="e.g. US, NL, DE" maxlength={2} data-writable /></label>
              </div>
              
              <div class="flex justify-end">
                <button type="submit" class="btn btn-primary" data-writable disabled={demoMode}>
                  <i data-lucide="save" class="w-4 h-4"></i>
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {section === "branding" && (
            <form method="post" class="space-y-4" data-writable>
              <h2 class="text-xl font-semibold">Branding Settings</h2>
              
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label class="form-control">
                  <div class="label"><span class="label-text">Default Template</span></div>
                  <select name="templateId" class="select select-bordered w-full" value={selectedTemplateId}>
                    {templates.length > 0 ? (templates.map((t) => (<option value={t.id} key={t.id}>{t.name}</option>))) : (<><option value="professional-modern">Professional Modern</option><option value="minimalist-clean">Minimalist Clean</option></>)}
                  </select>
                </label>
                <label class="form-control">
                  <div class="label"><span class="label-text">Highlight Color</span></div>
                  <div class="flex items-center gap-2">
                    <input id="highlight-input" name="highlight" value={(s.highlight as string) || "#6B4EFF"} class="input input-bordered w-full" placeholder="#6B4EFF" />
                    <span id="highlight-swatch" class="inline-block w-6 h-6 rounded" style={`background: ${(s.highlight as string) || "#6B4EFF"}`}></span>
                  </div>
                </label>
              </div>
              <div class="grid grid-cols-1 gap-3 mt-2">
                <label class="form-control">
                  <div class="label"><span class="label-text">Logo</span></div>
                  <input id="logo-input" name="logo" value={(s.logo as string) || (s.logoUrl as string) || ""} class="input input-bordered w-full" placeholder="https://example.com/logo.png or data:image/png;base64,..." />
                </label>
                <label class="form-control">
                  <div class="label"><span class="label-text">Upload Logo Image</span></div>
                  <input id="logo-file" type="file" accept="image/*,.svg" class="file-input file-input-bordered w-full" />
                  <div class="label"><span class="label-text-alt">Select an image file to upload (PNG, JPG, SVG, etc.) - max 5MB</span></div>
                </label>
                <div class="flex items-center gap-3">
                  <span id="logo-error" class="text-error text-sm hidden">Invalid logo URL or data URI</span>
                  <div id="logo-preview" class="hidden">
                    <img id="logo-preview-img" class="max-h-16 max-w-32 object-contain border rounded" alt="Logo preview" />
                  </div>
                </div>
                <div id="color-suggestions" class="hidden">
                  <div class="label"><span class="label-text">Suggested accent colors from logo:</span></div>
                  <div class="flex gap-2 mt-1"></div>
                </div>
              </div>
              
              <div class="flex justify-end">
                <button type="submit" class="btn btn-primary" data-writable disabled={demoMode}>
                  <i data-lucide="save" class="w-4 h-4"></i>
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {section === "appearance" && (
            <div class="space-y-4">
              <h2 class="text-xl font-semibold">Appearance</h2>
              
              <div class="bg-base-200 rounded-box p-4">
                <h3 class="font-semibold mb-2">Theme</h3>
                <div class="flex items-center gap-3">
                  <ThemeToggle size="md" label="Toggle light/dark theme" />
                  <span class="text-sm opacity-70">Switch between Light and Dark (DaisyUI)</span>
                </div>
              </div>
            </div>
          )}

          {section === "templates" && hasTemplates && (
            <div class="space-y-4">
              <h2 class="text-xl font-semibold">Templates</h2>
              
              <div class="flex items-center justify-between mb-3">
                <div class="text-sm opacity-70">Manage your invoice templates</div>
                <InstallTemplateForm demoMode={demoMode} />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((t) => {
                  const builtIn = t.id === "professional-modern" || t.id === "minimalist-clean";
                  return (
                    <div class="card bg-base-200 shadow-sm" key={t.id}>
                      <div class="card-body p-3">
                        <div class="flex items-start justify-between">
                          <div>
                            <div class="font-medium">{t.name}</div>
                            <div class="text-xs opacity-60">{t.id}</div>
                          </div>
                          {selectedTemplateId === t.id && <span class="badge badge-primary">Default</span>}
                        </div>
                        <div class="card-actions justify-end mt-2 gap-2">
                          {selectedTemplateId !== t.id && (
                            <form method="post" data-writable>
                              <input type="hidden" name="templateId" value={t.id} />
                              <button class="btn btn-sm" type="submit" disabled={demoMode} data-writable>
                                Set default
                              </button>
                            </form>
                          )}
                          {!builtIn && t.updatable && (
                            <form method="post" data-writable>
                              <input type="hidden" name="updateTemplateId" value={t.id} />
                              <button class="btn btn-sm" type="submit" disabled={demoMode} data-writable>
                                Update
                              </button>
                            </form>
                          )}
                          {!builtIn && selectedTemplateId !== t.id && (
                            <form method="post" data-writable>
                              <input type="hidden" name="deleteTemplateId" value={t.id} />
                              <button class="btn btn-sm btn-error" type="submit" disabled={demoMode} data-writable>
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p class="text-xs opacity-60 mt-2">Built-in templates are protected and cannot be deleted. Update is available for templates installed from a manifest.</p>
            </div>
          )}

          {section === "payments" && (
            <form method="post" class="space-y-4" data-writable>
              <h2 class="text-xl font-semibold">Payment Settings</h2>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="form-control"><div class="label"><span class="label-text">Payment Methods</span></div><input name="paymentMethods" value={(s.paymentMethods as string) || "Bank Transfer"} class="input input-bordered w-full" data-writable disabled={demoMode} /></label>
                <label class="form-control"><div class="label"><span class="label-text">Bank Account</span></div><input name="bankAccount" value={(s.bankAccount as string) || ""} class="input input-bordered w-full" data-writable disabled={demoMode} /></label>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="form-control"><div class="label"><span class="label-text">Payment Terms</span></div><input name="paymentTerms" value={(s.paymentTerms as string) || "Due in 30 days"} class="input input-bordered w-full" data-writable disabled={demoMode} /></label>
                <label class="form-control"><div class="label"><span class="label-text">Default Notes</span></div><input name="defaultNotes" value={(s.defaultNotes as string) || ""} class="input input-bordered w-full" data-writable disabled={demoMode} /></label>
              </div>
              
              <div class="flex justify-end">
                <button type="submit" class="btn btn-primary" data-writable disabled={demoMode}>
                  <i data-lucide="save" class="w-4 h-4"></i>
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {section === "tax" && (
            <form method="post" class="space-y-4" data-writable>
              <h2 class="text-xl font-semibold">Tax Settings</h2>
              
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label class="form-control"><div class="label"><span class="label-text">Default tax rate (%)</span></div><input type="number" step="0.01" min="0" name="defaultTaxRate" value={String((s.defaultTaxRate as number) ?? 0)} class="input input-bordered w-full" data-writable disabled={demoMode} /></label>
                <label class="form-control"><div class="label"><span class="label-text">Prices include tax?</span></div><select name="defaultPricesIncludeTax" class="select select-bordered w-full" value={(String(s.defaultPricesIncludeTax || "false").toLowerCase() === "true") ? "true" : "false"} disabled={demoMode} data-writable><option value="false">No</option><option value="true">Yes</option></select></label>
                <label class="form-control"><div class="label"><span class="label-text">Rounding mode</span></div><select name="defaultRoundingMode" class="select select-bordered w-full" value={(s.defaultRoundingMode as string) || 'line'} disabled={demoMode} data-writable><option value="line">Round per line</option><option value="total">Round on totals</option></select></label>
              </div>
              
              <div class="flex justify-end">
                <button type="submit" class="btn btn-primary" data-writable disabled={demoMode}>
                  <i data-lucide="save" class="w-4 h-4"></i>
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {section === "numbering" && (
            <form method="post" class="space-y-4" data-writable>
              <h2 class="text-xl font-semibold">Invoice Numbering</h2>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="form-control">
                  <div class="label"><span class="label-text">Enable advanced numbering pattern</span></div>
                  <div class="flex items-center gap-3">
                    {/* Hidden field ensures a value is sent when unchecked */}
                    <input type="hidden" name="invoiceNumberingEnabled" value="false" />
                    <input type="checkbox" name="invoiceNumberingEnabled" value="true" class="toggle toggle-primary" checked={String((s.invoiceNumberingEnabled as string) ?? 'true').toLowerCase() !== 'false'} />
                    <span class="text-sm opacity-70">When off, the invoice number pattern will be ignored and legacy numbering will be used.</span>
                  </div>
                </label>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label class="form-control">
                  <div class="label"><span class="label-text">Invoice Number Pattern</span></div>
                  <input name="invoiceNumberPattern" value={(s.invoiceNumberPattern as string) || ''} class="input input-bordered w-full" placeholder="e.g. INV-{YYYY}-{SEQ} or {YYYY}{MM}{SEQ}" />
                </label>
              </div>
              <p class="text-xs mt-2 opacity-70">
                Tokens: {`{YYYY}`} full year, {`{YY}`} short year, {`{MM}`} month (01-12), {`{DD}`} day, {`{DATE}`} = {`{YYYY}{MM}{DD}`}, {`{RAND4}`} random alnum 4 chars, {`{SEQ}`} auto-incrementing sequence (resets yearly when pattern includes {`{YYYY}`} ). Leave blank to use legacy prefix/year/padding settings.
              </p>
              
              <div class="flex justify-end">
                <button type="submit" class="btn btn-primary" data-writable disabled={demoMode}>
                  <i data-lucide="save" class="w-4 h-4"></i>
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {section === "xml" && (
            <div class="space-y-4">
              <h2 class="text-xl font-semibold">XML Export Settings</h2>
              
              <form method="post" data-writable>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label class="form-control">
                    <div class="label"><span class="label-text">Default XML Profile</span></div>
                    <select name="xmlProfileId" class="select select-bordered w-full" value={xmlProfileId}>
                      <option value="ubl21">UBL 2.1 (PEPPOL BIS)</option>
                      <option value="facturx22">Factur‑X / ZUGFeRD 2.2 (BASIC)</option>
                      <option value="fatturapa">FatturaPA 1.9</option>
                    </select>
                  </label>
                  <label class="form-control">
                    <div class="label flex justify-between"><span class="label-text">Embed XML in PDF</span></div>
                    <div class="flex items-center gap-3 mt-1">
                      <input type="hidden" name="embedXmlInPdf" value="false" />
                      <input type="checkbox" name="embedXmlInPdf" value="true" class="toggle toggle-primary" checked={embedXmlInPdf} />
                      <span class="text-xs opacity-70">Adds selected XML as a PDF attachment</span>
                    </div>
                  </label>
                  <label class="form-control">
                    <div class="label flex justify-between"><span class="label-text">Embed XML in HTML</span></div>
                    <div class="flex items-center gap-3 mt-1">
                      <input type="hidden" name="embedXmlInHtml" value="false" />
                      <input type="checkbox" name="embedXmlInHtml" value="true" class="toggle toggle-primary" checked={embedXmlInHtml} />
                      <span class="text-xs opacity-70">Adds selected XML as an HTML attachment</span>
                    </div>
                  </label>
                </div>
                
                <div class="flex justify-end">
                  <button type="submit" class="btn btn-primary" data-writable disabled={demoMode}>
                    <i data-lucide="save" class="w-4 h-4"></i>
                    Save Changes
                  </button>
                </div>
              </form>
              
              <div class="bg-base-200 rounded-box p-3">
                <p class="text-xs opacity-70">Profiles are currently built-in only. UBL 2.1 is the default and preferred for e-invoicing networks (PEPPOL). The stub profile is for internal testing.</p>
              </div>
            </div>
          )}

          {section === "export" && (
            <ExportAll />
          )}
        </section>
      </div>
    </Layout>
  );
}
