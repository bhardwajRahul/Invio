<script lang="ts">
  let { theme, selectedTheme, onSelect } = $props<{
    theme: { id: string };
    selectedTheme: string;
    onSelect: (themeId: string) => void;
  }>();
</script>

{#if selectedTheme === theme.id}
  <div class="rounded-box outline-primary overflow-hidden outline-4">
    <div data-theme={theme.id} class="bg-base-100 text-base-content cols-span-1 w-full cursor-pointer font-sans">
      <div class="grid grid-cols-5 grid-rows-2">
        <div class="bg-base-200 col-start-1 row-span-1 row-start-1"></div>
        <div class="bg-base-300 col-start-1 row-start-2"></div>
        <div class="bg-base-100 col-span-4 col-start-2 row-span-3 row-start-1 flex flex-col gap-1 p-2">
          <div class="font-bold">{theme.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</div>
          <div class="flex flex-wrap gap-1">
            <div class="bg-primary flex aspect-square w-5 items-center justify-center rounded lg:w-6">
              <div class="text-primary-content text-sm font-bold">A</div>
            </div>
            <div class="bg-secondary flex aspect-square w-5 items-center justify-center rounded lg:w-6">
              <div class="text-secondary-content text-sm font-bold">A</div>
            </div>
            <div class="bg-info flex aspect-square w-5 items-center justify-center rounded lg:w-6">
              <div class="text-info-content text-sm font-bold">A</div>
            </div>
            <div class="bg-success flex aspect-square w-5 items-center justify-center rounded lg:w-6">
              <div class="text-success-content text-sm font-bold">A</div>
            </div>
            <div class="bg-warning flex aspect-square w-5 items-center justify-center rounded lg:w-6">
              <div class="text-warning-content text-sm font-bold">A</div>
            </div>
            <div class="bg-error flex aspect-square w-5 items-center justify-center rounded lg:w-6">
              <div class="text-warning-content text-sm font-bold">A</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <button onclick={() => onSelect(theme.id)}>
    <div class="rounded-box overflow-hidden">
      <div data-theme={theme.id} class="bg-base-100 text-base-content cols-span-1 w-full cursor-pointer font-sans">
        <div class="grid grid-cols-5 grid-rows-2">
          <div class="bg-base-200 col-start-1 row-span-1 row-start-1"></div>
          <div class="bg-base-300 col-start-1 row-start-2"></div>
          <div class="bg-base-100 col-span-4 col-start-2 row-span-3 row-start-1 flex flex-col gap-1 p-2">
            <div class="font-bold">{theme.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</div>
            <div class="flex flex-wrap gap-1">
              <div class="bg-primary flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                <div class="text-primary-content text-sm font-bold">A</div>
              </div>
              <div class="bg-secondary flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                <div class="text-secondary-content text-sm font-bold">A</div>
              </div>
              <div class="bg-info flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                <div class="text-info-content text-sm font-bold">A</div>
              </div>
              <div class="bg-success flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                <div class="text-success-content text-sm font-bold">A</div>
              </div>
              <div class="bg-warning flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                <div class="text-warning-content text-sm font-bold">A</div>
              </div>
              <div class="bg-error flex aspect-square w-5 items-center justify-center rounded lg:w-6">
                <div class="text-warning-content text-sm font-bold">A</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </button>
{/if}
