import { useEffect, useMemo, useState } from "preact/hooks";

type Crumb = { label: string; href?: string };

// Title-case a slug: "invoice-items" -> "Invoice Items"
function titleize(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  customers: "Customers",
  settings: "Settings",
  new: "New",
  edit: "Edit",
  html: "HTML",
  pdf: "PDF",
};

export default function Breadcrumbs() {
  const [path, setPath] = useState<string>("/");

  useEffect(() => {
    setPath(globalThis.location?.pathname || "/");
  }, []);

  const crumbs = useMemo<Crumb[]>(() => {
    try {
      const segments = path.replace(/(^\/+|\/+?$)/g, "").split("/").filter(Boolean);
      const parts: Crumb[] = [];

      // Home always present
      parts.push({ label: "Home", href: "/" });

      let hrefAcc = "";
      segments.forEach((seg, idx) => {
        hrefAcc += "/" + seg;
        const isLast = idx === segments.length - 1;
        const label = LABEL_MAP[seg] || titleize(seg);
        parts.push({ label, href: isLast ? undefined : hrefAcc });
      });

      return parts;
    } catch {
      return [{ label: "Home", href: "/" }];
    }
  }, [path]);

  if (!crumbs.length) return null;

  return (
    <div class="breadcrumbs text-sm mb-4">
      <ul>
        {crumbs.map((c, i) => (
          <li key={i}>
            {c.href ? <a href={c.href}>{c.label}</a> : <span class="font-medium">{c.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
