<script lang="ts">
  import { getContext } from "svelte";
  import { Save } from "lucide-svelte";
  import { enhance } from "$app/forms";

  let { data, form } = $props();
  let t = getContext("i18n") as (key: string) => string;
  let c = $derived(data.customer || {});
</script>

{#if c.id}
<form method="post" use:enhance>
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
    <h1 class="text-2xl font-semibold">{t("Edit Customer")}</h1>
    <div class="flex items-center gap-2 w-full sm:w-auto">
      <a href={`/customers/${c.id}`} class="btn btn-ghost btn-sm flex-1 sm:flex-none">
        {t("Cancel")}
      </a>
      <button type="submit" class="btn btn-primary btn-sm flex-1 sm:flex-none">
        <Save size={16} />
        {t("Save Changes")}
      </button>
    </div>
  </div>

  {#if form?.error || data.error}
    <div class="alert alert-error mb-4 shadow text-sm sm:text-base">
      <div class="flex-1 overflow-hidden">
        <div class="font-medium">{form?.error || data.error}</div>
      </div>
    </div>
  {/if}

  <div class="space-y-4">
    <div class="form-control w-full">
      <label class="label pb-1" for="name">
        <span class="label-text">
          {t("Name")} <span class="text-error">*</span>
        </span>
      </label>
      <input type="text" id="name" name="name" class="input input-sm input-bordered w-full" value={c.name || ""} required />
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="contactName">
        <span class="label-text">{t("Contact Name")}</span>
      </label>
      <input type="text" id="contactName" name="contactName" class="input input-sm input-bordered w-full" value={c.contactName || ""} />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="form-control w-full">
        <label class="label pb-1" for="email">
          <span class="label-text">{t("Email")}</span>
        </label>
        <input type="email" id="email" name="email" class="input input-sm input-bordered w-full" value={c.email || ""} />
      </div>

      <div class="form-control w-full">
        <label class="label pb-1" for="phone">
          <span class="label-text">{t("Phone")}</span>
        </label>
        <input type="text" id="phone" name="phone" class="input input-sm input-bordered w-full" value={c.phone || ""} />
      </div>
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="address">
        <span class="label-text">{t("Address")}</span>
      </label>
      <textarea id="address" name="address" class="textarea textarea-bordered w-full" rows="3" value={c.address || ""}></textarea>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="form-control w-full">
        <label class="label pb-1" for="city">
          <span class="label-text">{t("City")}</span>
        </label>
        <input type="text" id="city" name="city" class="input input-sm input-bordered w-full" value={c.city || ""} />
      </div>

      <div class="form-control w-full">
        <label class="label pb-1" for="postalCode">
          <span class="label-text">{t("Postal Code")}</span>
        </label>
        <input type="text" id="postalCode" name="postalCode" class="input input-sm input-bordered w-full" value={c.postalCode || ""} />
      </div>
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="taxId">
        <span class="label-text">{t("Tax ID")}</span>
      </label>
      <input type="text" id="taxId" name="taxId" class="input input-sm input-bordered w-full" value={c.taxId || ""} />
    </div>

    <div class="form-control w-full">
      <label class="label pb-1" for="countryCode">
        <span class="label-text">{t("Country Code (ISO alpha-2)")}</span>
      </label>
      <input type="text" id="countryCode" name="countryCode" placeholder={t("e.g. US, NL, DE")} class="input input-sm input-bordered w-full" value={c.countryCode || ""} />
    </div>
  </div>
</form>
{:else if data.error}
  <div class="alert alert-error">
    <span>{data.error}</span>
  </div>
{/if}