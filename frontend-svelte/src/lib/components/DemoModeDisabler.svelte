<script lang="ts">
  import { onMount } from "svelte";

  onMount(() => {
    try {
      const sel = "[data-writable]";
      document.querySelectorAll(sel).forEach((el) => {
        if (el instanceof HTMLElement) {
          el.setAttribute("disabled", "true");
          el.classList.add("opacity-50", "cursor-not-allowed");
        }
      });
    } catch (_e) { /* ignore */ }
  });
</script>
