<script lang="ts">
  import { FilePlus } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some(p => p.resource === "templates" && p.action === "create"));
  let templates = $derived(data.templates || []);
</script>

<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
  <div class="flex flex-col">
    <h1 class="text-2xl font-semibold">{t("Templates")}</h1>
    <span class="text-sm opacity-60">
      {t("Manage invoice HTML templates.")}
    </span>
  </div>
  {#if canCreate}
    <div class="flex gap-2">
      <a href="/templates/new" class="btn btn-sm btn-primary w-full sm:w-auto">
        <FilePlus size={16} />
        {t("New Template")}
      </a>
    </div>
  {/if}
</div>

{#if data.error}
  <div class="alert alert-error mb-3">
    <span>{data.error}</span>
  </div>
{/if}

<!-- Mobile List -->
<div class="block md:hidden space-y-3">
  {#each templates as tpl}
    <a href={`/templates/${tpl.id}`} class="card bg-base-100 border border-base-300 hover:shadow-md transition-shadow">
      <div class="card-body p-4">
        <div class="font-semibold">{tpl.name || tpl.id}</div>
        <div class="text-sm opacity-70 mt-1">
          {tpl.description || t("No description")}
        </div>
      </div>
    </a>
  {/each}
</div>

<!-- Desktop Table -->
<div class="hidden md:block overflow-x-auto rounded-box bg-base-100 border border-base-300">
  <table class="table table-zebra w-full text-sm">
    <thead class="bg-base-200 text-base-content">
      <tr class="font-medium">
        <th>{t("Name")}</th>
        <th>{t("Description")}</th>
      </tr>
    </thead>
    <tbody>
      {#each templates as tpl}
        <tr class="hover">
          <td>
            <a class="link" href={`/templates/${tpl.id}`}>{tpl.name || tpl.id}</a>
          </td>
          <td class="opacity-70">{tpl.description || ""}</td>
        </tr>
      {/each}
      {#if templates.length === 0}
        <tr>
          <td colspan="2" class="text-center py-10 text-sm opacity-70">
            {t("No templates found.")}
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
