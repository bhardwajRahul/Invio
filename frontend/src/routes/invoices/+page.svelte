<script lang="ts">
  import { ShieldOff, SquarePen } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();

  let t = getContext("i18n") as (key: string) => string;
  let numberFormat = $derived(data.localization?.numberFormat || "comma");
  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some(p => p.resource === "invoices" && p.action === "create"));
  let canViewCustomers = $derived(user?.isAdmin || user?.permissions?.some(p => p.resource === "customers" && p.action === "read"));

  function fmtMoney(cur: string | undefined, n: number) {
    if (!cur) cur = "USD";
    try {
      const locale = numberFormat === "period" ? "de-DE" : "en-US";
      return new Intl.NumberFormat(locale, { style: "currency", currency: cur }).format(n || 0);
    } catch {
      return `${cur} ${Number(n || 0).toFixed(2)}`;
    }
  }

  let invoices = $derived(data.invoices || []);
  let filterStatus = $state("all");
  let sortKey = $state<"invoiceNumber" | "customer" | "total" | "status" | "issueDate" | "updatedAt">("invoiceNumber");
  let sortDirection = $state<"asc" | "desc">("desc");

  function toDateMs(v: unknown) {
    return new Date((v as string) || 0).getTime();
  }

  function compareText(a: unknown, b: unknown) {
    return String(a || "").localeCompare(String(b || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  function handleSort(key: "invoiceNumber" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
      return;
    }
    sortKey = key;
    sortDirection = key === "invoiceNumber" ? "desc" : "asc";
  }

  function sortMarker(key: "invoiceNumber" | "customer" | "total" | "status" | "issueDate" | "updatedAt") {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ▲" : " ▼";
  }

  let filtered = $derived(invoices.filter((i) => {
    if (filterStatus === "all") return true;
    return i.status === filterStatus;
  }));

  let sortedFiltered = $derived([...filtered].sort((a, b) => {
    let result = 0;
    if (sortKey === "invoiceNumber") {
      result = compareText(a.invoiceNumber, b.invoiceNumber);
    } else if (sortKey === "customer") {
      result = compareText(a.customer?.name, b.customer?.name);
    } else if (sortKey === "total") {
      result = Number(a.total || 0) - Number(b.total || 0);
    } else if (sortKey === "status") {
      result = compareText(a.status, b.status);
    } else if (sortKey === "issueDate") {
      result = toDateMs(a.issueDate) - toDateMs(b.issueDate);
    } else if (sortKey === "updatedAt") {
      result = toDateMs(a.updatedAt) - toDateMs(b.updatedAt);
    }

    if (result === 0) {
      result = compareText(a.invoiceNumber, b.invoiceNumber);
    }

    return sortDirection === "asc" ? result : -result;
  }));
</script>

<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
  <h1 class="text-2xl font-semibold">{t("Invoices")}</h1>
  {#if canCreate}
    <a href="/invoices/new" class="btn btn-primary btn-sm w-full sm:w-auto">
      <SquarePen size={16} />
      {t("Create Invoice")}
    </a>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-4">
    <span>{data.error}</span>
  </div>
{/if}

<div class="bg-base-100 border border-base-300 rounded-box p-4 mb-4 overflow-x-auto">
  <div class="flex gap-2">
    <button class={`btn btn-sm ${filterStatus === "all" ? "btn-neutral" : "btn-ghost"}`} onclick={() => filterStatus = "all"}>{t("All")}</button>
    <button class={`btn btn-sm ${filterStatus === "sent" ? "btn-neutral" : "btn-ghost"}`} onclick={() => filterStatus = "sent"}>{t("Sent")}</button>
    <button class={`btn btn-sm ${filterStatus === "draft" ? "btn-neutral" : "btn-ghost"}`} onclick={() => filterStatus = "draft"}>{t("Draft")}</button>
    <button class={`btn btn-sm ${filterStatus === "complete" ? "btn-neutral" : "btn-ghost"}`} onclick={() => filterStatus = "complete"}>{t("Complete")}</button>
    <button class={`btn btn-sm ${filterStatus === "paid" ? "btn-neutral" : "btn-ghost"}`} onclick={() => filterStatus = "paid"}>{t("Paid")}</button>
    <button class={`btn btn-sm ${filterStatus === "voided" ? "btn-neutral" : "btn-ghost"}`} onclick={() => filterStatus = "voided"}>{t("Voided")}</button>
  </div>
</div>

{#if invoices.length === 0}
  <div class="text-center py-12 bg-base-100 border border-base-300 rounded-box">
    <div class="text-lg opacity-50 mb-4">{t("No invoices found")}</div>
    {#if canCreate}
      <a href="/invoices/new" class="btn btn-primary">{t("Create your first invoice")}</a>
    {/if}
  </div>
{:else}
  <div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
    <table class="table table-sm sm:table-md w-full whitespace-nowrap">
      <thead class="bg-base-200">
        <tr>
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("invoiceNumber")}>
              {t("Invoice No")}{sortMarker("invoiceNumber")}
            </button>
          </th>
          {#if canViewCustomers}
            <th>
              <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("customer")}>
                {t("Customer")}{sortMarker("customer")}
              </button>
            </th>
          {/if}
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("total")}>
              {t("Total")}{sortMarker("total")}
            </button>
          </th>
          <th>
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("status")}>
              {t("Status")}{sortMarker("status")}
            </button>
          </th>
          <th class="hidden sm:table-cell">
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("issueDate")}>
              {t("Issue Date")}{sortMarker("issueDate")}
            </button>
          </th>
          <th class="hidden md:table-cell text-right">
            <button type="button" class="btn btn-ghost btn-xs px-1 normal-case" onclick={() => handleSort("updatedAt")}>
              {t("Updated")}{sortMarker("updatedAt")}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each sortedFiltered as inv}
          <tr class="hover">
            <td class="font-medium hover:underline">
              <a href={`/invoices/${inv.id}`}>{inv.invoiceNumber}</a>
              <div class="sm:hidden text-xs opacity-70">
                {#if inv.issueDate}
                  {new Date(inv.issueDate).toLocaleDateString(numberFormat === "period" ? "de-DE" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                {/if}
              </div>
            </td>
            {#if canViewCustomers}
              <td class="max-w-[12rem] sm:max-w-xs truncate" title={inv.customer?.name}>
                {inv.customer?.name || "-"}
              </td>
            {/if}
            <td class="font-medium">{fmtMoney(inv.currency, inv.total)}</td>
            <td>
              {#if inv.status === "draft"}
                <div class="badge badge-ghost badge-sm">{t("Draft")}</div>
              {:else if inv.status === "sent"}
                <div class="badge badge-info badge-sm">{t("Sent")}</div>
              {:else if inv.status === "paid"}
                <div class="badge badge-success badge-sm">{t("Paid")}</div>
              {:else if inv.status === "complete"}
                <div class="badge badge-secondary badge-sm">{t("Complete")}</div>
              {:else if inv.status === "overdue"}
                <div class="badge badge-error badge-sm">{t("Overdue")}</div>
              {:else if inv.status === "voided"}
                <div class="badge badge-neutral badge-sm">{t("Voided")}</div>
              {/if}
            </td>
            <td class="hidden sm:table-cell tabular-nums text-sm">
              {#if inv.issueDate}
                {new Date(inv.issueDate).toLocaleDateString(numberFormat === "period" ? "de-DE" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
              {/if}
            </td>
            <td class="hidden md:table-cell text-right tabular-nums text-sm opacity-70">
              {#if inv.updatedAt}
                {new Date(inv.updatedAt).toLocaleDateString(numberFormat === "period" ? "de-DE" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
              {/if}
            </td>
          </tr>
        {/each}
        {#if sortedFiltered.length === 0}
          <tr>
            <td colspan="6" class="text-center py-8 opacity-50">{t("No invoices match this filter")}</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
{/if}
