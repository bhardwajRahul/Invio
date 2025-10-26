import { useState } from "preact/hooks";
type Props = { demoMode?: boolean };

function getAuthHeaderFromCookie(cookie: string): string | null {
  const parts = cookie.split(/;\s*/);
  for (const p of parts) {
    const i = p.indexOf("=");
    if (i === -1) continue;
    const k = decodeURIComponent(p.slice(0, i));
    const v = decodeURIComponent(p.slice(i + 1));
    if (k === "invio_session" && v) return `Bearer ${v}`;
  }
  return null;
}

export default function InstallTemplateForm({ demoMode }: Props) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
  <form
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        const u = url.trim();
        if (!u) return setErr("Enter a manifest URL");
        try {
          setBusy(true);
          const auth = getAuthHeaderFromCookie(document.cookie);
          const res = await fetch("/api/templates/install", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(auth ? { Authorization: auth } : {}),
            },
            body: JSON.stringify({ url: u }),
          });
          if (!res.ok) {
            let message = `${res.status} ${res.statusText}`;
            try {
              const data = await res.json();
              if (data && (data.error || data.message)) {
                message = String(data.error || data.message);
              }
            } catch (_) { /* ignore parse issues */ }
            throw new Error(message);
          }
          globalThis.location?.reload();
        } catch (e) {
          setErr(String(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label class="form-control">
        <div class="label"><span class="label-text">Install from Manifest URL</span></div>
        <div class="flex gap-2">
          <input
            name="manifestUrl"
            class="input input-bordered w-full"
            placeholder="https://.../manifest.yaml"
            value={url}
            onInput={(e) => setUrl((e.currentTarget as HTMLInputElement).value)}
          />
          <button type="submit" class="btn btn-primary" disabled={busy}>Install</button>
        </div>
        {err && <span class="text-error text-sm mt-1">{err}</span>}
        {demoMode && <span class="text-sm mt-1 text-muted">Demo mode: installation will be blocked (read-only)</span>}
      </label>
    </form>
  );
}
