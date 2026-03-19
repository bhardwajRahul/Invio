<script lang="ts">
  import { UserPlus } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some(p => p.resource === "users" && p.action === "create"));
  let usersList = $derived(data.users || []);
</script>

<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
  <div class="mb-4">
    <h1 class="text-2xl font-semibold">{t("Users")}</h1>
  </div>
  {#if canCreate}
    <a href="/users/new" class="btn btn-sm btn-primary w-full sm:w-auto">
      <UserPlus size={16} />
      {t("New User")}
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
  {#each usersList as u}
    <a href={`/users/${u.id}`} class="card bg-base-100 border border-base-300 hover:shadow-md transition-shadow">
      <div class="card-body p-4">
        <div class="flex gap-2 items-center mb-1">
          <span class="font-semibold">{u.name || t("Unnamed")}</span>
          {#if u.isAdmin}
            <span class="badge badge-primary badge-sm">{t("Admin")}</span>
          {/if}
        </div>
        <div class="text-sm opacity-70 break-all">{u.email}</div>
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
        <th>{t("Email")}</th>
        <th>{t("Role")}</th>
      </tr>
    </thead>
    <tbody>
      {#each usersList as u}
        <tr class="hover">
          <td>
            <a class="link" href={`/users/${u.id}`}>{u.name || t("Unnamed")}</a>
          </td>
          <td class="opacity-70">{u.email}</td>
          <td>
            {#if u.isAdmin}
              <span class="badge badge-primary badge-sm">{t("Admin")}</span>
            {:else}
              <span class="badge badge-ghost badge-sm">{t("User")}</span>
            {/if}
          </td>
        </tr>
      {/each}
      {#if usersList.length === 0}
        <tr>
          <td colspan="3" class="text-center py-10 text-sm opacity-70">
            {t("No users found.")}
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
