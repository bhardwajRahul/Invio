const CITY_FIRST_POSTAL_COUNTRIES = new Set([
  "US",
  "GB",
  "BR",
  "AU",
  "CA",
  "NZ",
  "IE",
  "MX",
]);

export function formatPostalCityLine(
  city?: string,
  postalCode?: string,
  countryCode?: string,
  format?: string,
): string {
  const place = (city || "").trim();
  const postal = (postalCode || "").trim();
  if (!place && !postal) return "";
  if (!place) return postal;
  if (!postal) return place;

  if (format === "city-postal") {
    return `${place} ${postal}`;
  }
  if (format === "postal-city") {
    return `${postal} ${place}`;
  }

  const country = (countryCode || "").trim().toUpperCase();
  if (CITY_FIRST_POSTAL_COUNTRIES.has(country)) {
    return `${place} ${postal}`;
  }
  return `${postal} ${place}`;
}
