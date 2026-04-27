<script lang="ts">
  let { data } = $props();

  import { Info } from "lucide-svelte";
</script>

{#if data.demoMode == true}
  <div role="alert" class="alert alert-info mb-2">
    <Info />
    <span>
      Invio is running in demo mode, the database resets every {data.demoResetMinutes} minutes. You can use the app but your changes are not persisted.
    </span>
  </div>
{/if}
