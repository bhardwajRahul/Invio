import { JSX } from "preact/jsx-runtime";
import InvoiceEditorIsland from "../islands/InvoiceEditorIsland.tsx";

type Customer = { id: string; name: string };
type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  // Optional single tax percent for UI (maps to a single-entry taxes array backend)
  taxPercent?: number;
};

export function InvoiceEditor(props: {
  mode: "create" | "edit";
  customers?: Customer[];
  selectedCustomerId?: string;
  customerName?: string;
  currency?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  invoiceNumber?: string;
  invoiceNumberPrefill?: string;
  taxRate?: number;
  pricesIncludeTax?: boolean;
  roundingMode?: string;
  taxMode?: 'invoice' | 'line';
  notes?: string;
  paymentTerms?: string;
  items: Item[];
  showDates?: boolean;
  issueDate?: string;
  dueDate?: string;
  demoMode?: boolean;
  invoiceNumberError?: string;
}): JSX.Element {
  const items = props.items && props.items.length > 0
    ? props.items
    : [{ description: "", quantity: 1, unitPrice: 0 }];
  return (
    <div class="space-y-4">
      {/* Header fields */}
  <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div class="form-control">
          <div class="label">
            <span class="label-text">Customer</span>
          </div>
          {props.mode === "create" && props.customers?.length
            ? (
              <select
                name="customerId"
                class="select select-bordered w-full"
                required
                value={props.selectedCustomerId || ""}
              >
                <option value="">Select customer</option>
                {props.customers.map((c) => (
                  <option value={c.id}>{c.name}</option>
                ))}
              </select>
            )
            : (
              <input
                value={props.customerName || ""}
                disabled
                class="input input-bordered w-full"
              />
            )}
        </div>
        <div class="form-control">
          <div class="label">
            <span class="label-text">Invoice Number</span>
          </div>
          <input
            name="invoiceNumber"
            value={props.invoiceNumber || props.invoiceNumberPrefill || ""}
            class="input input-bordered w-full"
            placeholder="e.g. INV-2025-001"
            data-writable
            disabled={props.demoMode}
          />
          {props.invoiceNumberError && (
            <div class="text-error text-xs mt-1">{props.invoiceNumberError}</div>
          )}
        </div>
        <div class="form-control">
          <div class="label">
            <span class="label-text">Currency</span>
          </div>
          <input
            name="currency"
            value={props.currency || "USD"}
            class="input input-bordered w-full"
          />
        </div>
        <div class="form-control">
          <div class="label">
            <span class="label-text">Status</span>
          </div>
          <select
            name="status"
            class="select select-bordered w-full"
            value={props.status || "draft"}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {props.showDates && (
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label">
              <span class="label-text">Issue Date</span>
            </div>
            <input
              type="date"
              name="issueDate"
              value={props.issueDate || new Date().toISOString().slice(0, 10)}
              class="input input-bordered w-full"
            />
          </label>
          <label class="form-control">
            <div class="label">
              <span class="label-text">Due Date</span>
            </div>
            <input
              type="date"
              name="dueDate"
              value={props.dueDate || ""}
              class="input input-bordered w-full"
            />
          </label>
        </div>
      )}

      {/* Items */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm">Items</label>
          <button type="button" id="add-item" class="btn btn-sm" data-writable disabled={props.demoMode}>
            <i data-lucide="plus" class="w-4 h-4"></i>Add item
          </button>
        </div>
        <div id="items-container" class="space-y-2">
          {items.map((it) => (
            <div class="item-row flex flex-col sm:flex-row sm:flex-nowrap items-center gap-2">
              <input
                name="item_description"
                value={it.description}
                placeholder="Description"
                class="input input-bordered flex-1 min-w-0"
                data-writable
                disabled={props.demoMode}
              />
              <input
                type="number"
                step="1"
                min="1"
                name="item_quantity"
                value={String(it.quantity)}
                class="input input-bordered w-16 sm:w-20 shrink-0"
                data-writable
                disabled={props.demoMode}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                name="item_unitPrice"
                value={String(it.unitPrice)}
                class="input input-bordered w-24 shrink-0"
                data-writable
                disabled={props.demoMode}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                name="item_tax_percent"
                value={typeof it.taxPercent === 'number' ? String(it.taxPercent) : ''}
                placeholder="Tax %"
                class="input input-bordered w-24 shrink-0 per-line-tax-input"
                data-writable
                disabled={props.demoMode}
                title="Per-line tax rate (%)"
              />
              <input
                name="item_notes"
                value={it.notes || ""}
                placeholder="Notes"
                class="input input-bordered w-40 max-w-xs shrink-0"
                data-writable
                disabled={props.demoMode}
              />
              <button
                type="button"
                class="remove-item btn btn-ghost btn-square btn-sm shrink-0"
                aria-label="Remove item"
                data-writable
                disabled={props.demoMode}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <template id="item-template">
          <div class="item-row flex flex-col sm:flex-row sm:flex-nowrap items-center gap-2">
            <input
              name="item_description"
              placeholder="Description"
              class="input input-bordered flex-1 min-w-0"
              data-writable
              disabled={props.demoMode}
            />
            <input
              type="number"
              step="1"
              min="1"
              name="item_quantity"
              value="1"
              class="input input-bordered w-16 sm:w-20 shrink-0"
              data-writable
              disabled={props.demoMode}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              name="item_unitPrice"
              value="0"
              class="input input-bordered w-24 shrink-0"
              data-writable
              disabled={props.demoMode}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              name="item_tax_percent"
              placeholder="Tax %"
              class="input input-bordered w-24 shrink-0 per-line-tax-input"
              data-writable
              disabled={props.demoMode}
              title="Per-line tax rate (%)"
            />
            <input
              name="item_notes"
              placeholder="Notes"
              class="input input-bordered w-40 max-w-xs shrink-0"
              data-writable
              disabled={props.demoMode}
            />
            <button
              type="button"
              class="remove-item btn btn-ghost btn-square btn-sm shrink-0"
              aria-label="Remove item"
              data-writable
              disabled={props.demoMode}
            >
              ×
            </button>
          </div>
        </template>
      </div>

      {/* Tax settings */}
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <label class="form-control">
          <div class="label">
            <span class="label-text">Tax Mode</span>
          </div>
          <select
            name="taxMode"
            id="tax-mode-select"
            class="select select-bordered w-full"
            value={props.taxMode || 'invoice'}
            disabled={props.demoMode}
          >
            <option value="invoice">Invoice total</option>
            <option value="line">Per line</option>
          </select>
        </label>
        <label class="form-control">
          <div class="label">
            <span class="label-text">Tax Rate (%)</span>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            name="taxRate"
            value={String(typeof props.taxRate === 'number' ? props.taxRate : 0)}
            class="input input-bordered w-full"
            data-writable
            disabled={props.demoMode}
            id="invoice-tax-rate-input"
          />
        </label>
        <label class="form-control">
          <div class="label">
            <span class="label-text">Prices include tax?</span>
          </div>
          <select
            name="pricesIncludeTax"
            class="select select-bordered w-full"
            value={(props.pricesIncludeTax ? 'true' : 'false')}
            disabled={props.demoMode}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <label class="form-control">
          <div class="label">
            <span class="label-text">Rounding mode</span>
          </div>
          <select
            name="roundingMode"
            class="select select-bordered w-full"
            value={props.roundingMode || 'line'}
            disabled={props.demoMode}
          >
            <option value="line">Round per line</option>
            <option value="total">Round on totals</option>
          </select>
        </label>
      </div>

      {/* Payment Terms & Notes */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="form-control">
          <div class="label">
            <span class="label-text">Payment Terms</span>
          </div>
          <input
            name="paymentTerms"
            value={props.paymentTerms || ""}
            placeholder="e.g. Due in 30 days"
            class="input input-bordered w-full"
            data-writable
            disabled={props.demoMode}
          />
        </label>
        <label class="form-control">
          <div class="label">
            <span class="label-text">Notes</span>
          </div>
          <textarea name="notes" class="textarea textarea-bordered" rows={3} data-writable disabled={props.demoMode}>
            {props.notes || ""}
          </textarea>
        </label>
      </div>

      <InvoiceEditorIsland />
    </div>
  );
}
