import { useEffect } from "preact/hooks";

export default function InvoiceEditorIsland() {
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
    if (!addBtn || !container || !tpl) return;

    function bindRemove(el: Element) {
      const btn = el.querySelector('.remove-item') as HTMLButtonElement | null;
      if (btn) {
        const handler = () => {
          const rows = (container as HTMLElement).querySelectorAll('.item-row');
          if (rows.length > 1) el.remove();
        };
        btn.addEventListener('click', handler);
      }
    }

    container.querySelectorAll('.item-row').forEach((n) => bindRemove(n));

    const onAdd = () => {
      let row: Element | null = null;
      if (tpl instanceof HTMLTemplateElement) {
        const first = tpl.content.firstElementChild;
        if (first) row = first.cloneNode(true) as Element;
      }
      if (row) {
        container.appendChild(row);
        bindRemove(row);
        applyTaxMode();
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
      if (invoiceTaxInput) {
        if (mode === 'invoice') {
          invoiceTaxInput.removeAttribute('disabled');
          invoiceTaxInput.parentElement?.classList.remove('hidden');
        } else {
          invoiceTaxInput.setAttribute('disabled','disabled');
          invoiceTaxInput.parentElement?.classList.add('hidden');
        }
      }
    }

    if (taxModeSelect) taxModeSelect.addEventListener('change', applyTaxMode);
    applyTaxMode();

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
    };
  }, []);
  return null;
}
