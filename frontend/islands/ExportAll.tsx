import { useRef, useState } from "preact/hooks";

export default function ExportAll() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  async function onExportClick(ev: Event) {
    ev.preventDefault();
    if (!formRef.current) return;
    setBusy(true);
    setStatus("Preparing export...");
    try {
      const fd = new FormData(formRef.current);
      const includeDb = String(fd.get("includeDb") || "true");
      const includeJson = String(fd.get("includeJson") || "true");
      const includeAssets = String(fd.get("includeAssets") || "true");
      const username = String(fd.get("username") || "");
      const password = String(fd.get("password") || "");
      if (!username || !password) {
        setStatus("Please enter username and password.");
        return;
      }
      const basic = "Basic " + btoa(`${username}:${password}`);
      const url = `/api/admin/export/full?includeDb=${encodeURIComponent(includeDb)}&includeJson=${encodeURIComponent(includeJson)}&includeAssets=${encodeURIComponent(includeAssets)}`;
      const resp = await fetch(url, { headers: { Authorization: basic } });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `Export failed with ${resp.status}`);
      }
      const blob = await resp.blob();
      const cd = resp.headers.get("content-disposition") || 'attachment; filename="invio-export.tar.gz"';
      const m = /filename="?([^";]+)"?/i.exec(cd);
      const name = (m && m[1]) || "invio-export.tar.gz";
      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      setStatus("Export downloaded.");
    } catch (err) {
      console.error(err);
      setStatus("Export failed: " + (err && (err as Error).message ? (err as Error).message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="max-w-2xl">
      <p class="mb-3 opacity-80">Export all data as a compressed archive. You'll be asked to re-enter your admin credentials to confirm.</p>
      <form ref={formRef} class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="form-control"><div class="label"><span class="label-text">Include database file</span></div>
            <select name="includeDb" class="select select-bordered w-full"><option value="true">Yes</option><option value="false">No</option></select>
          </label>
          <label class="form-control"><div class="label"><span class="label-text">Include JSON dump</span></div>
            <select name="includeJson" class="select select-bordered w-full"><option value="true">Yes</option><option value="false">No</option></select>
          </label>
          <label class="form-control"><div class="label"><span class="label-text">Include template assets</span></div>
            <select name="includeAssets" class="select select-bordered w-full"><option value="true">Yes</option><option value="false">No</option></select>
          </label>
        </div>
        <div class="divider" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control"><div class="label"><span class="label-text">Re-enter admin username</span></div>
            <input name="username" class="input input-bordered" placeholder="admin" required />
          </label>
          <label class="form-control"><div class="label"><span class="label-text">Re-enter admin password</span></div>
            <input name="password" type="password" class="input input-bordered" placeholder="••••••••" required />
          </label>
        </div>
        <div class="pt-2 flex items-center gap-3">
          <button type="button" onClick={onExportClick} disabled={busy} class="btn btn-primary">{busy ? "Exporting..." : "Export all data"}</button>
          <span class="text-sm opacity-70">{status}</span>
        </div>
      </form>
    </div>
  );
}
