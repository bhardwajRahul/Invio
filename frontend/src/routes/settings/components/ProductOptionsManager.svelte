<script lang="ts">
  import { getContext } from "svelte";
  import { Plus, Pencil, Trash2 } from "lucide-svelte";
  import { invalidateAll } from "$app/navigation";

  let { productCategories = [], productUnits = [], demoMode } = $props();
  let t = getContext("i18n") as (key: string, params?: any) => string;

  let showCategoryForm = $state(false);
  let editingCategoryId = $state<string | null>(null);
  let categoryForm = $state({ code: "", name: "" });

  let showUnitForm = $state(false);
  let editingUnitId = $state<string | null>(null);
  let unitForm = $state({ code: "", name: "" });

  let isSubmitting = $state(false);

  // Categories
  function handleAddCategory() {
    editingCategoryId = null;
    categoryForm = { code: "", name: "" };
    showCategoryForm = true;
  }
  function handleEditCategory(cat: any) {
    editingCategoryId = cat.id;
    categoryForm = { code: cat.code, name: cat.name };
    showCategoryForm = true;
  }
  function handleCancelCategory() {
    showCategoryForm = false;
    editingCategoryId = null;
  }

  async function handleSubmitCategory(e: SubmitEvent) {
    e.preventDefault();
    isSubmitting = true;
    try {
      const url = editingCategoryId ? `/api/v1/product-categories/${editingCategoryId}` : "/api/v1/product-categories";
      const method = editingCategoryId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });
      if (!res.ok) throw new Error("API error");
      handleCancelCategory();
      invalidateAll();
    } catch (err) {
      alert(err);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteCategory(cat: any) {
    if (!confirm(t("Delete category confirm", { code: cat.code }))) return;
    try {
      await fetch(`/api/v1/product-categories/${cat.id}`, { method: "DELETE" });
      invalidateAll();
    } catch (err) {
      alert(err);
    }
  }

  // Units
  function handleAddUnit() {
    editingUnitId = null;
    unitForm = { code: "", name: "" };
    showUnitForm = true;
  }
  function handleEditUnit(unit: any) {
    editingUnitId = unit.id;
    unitForm = { code: unit.code, name: unit.name };
    showUnitForm = true;
  }
  function handleCancelUnit() {
    showUnitForm = false;
    editingUnitId = null;
  }

  async function handleSubmitUnit(e: SubmitEvent) {
    e.preventDefault();
    isSubmitting = true;
    try {
      const url = editingUnitId ? `/api/v1/product-units/${editingUnitId}` : "/api/v1/product-units";
      const method = editingUnitId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitForm),
      });
      if (!res.ok) throw new Error("API error");
      handleCancelUnit();
      invalidateAll();
    } catch (err) {
      alert(err);
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteUnit(unit: any) {
    if (!confirm(t("Delete unit confirm", { code: unit.code }))) return;
    try {
      await fetch(`/api/v1/product-units/${unit.id}`, { method: "DELETE" });
      invalidateAll();
    } catch (err) {
      alert(err);
    }
  }
</script>

<div class="space-y-8">
  <!-- Categories -->
  <div class="space-y-4">
    <div class="border-base-300 flex items-center justify-between border-b pb-2">
      <h3 class="text-lg font-semibold">{t("Product Categories")}</h3>
      <button type="button" onclick={handleAddCategory} class="btn btn-sm btn-primary" disabled={demoMode}>
        <Plus size={16} class="mr-1" />
        {t("Add Category")}
      </button>
    </div>

    {#if showCategoryForm}
      <form onsubmit={handleSubmitCategory} class="card bg-base-200 space-y-3 p-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="form-control">
            <div class="label">
              <span class="label-text">{t("Category Code")} *</span>
            </div>
            <input type="text" class="input input-bordered w-full" bind:value={categoryForm.code} required disabled={demoMode} />
          </label>
          <label class="form-control">
            <div class="label">
              <span class="label-text">{t("Category Name")} *</span>
            </div>
            <input type="text" class="input input-bordered w-full" bind:value={categoryForm.name} required disabled={demoMode} />
          </label>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="btn btn-primary" disabled={demoMode || isSubmitting}>{editingCategoryId ? t("Update") : t("Create")}</button>
          <button type="button" onclick={handleCancelCategory} class="btn btn-ghost" disabled={isSubmitting}>{t("Cancel")}</button>
        </div>
      </form>
    {/if}

    <div class="space-y-2">
      {#each productCategories as cat}
        <div class="border-base-300 rounded-box bg-base-100 flex items-center justify-between border p-3">
          <div>
            <span class="font-medium">{cat.code}</span>
            <span class="text-base-content/60">&mdash; {cat.name}</span>
          </div>
          <div class="flex gap-2">
            <button type="button" onclick={() => handleEditCategory(cat)} class="btn btn-sm btn-ghost" disabled={demoMode}><Pencil size={16} /></button>
            <button type="button" onclick={() => handleDeleteCategory(cat)} class="btn btn-sm btn-ghost text-error" disabled={demoMode || cat.isBuiltin}><Trash2 size={16} /></button>
          </div>
        </div>
      {/each}
      {#if productCategories.length === 0}
        <div class="text-base-content/60 py-4 text-center">
          {t("No categories defined")}
        </div>
      {/if}
    </div>
  </div>

  <!-- Units -->
  <div class="space-y-4">
    <div class="border-base-300 flex items-center justify-between border-b pb-2">
      <h3 class="text-lg font-semibold">{t("Product Units")}</h3>
      <button type="button" onclick={handleAddUnit} class="btn btn-sm btn-primary" disabled={demoMode}>
        <Plus size={16} class="mr-1" />
        {t("Add Unit")}
      </button>
    </div>

    {#if showUnitForm}
      <form onsubmit={handleSubmitUnit} class="card bg-base-200 space-y-3 p-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="form-control">
            <div class="label">
              <span class="label-text">{t("Unit Code")} *</span>
            </div>
            <input type="text" class="input input-bordered w-full" bind:value={unitForm.code} required disabled={demoMode} />
          </label>
          <label class="form-control">
            <div class="label">
              <span class="label-text">{t("Unit Name")} *</span>
            </div>
            <input type="text" class="input input-bordered w-full" bind:value={unitForm.name} required disabled={demoMode} />
          </label>
        </div>
        <div class="flex gap-2">
          <button type="submit" class="btn btn-primary" disabled={demoMode || isSubmitting}>{editingUnitId ? t("Update") : t("Create")}</button>
          <button type="button" onclick={handleCancelUnit} class="btn btn-ghost" disabled={isSubmitting}>{t("Cancel")}</button>
        </div>
      </form>
    {/if}

    <div class="space-y-2">
      {#each productUnits as unit}
        <div class="border-base-300 rounded-box bg-base-100 flex items-center justify-between border p-3">
          <div>
            <span class="font-medium">{unit.code}</span>
            <span class="text-base-content/60">&mdash; {unit.name}</span>
          </div>
          <div class="flex gap-2">
            <button type="button" onclick={() => handleEditUnit(unit)} class="btn btn-sm btn-ghost" disabled={demoMode}><Pencil size={16} /></button>
            <button type="button" onclick={() => handleDeleteUnit(unit)} class="btn btn-sm btn-ghost text-error" disabled={demoMode || unit.isBuiltin}><Trash2 size={16} /></button>
          </div>
        </div>
      {/each}
      {#if productUnits.length === 0}
        <div class="text-base-content/60 py-4 text-center">
          {t("No units defined")}
        </div>
      {/if}
    </div>
  </div>
</div>
