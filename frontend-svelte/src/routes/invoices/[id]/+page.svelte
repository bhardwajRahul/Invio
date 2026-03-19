<script lang="ts">
  import { getContext } from "svelte";
  import { 
    FileText, Edit, Copy, ExternalLink, Download, ArrowLeft, MoreHorizontal, 
    FileCode2, ShieldOff, Send, Ban, Trash2, CheckCircle, Upload, Check, Pencil 
  } from "lucide-svelte";
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";

  import { hasPermission } from "$lib/types";

  let { data, form } = $props();
  let t = getContext("i18n") as (key: string) => string;
  let loc = getContext("localization") as any;

  let invoice = $derived(data.invoice);
  let showPublishedBanner = $derived(data.showPublishedBanner);
  let user = $derived(data.user);

  let isOverdue = $derived.by(() => {
    if (!invoice) return false;
    if (invoice.status === "paid" || invoice.status === "voided") return false;
    const due = invoice.dueDate ? new Date(invoice.dueDate as string) : null;
    if (!due) return false;
    const today = new Date();
    const dueDateObj = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dueDateObj.valueOf() < todayObj.valueOf();
  });

  let canUpdate = $derived(hasPermission(user, "invoices", "update"));
  let canDelete = $derived(hasPermission(user, "invoices", "delete"));
  let canPublish = $derived(hasPermission(user, "invoices", "publish"));
  let canVoid = $derived(hasPermission(user, "invoices", "void"));

  function fmtDate(d?: string | Date) {
    if (!d) return "";
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return "";
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    if (loc?.dateFormat === "DD.MM.YYYY") {
      return `${day}.${month}.${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  function fmtMoney(v?: number) {
    return `${Number(v||0).toFixed(2)} ${invoice?.currency || "EUR"}`;
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/public/invoices/${invoice.shareToken}`);
    alert(t("Link copied!"));
  }

  function confirmAction(message: string): SubmitFunction {
    return ({ cancel }) => {
      if (!confirm(message)) cancel();
    };
  }
</script>

<div class="mb-6">
  {#if form?.error}
    <div class="alert alert-error mb-4 shadow text-sm sm:text-base">
      <div class="flex-1 overflow-hidden">
        <div class="font-medium">{form.error}</div>
      </div>
    </div>
  {/if}

  {#if showPublishedBanner && invoice?.shareToken}
    <div class="alert alert-success mb-4 shadow text-sm sm:text-base">
      <CheckCircle size={20} />
      <div class="flex-1 overflow-hidden">
        <div class="font-medium">{t("Invoice published")}</div>
        <div class="text-sm opacity-80 break-all truncate">
          {t("Public link")}: 
          <a class="link" href="/public/invoices/{invoice.shareToken}" target="_blank">
            {window?.location?.origin}/public/invoices/{invoice.shareToken}
          </a>
        </div>
      </div>
      <div class="flex gap-2 shrink-0">
        <a class="btn btn-xs sm:btn-sm btn-ghost" target="_blank" href="/public/invoices/{invoice.shareToken}">
          {t("Open")}
        </a>
        <button type="button" class="btn btn-xs sm:btn-sm" onclick={copyLink}>
          {t("Copy link")}
        </button>
        <a class="btn btn-xs sm:btn-sm btn-primary" href="/api/v1/invoices/{invoice.id}/pdf" target="_blank">
          {t("Download PDF")}
        </a>
      </div>
    </div>
  {/if}

  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
    <div class="flex items-center gap-3">
      <a href="/invoices" class="btn btn-ghost btn-circle btn-sm">
        <ArrowLeft size={20} />
      </a>
      <h1 class="text-2xl font-semibold flex items-center gap-2">
        {t("Invoice #")} {invoice?.invoiceNumber || invoice?.id}
      </h1>
      {#if invoice?.status}
        <span class="badge {invoice.status === 'paid' ? 'badge-success' : invoice.status === 'voided' ? 'badge-warning' : isOverdue && invoice?.status !== 'paid' ? 'badge-error' : invoice.status === 'sent' ? 'badge-info' : ''}">
          {invoice.status === "voided" ? t("Voided") : isOverdue && invoice?.status !== "paid" ? t("Overdue") : t(invoice?.status === "draft" ? "Draft" : invoice?.status === "sent" ? "Sent" : invoice?.status === "paid" ? "Paid" : "Overdue")}
        </span>
      {/if}
    </div>

    <!-- Hidden forms for dropdown actions -->
    <form id="inv-duplicate" method="post" class="hidden" use:enhance><input type="hidden" name="intent" value="duplicate" /></form>
    <form id="inv-unpublish" method="post" class="hidden" use:enhance><input type="hidden" name="intent" value="unpublish" /></form>
    <form id="inv-mark-sent" method="post" class="hidden" use:enhance><input type="hidden" name="intent" value="mark-sent" /></form>
    <form id="inv-void" method="post" class="hidden" use:enhance={confirmAction(t("Void this invoice?"))}><input type="hidden" name="intent" value="void" /></form>
    <form id="inv-delete" method="post" class="hidden" use:enhance={confirmAction(t("Delete this invoice? This cannot be undone."))}><input type="hidden" name="intent" value="delete" /></form>

    {#if invoice}
      <div class="flex items-center gap-2 flex-wrap">
        {#if invoice.status === "draft" && !isOverdue && canUpdate}
          <a href="/invoices/{invoice.id}/edit" class="btn btn-sm">
            <Pencil size={16} />
            <span class="hidden sm:inline">{t("Edit")}</span>
          </a>
        {/if}

        {#if invoice.status === "draft" && canPublish}
          <form method="post" use:enhance>
            <input type="hidden" name="intent" value="publish" />
            <button type="submit" class="btn btn-sm btn-success" title={t("Make public and mark as sent")}>
              <Upload size={16} />
              <span class="hidden sm:inline">{t("Publish")}</span>
            </button>
          </form>
        {/if}

        {#if (invoice.status === "sent" || invoice.status === "overdue") && canUpdate}
          <form method="post" use:enhance>
            <input type="hidden" name="intent" value="mark-paid" />
            <button type="submit" class="btn btn-sm btn-primary" title={t("Mark as Paid")}>
              <Check size={16} />
              <span class="hidden sm:inline">{t("Mark as Paid")}</span>
            </button>
          </form>
        {/if}

        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
            <MoreHorizontal size={16} />
            <span class="hidden sm:inline">{t("More")}</span>
          </div>
          <ul tabindex="-1" class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-2 w-56 p-2 shadow border border-base-200">
            <li>
              <button type="submit" form="inv-duplicate" class="flex items-center gap-2 py-2">
                <Copy size={16} /> {t("Duplicate")}
              </button>
            </li>
            <li>
              <a href="/api/v1/invoices/{invoice.id}/xml" target="_blank" title={t("Download XML")} class="flex items-center gap-2 py-2">
                <FileText size={16} /> {t("Download XML")}
              </a>
            </li>
            <div class="divider my-0 py-0"></div>
            {#if (invoice.status === "sent" || invoice.status === "overdue") && canPublish}
              <li>
                <button type="submit" form="inv-unpublish" class="flex items-center gap-2 py-2">
                  <ShieldOff size={16} /> {t("Unpublish")}
                </button>
              </li>
            {/if}
            {#if invoice.status === "draft" && canUpdate}
              <li>
                <button type="submit" form="inv-mark-sent" class="flex items-center gap-2 py-2">
                  <Send size={16} /> {t("Mark as Sent")}
                </button>
              </li>
            {/if}
            {#if (invoice.status === "sent" || invoice.status === "overdue") && canVoid}
              <li>
                <button type="submit" form="inv-void" class="flex items-center gap-2 py-2 text-warning">
                  <Ban size={16} /> {t("Void Invoice")}
                </button>
              </li>
            {/if}
            {#if (invoice.status === "draft" || invoice.status === "voided") && canDelete}
              <li>
                <button type="submit" form="inv-delete" class="flex items-center gap-2 py-2 text-error">
                  <Trash2 size={16} /> {t("Delete")}
                </button>
              </li>
            {/if}
          </ul>
        </div>
      </div>
    {/if}
  </div>
</div>

{#if invoice}
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="md:col-span-2 space-y-6">
      <div class="bg-base-100 p-6 rounded-box border border-base-200 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <div class="text-sm opacity-70 font-medium mb-2 uppercase tracking-wide">{t("Billed To")}</div>
            <div class="text-lg font-semibold">{invoice.customer?.name || t("Unknown Customer")}</div>
            {#if invoice.customer?.email}
              <div class="opacity-80 mt-1">{invoice.customer.email}</div>
            {/if}
            {#if invoice.customer?.address || invoice.customer?.city}
              <div class="mt-3 opacity-80 text-sm leading-relaxed whitespace-pre-line">
                {[invoice.customer?.address, `${invoice.customer?.postalCode || ""} ${invoice.customer?.city || ""}`].filter(Boolean).join("\n")}
                {invoice.customer?.countryCode ? `\n${invoice.customer.countryCode}` : ""}
              </div>
            {/if}
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between items-center border-b border-base-200 pb-2">
              <span class="opacity-70">{t("Issue Date")}</span>
              <span class="font-medium">{fmtDate(invoice.issueDate) || "-"}</span>
            </div>
            <div class="flex justify-between items-center border-b border-base-200 pb-2">
              <span class="opacity-70">{t("Due Date")}</span>
              <div class="font-medium flex items-center gap-2">
                {fmtDate(invoice.dueDate) || "-"}
                {#if isOverdue && invoice.status !== "paid"}
                  <div class="badge badge-error badge-sm" title={t("This invoice is past its due date")}>!</div>
                {/if}
              </div>
            </div>
            {#if typeof invoice.taxRate === "number"}
               <div class="flex justify-between items-center border-b border-base-200 pb-2">
                <span class="opacity-70">{t("Tax Rate")}</span>
                <span class="font-medium">{invoice.taxRate}%</span>
              </div>
            {/if}
            <div class="flex justify-between items-center pb-1 pt-1">
              <span class="opacity-70">{t("Payment Terms")}</span>
              <span class="font-medium text-right max-w-[60%]">{invoice.paymentTerms || "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-base-100 p-6 rounded-box border border-base-200 shadow-sm">
        <div class="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
           <div>
              <div class="text-sm opacity-70 font-medium mb-1 uppercase tracking-wide">{t("Amount Due")}</div>
              <div class="text-3xl font-bold">{fmtMoney(invoice.total)}</div>
           </div>
           
           <div class="w-full sm:w-64 space-y-2 text-sm mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-base-200">
             <div class="flex justify-between">
                <span class="opacity-70">{t("Subtotal")}</span>
                <span class="font-medium">{fmtMoney(invoice.subtotal)}</span>
             </div>
             {#if invoice.discountAmount}
                <div class="flex justify-between text-success">
                  <span class="opacity-70">{t("Discount")}</span>
                  <span class="font-medium">-{fmtMoney(invoice.discountAmount)}</span>
                </div>
             {/if}
             <div class="flex justify-between">
                <span class="opacity-70">{t("Tax")}</span>
                <span class="font-medium">{fmtMoney(invoice.taxAmount)}</span>
             </div>
             <div class="divider my-1"></div>
             <div class="flex justify-between text-lg font-bold">
                <span>{t("Total")}</span>
                <span>{fmtMoney(invoice.total)}</span>
             </div>
           </div>
        </div>
      </div>
    </div>

    <div class="space-y-6">
      {#if invoice.items && invoice.items.length > 0}
         <div class="bg-base-100 p-6 rounded-box border border-base-200 shadow-sm">
           <h3 class="font-medium mb-4 flex items-center justify-between">
             {t("Line Items")}
             <span class="badge badge-neutral badge-sm">{invoice.items.length}</span>
           </h3>
           <div class="space-y-3">
             {#each invoice.items as item}
               <div class="text-sm border-l-2 border-primary pl-3 py-1">
                 <div class="font-medium">{item.description || t("Item")}</div>
                 <div class="flex gap-2 text-xs opacity-70 mt-1">
                   <span>{item.quantity} × {fmtMoney(item.unitPrice)}</span>
                 </div>
               </div>
             {/each}
           </div>
         </div>
      {/if}

      <div class="bg-base-100 p-6 rounded-box border border-base-200 shadow-sm">
        <h3 class="font-medium mb-4">{t("Quick Actions")}</h3>
        <div class="flex flex-col gap-2">
          <a class="btn btn-sm btn-outline justify-start" href="/api/v1/invoices/{invoice.id}/html" target="_blank">
            <FileCode2 size={16} />
            {t("View HTML format")}
          </a>
          <a class="btn btn-sm btn-primary justify-start" href="/api/v1/invoices/{invoice.id}/pdf">
            <Download size={16} />
            {t("Download PDF")}
          </a>
          {#if invoice.status && invoice.status !== "draft" && invoice.shareToken}
            <a class="btn btn-sm justify-start" href="/public/invoices/{invoice.shareToken}" target="_blank">
              <ExternalLink size={16} />
              {t("Open Public Portal")}
            </a>
          {/if}
        </div>
        <div class="mt-4 text-xs opacity-60">
           {t("Tax mode")}: {invoice.taxes?.length ? t("Per line") : t("Invoice total")} <br/>
           {t("Prices include tax")}: {invoice.pricesIncludeTax ? t("Yes") : t("No")}
        </div>
      </div>
    </div>
  </div>
{/if}
