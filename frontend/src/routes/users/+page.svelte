<script lang="ts">
  import { UserPlus } from "lucide-svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let user = $derived(data.user);
  let canCreate = $derived(user?.isAdmin || user?.permissions?.some((p) => p.resource === "users" && p.action === "create"));
  let usersList = $derived(data.users || []);

  function getUserLabel(u: { displayName?: string; display_name?: string; name?: string; username?: string; userName?: string; user_name?: string; email?: string }) {
    const label = [u.displayName, u.display_name, u.name, u.username, u.userName, u.user_name].find((v) => typeof v === "string" && v.trim().length > 0);

    if (label) return label;
    if (u.email && u.email.includes("@")) return u.email.split("@")[0];
    return t("Unnamed");
  }
</script>

<div class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
  <h1 class="text-2xl font-semibold">{t("Users")}</h1>
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
<div class="block space-y-3 md:hidden">
  {#each usersList as u (u.id)}
    <a href={`/users/${u.id}`} class="card bg-base-100 border-base-300 border transition-shadow hover:shadow-md">
      <div class="card-body p-4">
        <div class="mb-1 flex items-center gap-2">
          <span class="font-semibold">{getUserLabel(u)}</span>
          {#if u.isAdmin}
            <span class="badge badge-primary badge-sm">{t("Admin")}</span>
          {/if}
        </div>
        <div class="text-sm break-all opacity-70">{u.email}</div>
      </div>
    </a>
  {/each}
</div>

<!-- Desktop Table -->
<div class="rounded-box bg-base-100 border-base-300 hidden overflow-x-auto border md:block">
  <table class="table-zebra table w-full text-sm">
    <thead class="bg-base-200 text-base-content">
      <tr class="font-medium">
        <th>{t("Name")}</th>
        <th>{t("Email")}</th>
        <th>{t("Role")}</th>
      </tr>
    </thead>
    <tbody>
      {#each usersList as u (u.id)}
        <tr class="hover">
          <td>
            <a class="link" href={`/users/${u.id}`}>{getUserLabel(u)}</a>
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
          <td colspan="3" class="py-10 text-center text-sm opacity-70">
            {t("No users found.")}
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>
