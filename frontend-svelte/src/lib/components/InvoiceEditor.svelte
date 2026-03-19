<script lang="ts">
  import { getContext, onMount, untrack } from "svelte";
  import { Save, Plus, GripVertical } from "lucide-svelte";
  import { goto } from "$app/navigation";

  let { data, invoice = null } = $props();
  let initInvoice = untrack(() => invoice);
  let t = getContext("i18n") as (key: string) => string;
  let loc = getContext("localization") as any;

  let saving = $state(false);
  let error = $state("");

  let form = $state({
    customerId: initInvoice?.customerId || "",
    invoiceNumber: initInvoice?.invoiceNumber || "",
    currency: initInvoice?.currency || "EUR",
    status: initInvoice?.status || "draft",
    issueDate: initInvoice?.issueDate ? new Date(initInvoice.issueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    dueDate: initInvoice?.dueDate ? new Date(initInvoice.dueDate).toISOString().slice(0, 10) : "",
    taxMode: initInvoice?.taxMode || "invoice",
    taxRate: initInvoice?.taxRate || 0,
    pricesIncludeTax: initInvoice?.pricesIncludeTax ? "true" : "false",
    roundingMode: initInvoice?.roundingMode || "line",
    paymentTerms: initInvoice?.paymentTerms || "",
    notes: initInvoice?.notes || ""
  });

  let items = $state(
    initInvoice?.items?.length
      ? initInvoice.items.map((i: any) => ({...i, id: crypto.randomUUID()}))
      : [{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, taxPercent: 0, notes: "" }]
  );

  let customers = $derived(data.customers || []);
  let products = $derived(data.products || []);
  let taxDefinitions = $derived(data.taxDefinitions || []);

  function addItem() {
    items.push({ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, taxPercent: 0, notes: "" });
  }

  function removeItem(index: number) {
    if (items.length > 1) items.splice(index, 1);
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSubmit(e as unknown as SubmitEvent);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  }

  let subtotal = $derived(items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0));
  let tax = $derived(form.taxMode === "invoice" ? subtotal * (Number(form.taxRate) / 100) : items.reduce((sum, item) => sum + ((Number(item.quantity) * Number(item.unitPrice)) * (Number(item.taxPercent) / 100)), 0));
  let total = $derived(form.pricesIncludeTax === "true" ? subtotal : subtotal + tax); // Simplified for visual parity

  async function handleSubmit(e: SubmitEvent | Event) {
    if (e && "preventDefault" in e) e.preventDefault();
    saving = true;
    error = "";

    try {
      const payload = { ...form, pricesIncludeTax: form.pricesIncludeTax === "true", items: items.map(i => ({ description: i.description, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), taxPercent: Number(i.taxPercent||0), notes: i.notes })) };
      const url = initInvoice ? "/api/v1/invoices/" + initInvoice.id : "/api/v1/invoices";
      const res = await fetch(url, {
        method: initInvoice ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const d = await res.text();
        let errMsg = "Failed to save invoice";
        try { const j = JSON.parse(d); errMsg = j.error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const txt = await res.text();
      let result;
      try {
        result = JSON.parse(txt);
      } catch (err: any) {
        throw new Error("JSON parse error: " + err.message + " (Response: " + txt.substring(0, 100) + " )");
      }
      goto("/invoices/" + result.id);
    } catch(err: any) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    //
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<form onsubmit={handleSubmit} class="space-y-6">
  {#if error}
    <div class="alert alert-error">{error}</div>
  {/if}

  <div class="flex items-center justify-end gap-3">
    <button type="submit" class="btn btn-primary" disabled={saving}>
      <Save size={16} />
      <span>{t("Save")}</span>
    </button>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <label class="form-control">
      <div class="label">
        <span class="label-text">{t("Customer")} <span class="text-error">*</span></span>
      </div>
      <select class="select select-bordered w-full" bind:value={form.customerId} required>
        <option value="">{t("Select customer")}</option>
        {#each customers as c}
          <option value={c.id}>{c.name}</option>
        {/each}
      </select>
    </label>

    <label class="form-control">
      <div class="label">
        <span class="label-text">{t("Invoice Number")}</span>
      </div>
      <input type="text" class="input input-bordered w-full" placeholder={t("e.g. INV-2025-001")} bind:value={form.invoiceNumber} />
    </label>

    <label class="form-control">
      <div class="label">
        <span class="label-text">{t("Currency")}</span>
      </div>
      <input type="text" class="input input-bordered w-full" bind:value={form.currency} />
    </label>

    <label class="form-control">
      <div class="label">
        <span class="label-text">{t("Status")}</span>
      </div>
      <select class="select select-bordered w-full" bind:value={form.status}>
        <option value="draft">{t("Draft")}</option>
        <option value="sent">{t("Sent")}</option>
        <option value="paid">{t("Paid")}</option>
        <option value="overdue">{t("Overdue")}</option>
        <option value="voided">{t("Voided")}</option>
      </select>
    </label>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <label class="form-control">
      <div class="label">
        <span class="label-text">{t("Issue Date")}</span>
      </div>
      <input type="date" class="input input-bordered w-full" bind:value={form.issueDate} required />
    </label>

    <label class="form-control">
      <div class="label">
        <span class="label-text">{t("Due Date")}</span>
      </div>
      <input type="date" class="input input-bordered w-full" bind:value={form.dueDate} />
    </label>
  </div>

  <div>
    <div class="flex items-center justify-between mb-2">
      <div class="block text-sm font-semibold">
        {t("Items")} <span class="text-error">*</span>
        <span class="ml-2 text-xs opacity-50 font-normal">({t("Ctrl/Cmd+Enter to add")})</span>
      </div>
      <button type="button" class="btn btn-sm" onclick={addItem}>
        <Plus size={16} />
        <span class="ml-2">{t("Add item")}</span>
      </button>
    </div>

    <div class="hidden lg:flex flex-row flex-nowrap items-center gap-2 mb-1 text-xs opacity-60 font-medium">
      <div class="w-6 shrink-0"></div>
      <div class="flex-1 min-w-0 pl-3">{t("Description")}</div>
      <div class="w-16 sm:w-20 shrink-0 text-center">{t("Quantity")}</div>
      <div class="w-24 shrink-0 text-center">{t("Price")}</div>
      <div class="w-40 max-w-xs shrink-0 text-center">{t("Notes")}</div>
      <div class="w-8 shrink-0"></div>
    </div>

    <div class="space-y-3">
      {#each items as item, i (item.id)}
        <div class="flex flex-nowrap items-center gap-2">
          <button type="button" class="btn btn-ghost btn-sm btn-square shrink-0 cursor-move opacity-40 hover:opacity-100" tabindex="-1">
            <GripVertical size={16} />
          </button>
          
          <input class="input input-bordered w-full min-w-0" bind:value={item.description} placeholder={t("Description")} required />
          <input type="number" min="0" step="any" class="input input-bordered w-16 sm:w-20 shrink-0 text-center" bind:value={item.quantity} />
          <input type="number" min="0" step="any" class="input input-bordered w-24 shrink-0 text-center" bind:value={item.unitPrice} />
          <input class="input input-bordered w-40 max-w-xs shrink-0" bind:value={item.notes} placeholder={t("Notes")} />
          
          <button type="button" class="btn btn-ghost btn-square btn-sm shrink-0" onclick={() => removeItem(i)} aria-label={t("Remove item")}>&times;</button>
        </div>
      {/each}
    </div>

    <div class="mt-6 flex flex-col items-end space-y-2 text-sm">
      <div class="flex justify-between w-48">
        <span>{t("Subtotal")}:</span>
        <span>{subtotal.toFixed(2)}</span>
      </div>
      {#if tax > 0}
      <div class="flex justify-between w-48">
        <span>{t("Tax")}:</span>
        <span>{tax.toFixed(2)}</span>
      </div>
      {/if}
      <div class="flex justify-between w-48 font-bold text-lg">
        <span>{t("Total")}:</span>
        <span>{total.toFixed(2)} {form.currency}</span>
      </div>
    </div>
  </div>

  <div class="flex gap-4 text-xs opacity-50">
    <span class="flex items-center gap-1"><kbd class="kbd kbd-xs">Ctrl</kbd>+<kbd class="kbd kbd-xs">S</kbd> {t("Save")}</span>
    <span class="flex items-center gap-1"><kbd class="kbd kbd-xs">Ctrl</kbd>+<kbd class="kbd kbd-xs">Enter</kbd> {t("Add item")}</span>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <label class="form-control">
      <div class="label"><span class="label-text">{t("Tax Mode")}</span></div>
      <select class="select select-bordered w-full" bind:value={form.taxMode}>
        <option value="invoice">{t("Invoice total")}</option>
        <option value="line">{t("Per line")}</option>
      </select>
    </label>
    
    <label class="form-control" class:hidden={form.taxMode !== 'invoice'}>
      <div class="label"><span class="label-text">{t("Tax Rate (%)")}</span></div>
      <input type="number" class="input input-bordered w-full" bind:value={form.taxRate} step="any" min="0" />
    </label>

    <label class="form-control">
      <div class="label"><span class="label-text">{t("Prices include tax?")}</span></div>
      <select class="select select-bordered w-full" bind:value={form.pricesIncludeTax}>
        <option value="false">{t("No")}</option>
        <option value="true">{t("Yes")}</option>
      </select>
    </label>

    <label class="form-control">
      <div class="label"><span class="label-text">{t("Rounding mode")}</span></div>
      <select class="select select-bordered w-full" bind:value={form.roundingMode}>
        <option value="line">{t("Round per line")}</option>
        <option value="total">{t("Round on total")}</option>
      </select>
    </label>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <label class="form-control">
      <div class="label"><span class="label-text">{t("Payment Terms")}</span></div>
      <textarea class="textarea textarea-bordered w-full h-24" bind:value={form.paymentTerms}></textarea>
    </label>
    
    <label class="form-control">
      <div class="label"><span class="label-text">{t("Notes")}</span></div>
      <textarea class="textarea textarea-bordered w-full h-24" bind:value={form.notes}></textarea>
    </label>
  </div>
</form>
