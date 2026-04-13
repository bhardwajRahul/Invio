<script lang="ts">
  import { getContext } from "svelte";

  type Permission = { resource: string; action: string };

  interface Props {
    resourceActions: Record<string, string[]>;
    currentPermissions: Permission[];
    disabled?: boolean;
  }

  let { resourceActions = {}, currentPermissions = [], disabled = false }: Props = $props();
  let t = getContext("i18n") as (key: string) => string;

  // Build a Set for fast lookup
  let permSet = $derived(new Set(currentPermissions.map((p) => `${p.resource}:${p.action}`)));

  // Collect all unique actions across all resources (column headers)
  let allActions = $derived(Array.from(new Set(Object.values(resourceActions).flat())));

  // Pretty-print a resource name
  function formatResource(r: string): string {
    return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Pretty-print an action name
  function formatAction(a: string): string {
    return a.charAt(0).toUpperCase() + a.slice(1);
  }

  let gridElement: HTMLDivElement;

  function selectAll() {
    if (!gridElement) return;
    gridElement.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
      cb.checked = true;
    });
  }

  function clearAll() {
    if (!gridElement) return;
    gridElement.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
  }
</script>

<div bind:this={gridElement} id="permissions-grid">
  {#if !disabled}
    <div class="mb-3 flex gap-2">
      <button type="button" class="btn btn-xs btn-outline" onclick={selectAll}>
        {t("Select All")}
      </button>
      <button type="button" class="btn btn-xs btn-outline" onclick={clearAll}>
        {t("Clear All")}
      </button>
    </div>
  {/if}

  <!-- Permissions grid -->
  <div class="border-base-300 overflow-x-auto rounded-lg border">
    <table class="table-sm table-pin-rows table">
      <thead>
        <tr>
          <th class="bg-base-200">{t("Resource")}</th>
          {#each allActions as action}
            <th class="bg-base-200 text-center">
              {formatAction(action)}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each Object.entries(resourceActions) as [resource, actions]}
          <tr>
            <td class="font-medium">{formatResource(resource)}</td>
            {#each allActions as action}
              {@const available = actions.includes(action)}
              {@const key = `${resource}:${action}`}
              {@const name = `perm.${resource}.${action}`}
              {#if !available}
                <td class="text-center">
                  <span class="opacity-20">—</span>
                </td>
              {:else}
                <td class="text-center">
                  <input type="checkbox" class="checkbox checkbox-sm checkbox-primary" {name} checked={permSet.has(key)} {disabled} />
                </td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
