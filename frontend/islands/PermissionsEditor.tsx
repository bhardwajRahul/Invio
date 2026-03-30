/**
 * Tiny island that adds "Select All" / "Clear All" buttons for the
 * permissions grid rendered by the PermissionsGrid server component.
 * It manipulates checkboxes via the DOM — no prop serialisation required.
 */

export default function PermissionsToggle() {
  function selectAll() {
    const grid = document.getElementById("permissions-grid");
    if (!grid) return;
    grid
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((cb) => {
        cb.checked = true;
      });
  }

  function clearAll() {
    const grid = document.getElementById("permissions-grid");
    if (!grid) return;
    grid
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((cb) => {
        cb.checked = false;
      });
  }

  return (
    <div class="flex gap-2 mb-3">
      <button type="button" class="btn btn-xs btn-outline" onClick={selectAll}>
        Select All
      </button>
      <button type="button" class="btn btn-xs btn-outline" onClick={clearAll}>
        Clear All
      </button>
    </div>
  );
}
