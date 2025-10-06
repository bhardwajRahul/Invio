import { useEffect } from "preact/hooks";

export default function LucideInit() {
  useEffect(() => {
    try {
      // deno-lint-ignore no-explicit-any
      const lucide = (globalThis as any).lucide;
      if (lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons();
      }
    } catch (_err) { /* ignore */ }
  }, []);
  return null;
}
