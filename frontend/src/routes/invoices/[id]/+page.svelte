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
        <span class="badge {invoice.status === 'paid' ? 'badge-success' : invoice.status === 'complete' ? 'badge-secondary' : invoice.status === 'voided' ? 'badge-warning' : isOverdue && invoice?.status !== 'paid' && invoice?.status !== 'complete' ? 'badge-error' : invoice.status === 'sent' ? 'badge-info' : ''}">
          {invoice.status === "voided" ? t("Voided") : invoice.status === "complete" ? t("Complete") : isOverdue && invoice?.status !== "paid" && invoice?.status !== "complete" ? t("Overdue") : t(invoice?.status === "draft" ? "Draft" : invoice?.status === "sent" ? "Sent" : invoice?.status === "paid" ? "Paid" : "Overdue")}
        </span>
      {/if}
    </div>

    <!-- Hidden forms for dropdown actions -->
    <form id="inv-duplicate" method="post" class="hidden" use:enhance><input type="hidden" name="intent" value="duplicate" /></form>
    <form id="inv-unpublish" method="post" class="hidden" use:enhance><input type="hidden" name="intent" value="unpublish" /></form>
    <form id="inv-mark-sent" method="post" class="hidden" use:enhance><input type="hidden" name="intent" value="mark-sent" /></form>
    <form id="inv-mark-complete" method="post" class="hidden" use:enhance><input type="hidden" name="intent" value="mark-complete" /></form>
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

        {#if invoice.status === "paid" && canUpdate}
          <form method="post" use:enhance>
            <input type="hidden" name="intent" value="mark-complete" />
            <button type="submit" class="btn btn-sm btn-secondary" title={t("Mark as Complete")}>
              <CheckCircle size={16} />
              <span class="hidden sm:inline">{t("Mark as Complete")}</span>
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
          <ul tabindex="-1" class="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-2 w-56 p-2 shadow border border-base-200">
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
            {#if invoice.status === "paid" && canUpdate}
              <li>
                <button type="submit" form="inv-mark-complete" class="flex items-center gap-2 py-2">
                  <CheckCircle size={16} /> {t("Mark as Complete")}
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
  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm mt-6 mb-8">
    <div class="space-y-4">
      <div><span class="opacity-70 mr-1">{t("Customer")}:</span> {invoice.customer?.name || t("Unknown Customer")}</div>
      <div class="flex gap-1"><span class="opacity-70 mr-1">{t("Address")}:</span> 
        <div class="whitespace-pre-line">
          {#if invoice.customer?.address || invoice.customer?.city}
            {[invoice.customer?.address, `${invoice.customer?.postalCode || ""} ${invoice.customer?.city || ""}`.trim()].filter(Boolean).join("\n")}
            {#if invoice.customer?.countryCode}
              <br/>{invoice.customer.countryCode}
            {/if}
          {/if}
        </div>
      </div>
      <div><span class="opacity-70 mr-1">{t("Issue Date")}:</span> {fmtDate(invoice.issueDate) || "-"}</div>
      <div class="mt-4"><span class="opacity-70 mr-1">{t("Subtotal")}:</span> {fmtMoney(invoice.subtotal)}</div>
      
      <div class="text-xs opacity-60 flex flex-wrap gap-1">
        {t("Tax rate")}: {invoice.taxRate}% - 
        {t("Prices include tax")}: {invoice.pricesIncludeTax ? t("Yes") : t("No")} - 
        {t("Rounding")}: {t("Round per line")} - 
        {t("Tax mode")}: {invoice.taxes?.length ? t("Per line") : t("Invoice total")}
      </div>
      
      <div class="mt-4"><span class="opacity-70 mr-1">{t("Total")}:</span> <span class="font-bold">{fmtMoney(invoice.total)}</span></div>
      <div><span class="opacity-70 mr-1">{t("Payment Terms")}:</span> <span class="font-medium">{invoice.paymentTerms || "-"}</span></div>
      
      <div class="pt-2 opacity-70">
        {invoice.items?.length || 0} {t("item(s)")}
      </div>

      <div class="flex flex-wrap gap-2 pt-4">
        <a class="btn btn-sm btn-outline" href="/api/v1/invoices/{invoice.id}/html" target="_blank">
          <FileCode2 size={16} />
          {t("View HTML")}
        </a>
        <a class="btn btn-sm btn-primary" href="/api/v1/invoices/{invoice.id}/pdf" target="_blank">
          <Download size={16} />
          {t("Download PDF")}
        </a>
        {#if invoice.status && invoice.status !== "draft" && invoice.shareToken}
          <a class="btn btn-sm btn-outline" href="/public/invoices/{invoice.shareToken}" target="_blank">
            <ExternalLink size={16} />
            {t("View public link")}
          </a>
        {/if}
      </div>
    </div>

    <div class="space-y-4">
      <div><span class="opacity-70 mr-1">{t("Email")}:</span> {invoice.customer?.email || ""}</div>
      <div class="mt-4"><span class="opacity-70 mr-1">{t("Due Date")}:</span> {fmtDate(invoice.dueDate) || "-"}</div>
      <div><span class="opacity-70 mr-1">{t("Tax")}:</span> {fmtMoney(invoice.taxAmount)}</div>
      <div><span class="opacity-70 mr-1">{t("Discount")}:</span> {fmtMoney(invoice.discountAmount)}</div>
    </div>
  </div>

  {#if invoice.items && invoice.items.length > 0}
    <div class="mt-8">
      <div class="bg-base-100 rounded-box border border-base-200 overflow-hidden shadow-sm">
        <table class="table table-sm sm:table-md w-full">
          <thead class="bg-base-200/50">
            <tr>
              <th>{t("Description")}</th>
              <th class="text-right">{t("Qty")}</th>
              <th class="text-right">{t("Price")}</th>
              <th class="text-right">{t("Total")}</th>
            </tr>
          </thead>
          <tbody>
            {#each invoice.items as item}
              <tr>
                <td class="whitespace-pre-wrap">{item.description || t("Item")}</td>
                <td class="text-right">{item.quantity}</td>
                <td class="text-right">{fmtMoney(item.unitPrice)}</td>
                <td class="text-right font-medium">{fmtMoney(item.quantity * item.unitPrice)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
{/if}
