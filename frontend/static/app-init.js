(function () {
  try {
    const root = document.documentElement;
    root.setAttribute("data-theme", "light");
  try { globalThis.localStorage && localStorage.removeItem("theme"); } catch(_e) { /* ignore */ }
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
