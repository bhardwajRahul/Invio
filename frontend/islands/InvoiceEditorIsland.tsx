import { useEffect } from "preact/hooks";
import { formatMoney } from "../utils/format.ts";

export default function InvoiceEditorIsland() {
  type InvoiceEditorGlobals = typeof globalThis & {
    invoiceEditorSettings?: {
      numberFormat?: "comma" | "period";
    };
    lucide?: {
      createIcons?: () => void;
    };
  };

  const invoiceEditorGlobals = globalThis as InvoiceEditorGlobals;

  // Get numberFormat from global settings
  const numberFormat = invoiceEditorGlobals.invoiceEditorSettings?.numberFormat || "comma";
  useEffect(() => {
    const addBtn = document.getElementById('add-item');
    const container = document.getElementById('items-container');
    const tpl = document.getElementById('item-template') as HTMLTemplateElement | null;
    const taxModeSelect = document.getElementById('tax-mode-select') as HTMLSelectElement | null;
    const invoiceTaxInput = document.getElementById('invoice-tax-rate-input') as HTMLInputElement | null;
    const form = (addBtn?.closest('form')) as HTMLFormElement | null;
    const submitBtn = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    const itemsError = document.getElementById('items-error');
    const customerError = document.getElementById('customer-error');
    const customerSelect = document.querySelector('select[name="customerId"]') as HTMLSelectElement | null;
    const currencyInput = document.querySelector('input[name="currency"]') as HTMLInputElement | null;
    const pricesIncludeTaxSelect = document.querySelector('select[name="pricesIncludeTax"]') as HTMLSelectElement | null;
    const roundingModeSelect = document.querySelector('select[name="roundingMode"]') as HTMLSelectElement | null;
    if (!addBtn || !container || !tpl) return;

    // Totals preview elements
    const previewSubtotal = document.getElementById('preview-subtotal');
    const previewTax = document.getElementById('preview-tax');
    const previewTotal = document.getElementById('preview-total');
    const previewTaxContainer = document.getElementById('preview-tax-container');

    function formatCurrency(amount: number): string {
      const currency = currencyInput?.value || 'USD';
      return formatMoney(amount, currency, numberFormat);
    }

    function calculateTotals() {
      if (!container || !previewSubtotal || !previewTax || !previewTotal) return;

      const rows = container.querySelectorAll('.item-row');
      const taxMode = taxModeSelect?.value || 'invoice';
      const invoiceTaxRate = Number(invoiceTaxInput?.value || 0);
      const pricesIncludeTax = pricesIncludeTaxSelect?.value === 'true';
      const roundingMode = roundingModeSelect?.value || 'line';

      let subtotal = 0;
      let totalTax = 0;

      rows.forEach((row) => {
        const qtyInput = row.querySelector('input[name="item_quantity"]') as HTMLInputElement | null;
        const priceInput = row.querySelector('input[name="item_unitPrice"]') as HTMLInputElement | null;
        const taxInput = row.querySelector('input[name="item_tax_percent"]') as HTMLInputElement | null;

        const qty = Number(qtyInput?.value || 0);
        const price = Number(priceInput?.value || 0);
        let lineTotal = qty * price;

        if (roundingMode === 'line') {
          lineTotal = Math.round(lineTotal * 100) / 100;
        }

        if (taxMode === 'line' && taxInput) {
          const lineTaxRate = Number(taxInput.value || 0);
          if (pricesIncludeTax) {
            // Extract tax from line total
            const lineTax = lineTotal - (lineTotal / (1 + lineTaxRate / 100));
            totalTax += lineTax;
            subtotal += lineTotal - lineTax;
          } else {
            // Add tax to line total
            const lineTax = lineTotal * (lineTaxRate / 100);
            totalTax += lineTax;
            subtotal += lineTotal;
          }
        } else {
          subtotal += lineTotal;
        }
      });

      // Apply invoice-level tax
      if (taxMode === 'invoice' && invoiceTaxRate > 0) {
        if (pricesIncludeTax) {
          // Extract tax from subtotal
          totalTax = subtotal - (subtotal / (1 + invoiceTaxRate / 100));
          subtotal = subtotal - totalTax;
        } else {
          // Add tax to subtotal
          totalTax = subtotal * (invoiceTaxRate / 100);
        }
      }

      // Round totals if needed
      if (roundingMode === 'total') {
        subtotal = Math.round(subtotal * 100) / 100;
        totalTax = Math.round(totalTax * 100) / 100;
      } else {
        subtotal = Math.round(subtotal * 100) / 100;
        totalTax = Math.round(totalTax * 100) / 100;
      }

      const total = subtotal + totalTax;

      // Update display
      previewSubtotal.textContent = formatCurrency(subtotal);
      previewTax.textContent = formatCurrency(totalTax);
      previewTotal.textContent = formatCurrency(total);

      // Hide tax row if no tax
      if (previewTaxContainer) {
        if (totalTax === 0) {
          previewTaxContainer.classList.add('hidden');
        } else {
          previewTaxContainer.classList.remove('hidden');
        }
      }
    }

    // Drag and drop state
    let draggedItem: HTMLElement | null = null;

    function setupDragAndDrop(row: Element) {
      const handle = row.querySelector('.drag-handle');
      if (!handle) return;

      row.addEventListener('dragstart', (e: Event) => {
        const dragEvent = e as DragEvent;
        draggedItem = row as HTMLElement;
        (row as HTMLElement).classList.add('opacity-50');
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.effectAllowed = 'move';
        }
      });

      row.addEventListener('dragend', () => {
        (row as HTMLElement).classList.remove('opacity-50');
        draggedItem = null;
      });

      row.addEventListener('dragover', (e: Event) => {
        const dragEvent = e as DragEvent;
        dragEvent.preventDefault();
        if (!draggedItem || draggedItem === row) return;
        
        const bounding = (row as HTMLElement).getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2;
        
        if (dragEvent.clientY - offset > 0) {
          (row as HTMLElement).style.borderBottom = '2px solid hsl(var(--p))';
          (row as HTMLElement).style.borderTop = '';
        } else {
          (row as HTMLElement).style.borderTop = '2px solid hsl(var(--p))';
          (row as HTMLElement).style.borderBottom = '';
        }
      });

      row.addEventListener('dragleave', () => {
        (row as HTMLElement).style.borderTop = '';
        (row as HTMLElement).style.borderBottom = '';
      });

      row.addEventListener('drop', (e: Event) => {
        const dragEvent = e as DragEvent;
        dragEvent.preventDefault();
        (row as HTMLElement).style.borderTop = '';
        (row as HTMLElement).style.borderBottom = '';
        
        if (!draggedItem || draggedItem === row) return;
        
        const bounding = (row as HTMLElement).getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2;
        
        if (dragEvent.clientY - offset > 0) {
          row.parentNode?.insertBefore(draggedItem, row.nextSibling);
        } else {
          row.parentNode?.insertBefore(draggedItem, row);
        }
      });
    }

    function bindRemove(el: Element) {
      const btn = el.querySelector('.remove-item') as HTMLButtonElement | null;
      if (btn) {
        const handler = () => {
          const rows = (container as HTMLElement).querySelectorAll('.item-row');
          if (rows.length > 1) {
            el.remove();
            calculateTotals();
          }
        };
        btn.addEventListener('click', handler);
      }
    }

    container.querySelectorAll('.item-row').forEach((n) => {
      bindRemove(n);
      setupDragAndDrop(n);
    });

    const onAdd = () => {
      let row: Element | null = null;
      if (tpl instanceof HTMLTemplateElement) {
        const first = tpl.content.firstElementChild;
        if (first) row = first.cloneNode(true) as Element;
      }
      if (row) {
        container.appendChild(row);
        bindRemove(row);
        setupDragAndDrop(row);
        applyTaxMode();
        calculateTotals();
        // Initialize lucide icons for the new row
        try {
          const lucide = invoiceEditorGlobals.lucide;
          if (lucide && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
          }
        } catch (_e) {
          // ignore lucide init errors
        }
      }
    };
    addBtn.addEventListener('click', onAdd);

    function applyTaxMode() {
      const mode = taxModeSelect ? (taxModeSelect.value || 'invoice') : 'invoice';
      if (!container) return;
      const perLineInputs = (container as HTMLElement).querySelectorAll('.per-line-tax-input');
      perLineInputs.forEach((inp) => {
        if (!(inp instanceof HTMLElement)) return;
        if (mode === 'line') {
          inp.removeAttribute('disabled');
          inp.classList.remove('hidden');
        } else {
          inp.setAttribute('disabled','disabled');
          if (inp instanceof HTMLInputElement) inp.value = '';
          inp.classList.add('hidden');
        }
      });
      // Also toggle column header for per-line tax
      const taxHeader = document.querySelector('.items-header .per-line-tax-input');
      if (taxHeader instanceof HTMLElement) {
        if (mode === 'line') {
          taxHeader.classList.remove('hidden');
        } else {
          taxHeader.classList.add('hidden');
        }
      }
      if (invoiceTaxInput) {
        if (mode === 'invoice') {
          invoiceTaxInput.removeAttribute('disabled');
          invoiceTaxInput.parentElement?.classList.remove('hidden');
        } else {
          invoiceTaxInput.setAttribute('disabled','disabled');
          invoiceTaxInput.parentElement?.classList.add('hidden');
        }
      }
      calculateTotals();
    }

    if (taxModeSelect) taxModeSelect.addEventListener('change', applyTaxMode);
    applyTaxMode();

    // Calculate totals on load and when inputs change
    calculateTotals();
    form?.addEventListener('input', (e) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.matches('input[name="item_description"]') || t.matches('select[name="customerId"]'))) {
        validate();
      }
      // Recalculate totals when relevant inputs change
      if (t && (
        t.matches('input[name="item_quantity"]') ||
        t.matches('input[name="item_unitPrice"]') ||
        t.matches('input[name="item_tax_percent"]') ||
        t.matches('input[name="taxRate"]') ||
        t.matches('input[name="currency"]')
      )) {
        calculateTotals();
      }
    });
    
    // Recalculate when tax settings change
    taxModeSelect?.addEventListener('change', calculateTotals);
    invoiceTaxInput?.addEventListener('input', calculateTotals);
    pricesIncludeTaxSelect?.addEventListener('change', calculateTotals);
    roundingModeSelect?.addEventListener('change', calculateTotals);

    // Keyboard shortcuts
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (submitBtn && !submitBtn.disabled) {
          submitBtn.click();
        }
        return;
      }

      // Ctrl+Enter to add new item
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (addBtn && !(addBtn as HTMLButtonElement).disabled) {
          addBtn.click();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyboard);

    // Simple client-side validation
    function validate(): boolean {
      if (!container) return false;
      let valid = true;
      // Customer required
      if (customerSelect) {
        if (!customerSelect.value) {
          valid = false;
          if (customerError) {
            customerError.textContent = 'Please select a customer.';
            customerError.classList.remove('hidden');
          }
          customerSelect.classList.add('input-error', 'select-error');
        } else {
          if (customerError) customerError.classList.add('hidden');
          customerSelect.classList.remove('input-error', 'select-error');
        }
      }

      // At least one item with non-empty description
  const rows = container.querySelectorAll('.item-row');
      let hasDescription = false;
      rows.forEach((row) => {
        const desc = row.querySelector('input[name="item_description"]') as HTMLInputElement | null;
        if (desc && desc.value.trim()) hasDescription = true;
      });
      if (!hasDescription) {
        valid = false;
        if (itemsError) itemsError.classList.remove('hidden');
      } else {
        if (itemsError) itemsError.classList.add('hidden');
      }

      // Disable submit if invalid
      if (submitBtn) submitBtn.disabled = !valid;
      return valid;
    }

    // Validate on load and when inputs change
    validate();
    customerSelect?.addEventListener('change', validate);
    form?.addEventListener('input', (e) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.matches('input[name="item_description"]') || t.matches('select[name="customerId"]'))) {
        validate();
      }
    });
    form?.addEventListener('submit', (e) => {
      if (!validate()) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    return () => {
      addBtn.removeEventListener('click', onAdd);
      if (taxModeSelect) taxModeSelect.removeEventListener('change', applyTaxMode);
      customerSelect?.removeEventListener('change', validate);
      document.removeEventListener('keydown', handleKeyboard);
    };
  }, []);
  return null;
}
