<script lang="ts">
  import { PackagePlus } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let numberFormat = $derived(data.localization?.numberFormat || "comma");
  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some(p => p.resource === "products" && p.action === "create"));
  let products = $derived(data.products || []);

  function fmtMoney(cur: string | undefined, n: number) {
    if (!cur) cur = "USD";
    try {
      const locale = numberFormat === "period" ? "de-DE" : "en-US";
      return new Intl.NumberFormat(locale, { style: "currency", currency: cur }).format(n || 0);
    } catch {
      return `${cur} ${Number(n || 0).toFixed(2)}`;
    }
  }
</script>

<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
  <div class="mb-4">
  <h1 class="text-2xl font-semibold">{t("Products")}</h1>
</div>
  {#if canCreate}
    <a href="/products/new" class="btn btn-sm btn-primary w-full sm:w-auto">
      <PackagePlus size={16} />
      {t("New Product")}
    </a>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-3">
    <span>{data.error}</span>
  </div>
{/if}

<!-- Mobile List -->
<div class="block md:hidden space-y-3">
  {#each products as p}
    <a href={`/products/${p.id}`} class="card bg-base-100 border border-base-300 hover:shadow-md transition-shadow">
      <div class="card-body p-4">
        <div class="flex justify-between items-start mb-2">
          <div class="font-semibold line-clamp-2 pr-2">{p.name || p.id}</div>
          <div class="font-medium whitespace-nowrap">{fmtMoney(p.currency, p.price)}</div>
        </div>
        {#if p.description}
          <div class="text-sm opacity-70 line-clamp-2">{p.description}</div>
        {/if}
      </div>
    </a>
  {/each}
  {#if products.length === 0}
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body text-center py-10 text-sm opacity-70">
        <span>
          {t("No products yet.")}
          <a href="/products/new" class="link">{t("Create your first product")}</a>.
        </span>
      </div>
    </div>
  {/if}
</div>

<!-- Desktop Table -->
<div class="hidden md:block overflow-x-auto rounded-box bg-base-100 border border-base-300">
  <table class="table table-zebra w-full text-sm">
    <thead class="bg-base-200 text-base-content">
      <tr class="font-medium">
        <th>{t("Name")}</th>
        <th>{t("Description")}</th>
        <th class="w-24 text-right pr-4">{t("Price")}</th>
      </tr>
    </thead>
    <tbody>
      {#each products as p}
        <tr class="hover">
          <td class="max-w-[12rem] truncate">
            <a class="link" href={`/products/${p.id}`}>{p.name || p.id}</a>
          </td>
          <td class="opacity-70 max-w-[20rem] truncate">{p.description || ""}</td>
          <td class="text-right pr-4 font-medium">{fmtMoney(p.currency, p.price)}</td>
        </tr>
      {/each}
      {#if products.length === 0}
        <tr>
          <td colspan="3" class="text-center py-10 text-sm opacity-70">
            <span>
              {t("No products yet.")}
              <a href="/products/new" class="link">{t("Create your first product")}</a>.
            </span>
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
