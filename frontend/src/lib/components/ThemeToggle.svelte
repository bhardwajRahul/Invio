<script lang="ts">
  import { onMount } from "svelte";
  import ThemeCard from "$lib/components/ThemeCard.svelte";
  import { getTheme, setTheme } from "$lib/theme";

  let selectedTheme = $state<string>("invio-dark");

  onMount(() => {
    selectedTheme = getTheme();
  });

  function handleThemeSelect(themeId: string) {
    setTheme(themeId);
    selectedTheme = themeId;
  }

  const themes = [
    {
      id: "invio-light",
    },
    {
      id: "invio-dark",
    },
    {
      id: "light",
    },
    {
      id: "dark",
    },
    {
      id: "cupcake",
    },
    {
      id: "bumblebee",
    },
    {
      id: "emerald",
    },
    {
      id: "corporate",
    },
    {
      id: "synthwave",
    },
    {
      id: "retro",
    },
    {
      id: "cyberpunk",
    },
    {
      id: "valentine",
    },
    {
      id: "halloween",
    },
    {
      id: "garden",
    },
    {
      id: "forest",
    },
    {
      id: "aqua",
    },
    {
      id: "lofi",
    },
    {
      id: "pastel",
    },
    {
      id: "fantasy",
    },
    {
      id: "wireframe",
    },
    {
      id: "black",
    },
    {
      id: "luxury",
    },
    {
      id: "dracula",
    },
    {
      id: "cmyk",
    },
    {
      id: "autumn",
    },
    {
      id: "business",
    },
    {
      id: "acid",
    },
    {
      id: "lemonade",
    },
    {
      id: "night",
    },
    {
      id: "coffee",
    },
    {
      id: "winter",
    },
    {
      id: "dim",
    },
    {
      id: "nord",
    },
    {
      id: "sunset",
    },
    {
      id: "caramellatte",
    },
    {
      id: "abyss",
    },
    {
      id: "silk",
    },
  ];
</script>

<div class="grid grid-cols-2 gap-2 xl:grid-cols-3">
  {#each themes as item (item.id)}
    <ThemeCard theme={item} {selectedTheme} onSelect={handleThemeSelect} />
  {/each}
</div>
