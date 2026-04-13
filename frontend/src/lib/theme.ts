const THEME_KEY = "theme";
const DEFAULT_THEME = "invio-dark";

function getStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (_err) {
    return null;
  }
}

export function setTheme(theme: string) {
  const normalizedTheme = theme ?? DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", normalizedTheme);
  try {
    localStorage.setItem(THEME_KEY, normalizedTheme);
  } catch (_err) {
    // ignore
  }
}

export function setThemeFromStorage() {
  const storedTheme = getStoredTheme();
  const currentTheme = document.documentElement.getAttribute("data-theme");

  if (storedTheme == null) {
    setTheme(DEFAULT_THEME);
  } else if (storedTheme != currentTheme) {
    setTheme(storedTheme);
  }
}

export function getTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  return currentTheme ?? getStoredTheme() ?? DEFAULT_THEME;
}
