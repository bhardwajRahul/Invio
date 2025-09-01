import { JSX } from "preact/jsx-runtime";

type Customer = { id: string; name: string };
type Item = { description: string; quantity: number; unitPrice: number; notes?: string };

export function InvoiceEditor(props: {
  mode: "create" | "edit";
  customers?: Customer[];
  selectedCustomerId?: string;
  customerName?: string;
  currency?: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  notes?: string;
  items: Item[];
  showDates?: boolean;
  issueDate?: string;
  dueDate?: string;
}): JSX.Element {
  const items = props.items && props.items.length > 0 ? props.items : [{ description: "", quantity: 1, unitPrice: 0 }];
  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="form-control">
          <div class="label"><span class="label-text">Customer</span></div>
          {props.mode === "create" && props.customers?.length ? (
            <select name="customerId" class="select select-bordered w-full" required value={props.selectedCustomerId || ""}>
              <option value="">Select customer</option>
              {props.customers.map((c) => (
                <option value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <input value={props.customerName || ""} disabled class="input input-bordered w-full" />
          )}
        </div>
        <div class="form-control">
          <div class="label"><span class="label-text">Currency</span></div>
          <input name="currency" value={props.currency || "USD"} class="input input-bordered w-full" />
        </div>
        <div class="form-control">
          <div class="label"><span class="label-text">Status</span></div>
          <select name="status" class="select select-bordered w-full" value={props.status || "draft"}>
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
            <div class="label"><span class="label-text">Issue Date</span></div>
            <input type="date" name="issueDate" value={props.issueDate || new Date().toISOString().slice(0, 10)} class="input input-bordered w-full" />
          </label>
          <label class="form-control">
            <div class="label"><span class="label-text">Due Date</span></div>
            <input type="date" name="dueDate" value={props.dueDate || ""} class="input input-bordered w-full" />
          </label>
        </div>
      )}

      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm">Items</label>
          <button type="button" id="add-item" class="btn btn-sm">+ Add item</button>
        </div>
        <div id="items-container" class="space-y-3">
          {items.map((it) => (
            <div class="grid grid-cols-1 sm:grid-cols-8 gap-2 items-end item-row">
              <input name="item_description" value={it.description} placeholder="Description" class="input input-bordered sm:col-span-4 min-w-0" />
              <input type="number" step="1" min="1" name="item_quantity" value={String(it.quantity)} class="input input-bordered sm:col-span-1 min-w-0" />
              <input type="number" step="0.01" min="0" name="item_unitPrice" value={String(it.unitPrice)} class="input input-bordered sm:col-span-1 min-w-0" />
              <input name="item_notes" value={it.notes || ""} placeholder="Notes" class="input input-bordered sm:col-span-1 min-w-0" />
              <div class="sm:col-span-1 flex justify-center">
                <button type="button" class="remove-item btn btn-ghost btn-sm" aria-label="Remove item">×</button>
              </div>
            </div>
          ))}
        </div>
        <template id="item-template">
          <div class="grid grid-cols-1 sm:grid-cols-8 gap-2 items-end item-row">
            <input name="item_description" placeholder="Description" class="input input-bordered sm:col-span-4 min-w-0" />
            <input type="number" step="1" min="1" name="item_quantity" value="1" class="input input-bordered sm:col-span-1 min-w-0" />
            <input type="number" step="0.01" min="0" name="item_unitPrice" value="0" class="input input-bordered sm:col-span-1 min-w-0" />
            <input name="item_notes" placeholder="Notes" class="input input-bordered sm:col-span-1 min-w-0" />
            <div class="sm:col-span-1 flex justify-center">
              <button type="button" class="remove-item btn btn-ghost btn-sm" aria-label="Remove item">×</button>
            </div>
          </div>
        </template>
      </div>

      <div>
        <label class="form-control">
          <div class="label"><span class="label-text">Notes</span></div>
          <textarea name="notes" class="textarea textarea-bordered" rows={3}>{props.notes || ""}</textarea>
        </label>
      </div>

      {/* Minimal inline script to add/remove item rows */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(() => {
            const addBtn = document.getElementById('add-item');
            const container = document.getElementById('items-container');
            const tpl = document.getElementById('item-template');
            if (!addBtn || !container || !tpl) return;
            function bindRemove(el) {
              const btn = el.querySelector('.remove-item');
              if (btn) {
                btn.addEventListener('click', () => {
                  const rows = container.querySelectorAll('.item-row');
                  if (rows.length > 1) el.remove();
                });
              }
            }
            Array.prototype.forEach.call(container.querySelectorAll('.item-row'), bindRemove);
            addBtn.addEventListener('click', () => {
              let row = null;
              if (tpl instanceof HTMLTemplateElement) {
                const first = tpl.content.firstElementChild;
                if (first) row = first.cloneNode(true);
              }
              if (row) {
                container.appendChild(row);
                bindRemove(row);
              }
            });
          })();`
        }}
      />
    </div>
  );
}
