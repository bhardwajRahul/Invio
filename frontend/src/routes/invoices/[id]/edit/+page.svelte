
<script lang="ts">
  import InvoiceEditor from "$lib/components/InvoiceEditor.svelte";
  import { getContext } from "svelte";

  let { data } = $props();
  let t = getContext("i18n") as (key: string) => string;
</script>

<div class="mb-6">
  <h1 class="text-2xl font-bold">{t("Edit Invoice")} #{data.invoice?.invoiceNumber || data.invoice?.id}</h1>
</div>

{#if data.invoice}
  <InvoiceEditor
    {data}
    invoice={data.invoice}
  />
{/if}

