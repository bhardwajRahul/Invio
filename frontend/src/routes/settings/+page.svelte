<script lang="ts">
  import { Settings, Save, AlertCircle, Building2, Palette, Sun, Languages, LayoutTemplate, CreditCard, Percent, Package, Hash, FileCode2 } from "lucide-svelte";
  import { getContext } from "svelte";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import TaxDefinitionsManager from "./components/TaxDefinitionsManager.svelte";
  import ProductOptionsManager from "./components/ProductOptionsManager.svelte";
  import TemplateOptionsManager from "./components/TemplateOptionsManager.svelte";
  import BrandingManager from "./components/BrandingManager.svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let initialSettings = $derived(data.settings || {});
  let settings = $state({} as any);
  let saving = $state(false);
  let error = $state("");
  let success = $state("");
  let xmlProfiles = $derived((data.xmlProfiles || []) as Array<{ id: string; name: string }>);

  let section = $derived(page.url.searchParams.get("section") || "company");
  let canUpdateSettings = $derived(true); // TODO: user permissions

  $effect(() => {
    if (Object.keys(settings).length === 0) {
      settings = { ...initialSettings };
    }
  });

  async function saveSettings(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    error = "";
    success = "";
    
    try {
      const res = await fetch("/api/v1/settings", {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(settings)
      });
      
      if (!res.ok) throw new Error(t("Failed to save settings"));
      
      success = t("Settings updated successfully");
      invalidateAll();
    } catch (err: any) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  const sections = [
    { id: "company", label: "Company", icon: Building2 },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "appearance", label: "Appearance", icon: Sun },
    { id: "localization", label: "Localization", icon: Languages },
    { id: "templates", label: "Templates", icon: LayoutTemplate, condition: () => data.hasTemplates },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "tax", label: "Tax", icon: Percent },
    { id: "products", label: "Products", icon: Package },
    { id: "numbering", label: "Numbering", icon: Hash },
    { id: "xml", label: "XML Export", icon: FileCode2 }
  ];

  function getSectionUrl(id: string) {
    const url = new URL(page.url);
    url.searchParams.set("section", id);
    return url.toString();
  }
</script>

<div class="mb-4">
  <h1 class="text-2xl font-semibold">{t("Settings")}</h1>
</div>

{#if data.demoMode}
  <div class="alert alert-warning mb-4">
    <AlertCircle size={20} />
    <div>{t("Demo mode warning")}</div>
  </div>
{/if}

{#if error || data.error}
  <div class="alert alert-error mb-4">
    <AlertCircle size={20} />
    <span>{error || data.error}</span>
  </div>
{/if}

{#if success}
  <div class="alert alert-success mb-4">
    <span>{success}</span>
  </div>
{/if}

<div class="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-6">
  <aside class="hidden md:block">
    <ul class="menu bg-base-200 rounded-box w-full p-2 gap-1">
      {#each sections.filter(s => s.condition ? s.condition() : true) as s}
        <li>
          <a href={getSectionUrl(s.id)} class={section === s.id ? "active" : ""}>
            <s.icon size={20} class="mr-2" />
            {t(s.label)}
          </a>
        </li>
      {/each}
    </ul>
  </aside>
  
  <div class="md:hidden">
    <select class="select select-bordered w-full" onchange={(e) => window.location.href = getSectionUrl(e.currentTarget.value)}>
       {#each sections.filter(s => s.condition ? s.condition() : true) as s}
        <option value={s.id} selected={section === s.id}>{t(s.label)}</option>
       {/each}
    </select>
  </div>

  <section class="space-y-4">
    {#if !canUpdateSettings}
      <div class="alert alert-warning mb-4">
        <AlertCircle size={16} />
        <span>{t("You do not have permission to modify settings.")}</span>
      </div>
    {/if}

    {#if section === "tax"}
      <form onsubmit={saveSettings} class="space-y-6 max-w-4xl bg-base-100 p-6 rounded-box border border-base-200 mb-6">
        <h2 class="text-xl font-semibold">{t("Tax Settings")}</h2>
        <label class="form-control"><div class="label"><span class="label-text">{t("Tax Label")}</span></div>
          <input type="text" class="input input-bordered w-full" bind:value={settings.taxLabel} disabled={!canUpdateSettings} />
        </label>
        <label class="form-control"><div class="label"><span class="label-text">{t("Default Tax Rate")}</span></div>
          <input type="number" class="input input-bordered w-full" bind:value={settings.defaultTaxRate} disabled={!canUpdateSettings} step="0.01" />
        </label>
        <label class="label cursor-pointer justify-start gap-4">
          <input type="checkbox" class="checkbox" bind:checked={settings.defaultPricesIncludeTax} disabled={!canUpdateSettings} />
          <span class="label-text">{t("Default Prices Include Tax")}</span>
        </label>
        <label class="form-control"><div class="label"><span class="label-text">{t("Rounding Mode")}</span></div>
          <input type="text" class="input input-bordered w-full" bind:value={settings.defaultRoundingMode} disabled={!canUpdateSettings} />
        </label>
        <div class="flex justify-end pt-4"><button type="submit" class="btn btn-primary" disabled={saving || !canUpdateSettings}><Save size={18} /> {t("Save Settings")}</button></div>
      </form>
      <div class="max-w-4xl bg-base-100 p-6 rounded-box border border-base-200">
        <TaxDefinitionsManager taxDefinitions={data.taxDefinitions} demoMode={data.demoMode} />
      </div>
    {:else if section === "products"}
      <div class="max-w-4xl bg-base-100 p-6 rounded-box border border-base-200">
        <ProductOptionsManager productCategories={data.productCategories} productUnits={data.productUnits} demoMode={data.demoMode} />
      </div>
    {:else if section === "templates"}
      <div class="max-w-4xl bg-base-100 p-6 rounded-box border border-base-200">
        <TemplateOptionsManager templates={data.templates} demoMode={data.demoMode} />
      </div>
    {:else if section !== "templates" && section !== "products" && section !== "tax"}
      <form onsubmit={saveSettings} class="space-y-6 max-w-4xl bg-base-100 p-6 rounded-box border border-base-200">
        {#if section === "company"}
          <div class="space-y-4">
            <h2 class="text-xl font-semibold">{t("Company Information")}</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="form-control"><div class="label"><span class="label-text">{t("Company Name")}</span></div>
                <input type="text" class="input input-bordered w-full" bind:value={settings.companyName} disabled={!canUpdateSettings} />
              </label>
              <label class="form-control"><div class="label"><span class="label-text">{t("Currency")}</span></div>
                <input type="text" class="input input-bordered w-full" bind:value={settings.currency} disabled={!canUpdateSettings} />
              </label>
            </div>
            <label class="form-control"><div class="label"><span class="label-text">{t("Company Address")}</span></div>
              <textarea class="textarea textarea-bordered w-full" bind:value={settings.companyAddress} disabled={!canUpdateSettings}></textarea>
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="form-control"><div class="label"><span class="label-text">{t("City")}</span></div>
                <input type="text" class="input input-bordered w-full" bind:value={settings.companyCity} disabled={!canUpdateSettings} />
              </label>
              <label class="form-control"><div class="label"><span class="label-text">{t("Postal Code")}</span></div>
                <input type="text" class="input input-bordered w-full" bind:value={settings.companyPostalCode} disabled={!canUpdateSettings} />
              </label>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="form-control"><div class="label"><span class="label-text">{t("Email")}</span></div>
                <input type="email" class="input input-bordered w-full" bind:value={settings.email} disabled={!canUpdateSettings} />
              </label>
              <label class="form-control"><div class="label"><span class="label-text">{t("Phone")}</span></div>
                <input type="text" class="input input-bordered w-full" bind:value={settings.phone} disabled={!canUpdateSettings} />
              </label>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="form-control"><div class="label"><span class="label-text">{t("Tax ID")}</span></div>
                <input type="text" class="input input-bordered w-full" bind:value={settings.taxId} disabled={!canUpdateSettings} />
              </label>
              <label class="form-control"><div class="label"><span class="label-text">{t("Country Code")}</span></div>
                <input type="text" class="input input-bordered w-full" bind:value={settings.countryCode} disabled={!canUpdateSettings} placeholder="US" />
              </label>
            </div>
          </div>

        {:else if section === "branding"}
          <BrandingManager {settings} templates={data.templates} {canUpdateSettings} />
        {:else if section === "appearance"}
          <div class="space-y-4">
            <h2 class="text-xl font-semibold">{t("Appearance")}</h2>
            <p>{t("Adjust the look and feel of the application.")}</p>
            <ThemeToggle />
          </div>

        {:else if section === "localization"}
          <div class="space-y-4">
            <h2 class="text-xl font-semibold">{t("Localization")}</h2>
            <label class="form-control"><div class="label"><span class="label-text">{t("Language")}</span></div>
              <select name="locale" class="select select-bordered w-full" bind:value={settings.locale} disabled={!canUpdateSettings}>
                <option value="en">{t("English")}</option>
                <option value="nl">{t("Nederlands")}</option>
                <option value="de">{t("Deutsch")}</option>
              </select>
            </label>
            <label class="form-control"><div class="label"><span class="label-text">{t("Date Format")}</span></div>
              <input type="text" class="input input-bordered w-full" bind:value={settings.dateFormat} disabled={!canUpdateSettings} placeholder="MM/DD/YYYY" />
            </label>
            <label class="form-control"><div class="label"><span class="label-text">{t("Number Format")}</span></div>
              <input type="text" class="input input-bordered w-full" bind:value={settings.numberFormat} disabled={!canUpdateSettings} placeholder="1,000.00" />
            </label>
          </div>

        {:else if section === "payments"}
          <div class="space-y-4">
            <h2 class="text-xl font-semibold">{t("Payments & Texts")}</h2>
            <label class="form-control"><div class="label"><span class="label-text">{t("Payment Methods")}</span></div>
              <textarea class="textarea textarea-bordered w-full" bind:value={settings.paymentMethods} disabled={!canUpdateSettings}></textarea>
            </label>
            <label class="form-control"><div class="label"><span class="label-text">{t("Bank Account")}</span></div>
              <textarea class="textarea textarea-bordered w-full" bind:value={settings.bankAccount} disabled={!canUpdateSettings}></textarea>
            </label>
            <label class="form-control"><div class="label"><span class="label-text">{t("Payment Terms")}</span></div>
              <textarea class="textarea textarea-bordered w-full" bind:value={settings.paymentTerms} disabled={!canUpdateSettings}></textarea>
            </label>
            <label class="form-control"><div class="label"><span class="label-text">{t("Default Notes")}</span></div>
              <textarea class="textarea textarea-bordered w-full" bind:value={settings.defaultNotes} disabled={!canUpdateSettings}></textarea>
            </label>
          </div>

        {:else if section === "numbering"}
          <div class="space-y-4">
             <h2 class="text-xl font-semibold">{t("Numbering")}</h2>
             <label class="label cursor-pointer justify-start gap-4">
               <input type="checkbox" class="checkbox" bind:checked={settings.invoiceNumberingEnabled} disabled={!canUpdateSettings} />
               <span class="label-text">{t("Enable Automatic Invoice Numbering")}</span>
             </label>
             <label class="form-control"><div class="label"><span class="label-text">{t("Invoice Number Pattern")}</span></div>
               <input type="text" class="input input-bordered w-full" bind:value={settings.invoiceNumberPattern} disabled={!canUpdateSettings} placeholder={"INV-{YYYY}-{SEQ}"} />
               <div class="mt-2 text-xs opacity-70 space-y-1">
                 <p>{t("Available placeholders")}:</p>
                 <p><code>{"{SEQ}"}</code> (sequential, recommended), <code>{"{YYYY}"}</code>, <code>{"{YY}"}</code>, <code>{"{MM}"}</code>, <code>{"{DD}"}</code>, <code>{"{DATE}"}</code>, <code>{"{RAND4}"}</code></p>
               </div>
             </label>
          </div>

        {:else if section === "xml"}
          <div class="space-y-4">
             <h2 class="text-xl font-semibold">{t("XML Export")}</h2>
             <label class="form-control"><div class="label"><span class="label-text">{t("XML Profile ID")}</span></div>
               <select class="select select-bordered w-full" bind:value={settings.xmlProfileId} disabled={!canUpdateSettings}>
                 {#if xmlProfiles.length > 0}
                   {#each xmlProfiles as profile}
                     <option value={profile.id}>{profile.name} ({profile.id})</option>
                   {/each}
                 {:else}
                   <option value="ubl21">UBL 2.1 (PEPPOL BIS Billing 3.0) (ubl21)</option>
                   <option value="facturx22">Factur-X / ZUGFeRD 2.2 (EN 16931) (facturx22)</option>
                   <option value="fatturapa">FatturaPA (Italian eInvoice) (fatturapa)</option>
                 {/if}
               </select>
             </label>
             <label class="label cursor-pointer justify-start gap-4">
               <input type="checkbox" class="checkbox" bind:checked={settings.embedXmlInPdf} disabled={!canUpdateSettings} />
               <span class="label-text">{t("Embed XML in PDF")}</span>
             </label>
             <label class="label cursor-pointer justify-start gap-4">
               <input type="checkbox" class="checkbox" bind:checked={settings.embedXmlInHtml} disabled={!canUpdateSettings} />
               <span class="label-text">{t("Embed XML in HTML")}</span>
             </label>
          </div>
        {/if}

        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-base-200">
          <button type="submit" class="btn btn-primary" disabled={saving || !canUpdateSettings}>
            {#if saving}
              <span class="loading loading-spinner loading-sm"></span>
            {:else}
              <Save size={18} />
            {/if}
            {t("Save Settings")}
          </button>
        </div>
      </form>
    {/if}
  </section>
</div>



