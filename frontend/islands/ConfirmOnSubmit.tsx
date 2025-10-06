import { useEffect } from "preact/hooks";

export default function ConfirmOnSubmit() {
  useEffect(() => {
    const onSubmit = (e: Event) => {
      const t = e.target as Element | null;
      if (!t) return;
      const el = t as HTMLElement;
      // Guard: ensure matches exists on the element
      // deno-lint-ignore no-explicit-any
      const matches: ((sel: string) => boolean) | undefined = (el as any).matches;
      if (typeof matches === "function" && matches.call(el, "form[data-confirm]")) {
        const msg = el.getAttribute("data-confirm") || "Are you sure?";
        if (!globalThis.confirm(msg)) {
          e.preventDefault();
        }
      }
    };
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);
  return null;
}
