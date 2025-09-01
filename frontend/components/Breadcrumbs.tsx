type Crumb = { label: string; href?: string };

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
  templates: "Templates",
  settings: "Settings",
  new: "New",
  edit: "Edit",
  html: "HTML",
  pdf: "PDF",
};

export function Breadcrumbs(props: { path?: string }) {
  const path = props.path || "/";
  const segments = path.replace(/(^\/+|\/+?$)/g, "").split("/").filter(Boolean);
  // Only show breadcrumbs on subpages (e.g., /section/subpage), not on top-level pages like /dashboard or /invoices
  if (segments.length < 2) return null as unknown as never;

  const crumbs: Crumb[] = [];
  let hrefAcc = "";
  segments.forEach((seg, idx) => {
    hrefAcc += "/" + seg;
    const isLast = idx === segments.length - 1;
    const label = LABEL_MAP[seg] || titleize(seg);
    crumbs.push({ label, href: isLast ? undefined : hrefAcc });
  });

  return (
    <div class="breadcrumbs text-sm mb-4">
      <ul>
        {crumbs.map((c, i) => (
          <li key={i}>{c.href ? <a href={c.href}>{c.label}</a> : <span class="font-medium">{c.label}</span>}</li>
        ))}
      </ul>
    </div>
  );
}
