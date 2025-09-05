(function () {
  try {
    // If no explicit theme, prefer system; DaisyUI theme-controller persists automatically
    const root = document.documentElement;
    const saved = globalThis.localStorage?.getItem("theme");
    if (saved) {
      root.setAttribute("data-theme", saved);
    } else {
      const prefersDark = globalThis.matchMedia && globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  } catch (_err) {
    // ignore theme init errors
  }
})();

(function () {
  function init() {
    try {
      const lucide = globalThis.lucide;
      if (lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons();
      }
    } catch (_err) {
      // ignore lucide init errors
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();
})();
