<script lang="ts">
  import { ShieldOff } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();

  let t = getContext("i18n") as (key: string) => string;
  let numberFormat = $derived(data.localization?.numberFormat || "comma");
  let user = $derived(data.user);
  let canViewInvoices = $derived(user?.isAdmin || user?.permissions?.some(p => p.resource === "invoices" && p.action === "read"));
  let canViewCustomers = $derived(user?.isAdmin || user?.permissions?.some(p => p.resource === "customers" && p.action === "read"));

  function fmtMoney(n: number) {
    const cur = data.money?.currency || "USD";
    try {
      const locale = numberFormat === "period" ? "de-DE" : "en-US";
      return new Intl.NumberFormat(locale, { style: "currency", currency: cur }).format(n || 0);
    } catch {
      return `${cur} ${Number(n || 0).toFixed(2)}`;
    }
  }
</script>

<div class="mb-4">
  <h1 class="text-2xl font-semibold">{t("Dashboard")}</h1>
</div>

{#if data.error}
  <div class="alert alert-error mb-4">
    <span>{data.error}</span>
  </div>
{/if}

{#if !canViewInvoices}
  <div class="card bg-base-100 border border-base-300 rounded-box mb-4">
    <div class="card-body p-6 flex flex-row items-center gap-4">
      <ShieldOff size={24} class="opacity-50 shrink-0" />
      <div>
        <div class="font-semibold">{t("Invoice data hidden")}</div>
        <div class="text-sm opacity-70">
          {t("You do not have permission to view invoices. Contact an administrator to request access.")}
        </div>
      </div>
    </div>
  </div>
{/if}

{#if !canViewCustomers}
  <div class="card bg-base-100 border border-base-300 rounded-box mb-4">
    <div class="card-body p-6 flex flex-row items-center gap-4">
      <ShieldOff size={24} class="opacity-50 shrink-0" />
      <div>
        <div class="font-semibold">{t("Customer data hidden")}</div>
        <div class="text-sm opacity-70">
          {t("You do not have permission to view customers. Contact an administrator to request access.")}
        </div>
      </div>
    </div>
  </div>
{/if}

{#if data.counts}
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Invoices")}</div>
        <div class="text-2xl sm:text-3xl font-extrabold">{data.counts.invoices}</div>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Customers")}</div>
        <div class="text-2xl sm:text-3xl font-extrabold">{data.counts.customers}</div>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Open Invoices")}</div>
        <div class="text-2xl sm:text-3xl font-extrabold">
          {(data.status?.sent || 0) + (data.status?.overdue || 0)}
        </div>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Version")}</div>
        <div class="text-2xl sm:text-3xl font-extrabold">{data.version}</div>
      </div>
    </div>
  </div>
{/if}

{#if data.money}
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Total Billed")}</div>
        <div class="text-xl sm:text-2xl font-bold">{fmtMoney(data.money.billed)}</div>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Outstanding")}</div>
        <div class="text-xl sm:text-2xl font-bold">{fmtMoney(data.money.outstanding)}</div>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Paid")}</div>
        <div class="text-xl sm:text-2xl font-bold">{fmtMoney(data.money.paid)}</div>
      </div>
    </div>
  </div>
{/if}

{#if data.status}
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Draft")}</div>
        <div class="text-lg sm:text-xl font-semibold">{data.status.draft}</div>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Sent")}</div>
        <div class="text-lg sm:text-xl font-semibold">{data.status.sent}</div>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Paid")}</div>
        <div class="text-lg sm:text-xl font-semibold">{data.status.paid}</div>
      </div>
    </div>
    <div class="card bg-base-100 border border-base-300 rounded-box">
      <div class="card-body p-4">
        <div class="text-xs sm:text-sm opacity-70">{t("Overdue")}</div>
        <div class={`text-lg sm:text-xl font-semibold ${data.status.overdue > 0 ? "text-error" : ""}`}>
          {data.status.overdue}
        </div>
      </div>
    </div>
  </div>
{/if}

{#if data.recent && data.recent.length > 0}
  <h2 class="text-xl font-semibold mb-3">{t("Recent Invoices")}</h2>
  <div class="overflow-x-auto bg-base-100 border border-base-300 rounded-box">
    <table class="table table-sm sm:table-md w-full">
      <thead>
        <tr class="bg-base-200">
          <th>{t("Invoice No")}</th>
          <th>{t("Customer")}</th>
          <th>{t("Total")}</th>
          <th class="hidden sm:table-cell">{t("Status")}</th>
          <th class="text-right">{t("Issue Date")}</th>
        </tr>
      </thead>
      <tbody>
        {#each data.recent as inv}
          <tr class="hover">
            <td class="font-medium hover:underline">
              <a href={`/invoices/${inv.id}`}>{inv.invoiceNumber}</a>
              <div class="sm:hidden text-xs opacity-70">{t(inv.status?.charAt(0).toUpperCase() + (inv.status || "").slice(1))}</div>
            </td>
            <td>{inv.customer?.name || ""}</td>
            <td>{fmtMoney(inv.total || 0)}</td>
            <td class="hidden sm:table-cell">
              {#if inv.status === "draft"}
                <div class="badge badge-ghost badge-sm">{t("Draft")}</div>
              {:else if inv.status === "sent"}
                <div class="badge badge-info badge-sm">{t("Sent")}</div>
              {:else if inv.status === "paid"}
                <div class="badge badge-success badge-sm">{t("Paid")}</div>
              {:else if inv.status === "overdue"}
                <div class="badge badge-error badge-sm">{t("Overdue")}</div>
              {:else if inv.status === "voided"}
                <div class="badge badge-neutral badge-sm">{t("Voided")}</div>
              {/if}
            </td>
            <td class="text-right tabular-nums text-sm">
              {#if inv.issueDate}
                {new Date(inv.issueDate).toLocaleDateString(numberFormat === "period" ? "de-DE" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
