<script lang="ts">
  import { getContext } from "svelte";
  import { Image } from "lucide-svelte";
  
  let { settings, templates, canUpdateSettings } = $props();
  let t = getContext("i18n") as (key: string) => string;

  let logoFileInput = $state<HTMLInputElement | null>(null);
  let colorSuggestions = $state<string[]>([]);
  let logoError = $state(false);

  function isValidLogo(v: string) {
    if (!v) return true;
    if (v.startsWith("data:image/")) return true;
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function handleLogoInput() {
    logoError = !isValidLogo(settings.logo);
  }

  function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(t("Please select a valid image file."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        settings.logo = result;
        handleLogoInput();
      }
    };
    reader.readAsDataURL(file);
  }

  // Simplified color extraction
  function extractColors(img: HTMLImageElement) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = Math.min(img.naturalWidth || 200, 200);
    canvas.height = Math.min(img.naturalHeight || 200, 200);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set<string>();

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue; // skip transparent
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r + g + b) / 3;
      if (brightness > 240 || brightness < 15) continue; // skip B/W
      
      const hex = "#" + [r,g,b].map(x => x.toString(16).padStart(2, "0")).join("");
      colors.add(hex);
      if (colors.size >= 8) break; // simplistic top 8 approximation
    }
    
    colorSuggestions = Array.from(colors);
  }

  function onImageLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    extractColors(img);
  }

  function selectColor(color: string) {
    settings.highlight = color;
  }
</script>

<div class="space-y-4">
  <h2 class="text-xl font-semibold">{t("Branding")}</h2>

  <label class="form-control">
    <div class="label"><span class="label-text">{t("Template")}</span></div>
    <select class="select select-bordered w-full" bind:value={settings.templateId} disabled={!canUpdateSettings}>
      <option value="">{t("Default")}</option>
      {#each templates as tmpl}
        <option value={tmpl.id}>{tmpl.name}</option>
      {/each}
    </select>
  </label>

  <label class="form-control">
    <div class="label"><span class="label-text">{t("Highlight Color")}</span></div>
    <div class="flex gap-2">
      <input type="color" class="h-12 w-12 rounded cursor-pointer" bind:value={settings.highlight} disabled={!canUpdateSettings} />
      <input type="text" class="input input-bordered flex-1" bind:value={settings.highlight} disabled={!canUpdateSettings} />
    </div>
  </label>

  {#if colorSuggestions.length > 0}
    <div class="mt-2 text-sm text-base-content/70">
      <p class="mb-2">{t("Suggested colors from logo:")}</p>
      <div class="flex flex-wrap gap-2">
        {#each colorSuggestions as color}
          <button 
            type="button"
            class="w-8 h-8 rounded-full border border-base-300 shadow-sm cursor-pointer hover:scale-110 transition-transform"
            style="background-color: {color}"
            onclick={() => selectColor(color)}
            title={color}
          ></button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="form-control">
    <div class="label">
      <span class="label-text">{t("Logo URL or Base64")}</span>
      <span class="label-text-alt opacity-70">Optional</span>
    </div>
    
    <div class="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        class="input input-bordered flex-1 {logoError ? 'input-error' : ''}"
        bind:value={settings.logo}
        oninput={handleLogoInput}
        disabled={!canUpdateSettings}
        placeholder="https://... or data:image/..."
      />
      <label class="btn btn-secondary cursor-pointer {!canUpdateSettings ? 'btn-disabled' : ''}">
        <Image size={18} class="mr-2" />
        {t("Upload")}
        <input 
          type="file" 
          accept="image/*" 
          class="hidden" 
          bind:this={logoFileInput}
          onchange={onFileChange}
          disabled={!canUpdateSettings}
        />
      </label>
    </div>
    
    {#if logoError}
      <div class="label">
        <span class="label-text-alt text-error">{t("Invalid URL or data format")}</span>
      </div>
    {/if}

    {#if settings.logo && !logoError}
      <div class="mt-4 p-4 border border-base-200 rounded-box bg-base-50 inline-block">
        <p class="text-xs text-base-content/50 mb-2">{t("Preview")}</p>
        <img 
          src={settings.logo} 
          alt="Logo preview" 
          class="max-h-32 object-contain"
          onload={onImageLoad}
          onerror={() => logoError = true}
        />
      </div>
    {/if}
  </div>
</div>
