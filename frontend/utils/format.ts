// Format text for HTML display: replace newlines with <br> and escape HTML
export function formatTextWithLinebreaks(text?: string): string {
  if (!text) return "";
  // Escape HTML special chars, then replace newlines
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\r?\n/g, "<br />");
}
// Utility functions for formatting numbers and currency
export function formatMoney(
  value: number | undefined,
  currency: string = "USD",
  numberFormat: "comma" | "period" = "comma",
): string {
  if (typeof value !== "number") return "";

  // Create a custom locale based on the number format preference
  let locale: string;
  let options: Intl.NumberFormatOptions;

  if (numberFormat === "period") {
    // European style: 1.000,00
    locale = "de-DE"; // German locale uses period as thousands separator and comma as decimal
    options = { style: "currency", currency };
  } else {
    // US style: 1,000.00
    locale = "en-US";
    options = { style: "currency", currency };
  }

  return new Intl.NumberFormat(locale, options).format(value);
}

// Helper function to get number format from settings
export function getNumberFormat(
  settings?: Record<string, unknown>,
): "comma" | "period" {
  const format = (settings?.numberFormat as string) || "comma";
  return format === "period" ? "period" : "comma";
}
