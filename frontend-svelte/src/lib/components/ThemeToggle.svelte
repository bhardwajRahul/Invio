<script lang="ts">
  import { onMount, getContext } from "svelte";
  import { Sun, Moon } from "lucide-svelte";
  
  let { size = "md", class: className = "", label = "" } = $props();

  const THEME_KEY = "theme";
  const LIGHT = "invio-light";
  const DARK = "invio";
  
  let theme = $state(LIGHT);
  let t = getContext("i18n") as (key: string) => string;

  onMount(() => {
    try {
      const current = document.documentElement.getAttribute("data-theme");
      if (current === LIGHT || current === DARK) {
        theme = current;
      } else {
        const stored = localStorage.getItem(THEME_KEY) || "";
        const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK : LIGHT;
        const initial = (stored === LIGHT || stored === DARK) ? stored : preferred;
        theme = initial;
        document.documentElement.setAttribute("data-theme", initial);
      }
    } catch (_err) {
      // ignore
    }
  });

  function toggle() {
    const next = theme === DARK ? LIGHT : DARK;
    theme = next;
    try {
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
    } catch (_err) {
      // ignore
    }
  }

  let buttonLabel = $derived(label || t("Toggle light/dark theme"));
  let sizeClass = $derived(size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "");
</script>

<button
  type="button"
  class="btn btn-ghost {sizeClass} {className}"
  onclick={toggle}
  aria-label={buttonLabel}
  title={buttonLabel}
>
  {#if theme === DARK}
    <Moon size={20} />
  {:else}
    <Sun size={20} />
  {/if}
  <span class="ml-2 hidden sm:inline text-sm opacity-70">
    {theme === DARK ? t("Dark") : t("Light")}
  </span>
</button>

