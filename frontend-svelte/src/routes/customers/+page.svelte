<script lang="ts">
  import { UserPlus } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some(p => p.resource === "customers" && p.action === "create"));
  let customers = $derived(data.customers || []);
</script>

<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
  <h1 class="text-2xl font-semibold">{t("Customers")}</h1>
  {#if canCreate}
    <a href="/customers/new" class="btn btn-sm btn-primary w-full sm:w-auto">
      <UserPlus size={16} />
      {t("New Customer")}
    </a>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-3">
    <span>{data.error}</span>
  </div>
{/if}

<!-- Mobile Card View -->
<div class="block md:hidden space-y-3">
  {#each customers as c}
    <a href={`/customers/${c.id}`} class="card bg-base-100 border border-base-300 hover:shadow-md transition-shadow">
      <div class="card-body p-4">
        <div class="font-semibold link">{c.name || c.id}</div>
        {#if c.email}
          <div class="text-sm opacity-70 mt-1">{c.email}</div>
        {/if}
      </div>
    </a>
  {/each}
  {#if customers.length === 0}
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body text-center py-10 text-sm opacity-70">
        <span>
          {t("No customers yet.")}
          <a href="/customers/new" class="link">{t("Create your first customer")}</a>.
        </span>
      </div>
    </div>
  {/if}
</div>

<!-- Desktop Table View -->
<div class="hidden md:block overflow-x-auto rounded-box bg-base-100 border border-base-300">
  <table class="table table-zebra w-full text-sm">
    <thead class="bg-base-200 text-base-content">
      <tr class="font-medium">
        <th>{t("Name")}</th>
        <th>{t("Email")}</th>
      </tr>
    </thead>
    <tbody>
      {#each customers as c}
        <tr class="hover">
          <td>
            <a class="link" href={`/customers/${c.id}`}>{c.name || c.id}</a>
          </td>
          <td class="opacity-70">{c.email || ""}</td>
        </tr>
      {/each}
      {#if customers.length === 0}
        <tr>
          <td colspan="2" class="text-center py-10 text-sm opacity-70">
            <span>
              {t("No customers yet.")}
              <a href="/customers/new" class="link">{t("Create your first customer")}</a>.
            </span>
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
