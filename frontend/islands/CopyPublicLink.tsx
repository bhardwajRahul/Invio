import { useEffect } from "preact/hooks";

export default function CopyPublicLink() {
  useEffect(() => {
    const btn = document.getElementById("copy-public-link");
    const urlEl = document.getElementById("public-link-url");
    if (!btn || !urlEl) return;
    const onClick = async () => {
      try {
        const text = urlEl.textContent || (urlEl as HTMLAnchorElement).href || "";
        await navigator.clipboard.writeText(text);
        const original = btn.textContent || "Copy link";
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = original; }, 1200);
      } catch (_e) {/* ignore */}
    };
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }, []);
  return null;
}
