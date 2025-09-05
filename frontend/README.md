# Invio Frontend (Deno Fresh)

Modern, minimalist admin UI for Invio backend.

- Framework: Fresh (SSR + islands)
- Auth: Basic Auth (stored as HTTP-only cookie; proxied to backend)
- Features:
  - Login/logout
  - Dashboard summary
  - Invoices: list, filter (server-rendered), view, edit, duplicate,
    publish/unpublish, status updates, download PDF, public link
  - Customers: list, view, create, edit, delete
  - Settings: company details, logo, default template, highlight color
  - Templates UI integrated into Settings

## Dev

Requires Deno 1.42+.

Environment:

- `BACKEND_URL` — backend base URL (default http://localhost:3000)

Run:

```bash
deno task start
```

## Notes

- PDF/HTML generation links no longer take query parameters; output uses the
  saved Settings template and highlight.
- UI uses DaisyUI components and aims for good accessibility (contrast, lang
  attribute, no client-side JS for exports).
