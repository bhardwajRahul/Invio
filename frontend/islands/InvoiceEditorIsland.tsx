import { useEffect } from "preact/hooks";

export default function InvoiceEditorIsland() {
  useEffect(() => {
    const addBtn = document.getElementById('add-item');
    const container = document.getElementById('items-container');
    const tpl = document.getElementById('item-template') as HTMLTemplateElement | null;
    const taxModeSelect = document.getElementById('tax-mode-select') as HTMLSelectElement | null;
    const invoiceTaxInput = document.getElementById('invoice-tax-rate-input') as HTMLInputElement | null;
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

    return () => {
      addBtn.removeEventListener('click', onAdd);
      if (taxModeSelect) taxModeSelect.removeEventListener('change', applyTaxMode);
    };
  }, []);
  return null;
}
