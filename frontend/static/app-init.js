(function () {
  try {
    const t = globalThis.localStorage
      ? (globalThis.localStorage.getItem("theme") || "light")
      : "light";
    document.documentElement.setAttribute("data-theme", t);
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
