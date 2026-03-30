
<script lang="ts">
  import { getContext } from "svelte";
  import { Download, FileText, ChevronDown, ExternalLink } from "lucide-svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let token = $derived(data.token);
  let htmlUrl = $derived(`/api/v1/public/invoices/${token}/html`);
  let pdfUrl = $derived(`/api/v1/public/invoices/${token}/pdf`);
  let ublUrl = $derived(`/api/v1/public/invoices/${token}/ubl.xml`);
  let xmlUblUrl = $derived(`/api/v1/public/invoices/${token}/xml?profile=ubl21`);
  let xmlFxUrl = $derived(`/api/v1/public/invoices/${token}/xml?profile=facturx22`);
</script>

<div class="flex-1 flex flex-col min-h-screen bg-base-200/40 relative pb-10">
  <!-- Minimal Header -->
  <header class="py-8 px-4 md:px-8 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-6">
    <div class="flex items-center gap-2">
      <span class="text-3xl font-light tracking-tight text-base-content/80">{t("Invoice")}</span>
    </div>
    
    <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-base-100 p-2 rounded-full shadow-sm border border-base-200/60">
      
      <div class="dropdown dropdown-end">
        <div tabIndex="-1" role="button" class="btn btn-sm btn-ghost rounded-full px-4 font-normal text-base-content/80 hover:bg-base-200/50">
          <FileText size={16} class="mr-1 opacity-70" />
          <span class="hidden sm:inline">{t("XML Data")}</span>
          <span class="sm:hidden">{t("XML")}</span>
          <ChevronDown size={14} class="ml-1 opacity-70" />
        </div>
        <ul tabIndex="-1" class="menu menu-sm dropdown-content bg-base-100 rounded-xl z-[1] mt-2 w-56 p-2 shadow-lg border border-base-200">
          <li class="menu-title px-4 py-2 text-xs font-semibold text-base-content/50 uppercase tracking-wider">{t("Format")}</li>
          <li><a href={ublUrl} class="py-2.5 rounded-lg">{t("Standard UBL XML")}</a></li>
          <li><a href={xmlUblUrl} class="py-2.5 rounded-lg">{t("UBL 2.1 (PEPPOL)")}</a></li>
          <li><a href={xmlFxUrl} class="py-2.5 rounded-lg">{t("FacturX / ZUGFeRD 2.2")}</a></li>
        </ul>
      </div>

      <div class="w-px h-6 bg-base-200"></div>
      
      <a class="btn btn-sm btn-ghost btn-circle text-base-content/80 hover:bg-base-200/50 tooltip tooltip-bottom" href={htmlUrl} target="_blank" data-tip={t("Open in new tab")}>
        <ExternalLink size={16} />
      </a>

      <a class="btn btn-sm btn-primary rounded-full px-6 shadow-sm font-medium ml-1" href={pdfUrl}>
        <Download size={16} class="mr-1" />
        {t("Download PDF")}
      </a>
    </div>
  </header>

  <!-- Document Container -->
  <main class="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col">
    <div class="w-full bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden flex-1 flex flex-col relative" style="min-height: 75vh;">
      <iframe
        src={htmlUrl}
        title="Invoice Document"
        class="w-full h-full absolute inset-0 border-0 bg-white"
      ></iframe>
    </div>
  </main>
</div>

