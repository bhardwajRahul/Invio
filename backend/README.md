# Invio — Backend API

Plain, fast invoicing without enterprise bloat. Create an invoice, share a link,
download a good‑looking PDF. That’s it.

## Highlights

- Simple JSON API (Deno + Hono) at `/api/v1`
- Admin endpoints behind JWT bearer auth (ADMIN_USER/ADMIN_PASS bootstrap)
- Public share links per invoice (no login)
- HTML and PDF renderers share the same templates
- UBL 2.1 (PEPPOL BIS Billing 3.0) XML export for each invoice
- Built‑in templates: `professional-modern`, `minimalist-clean`
- Smart logo-left layout, global highlight color, predictable PDFs
- wkhtmltopdf pipeline with pdf-lib fallback (works even without wkhtmltopdf)
- No client-side JS needed for rendering
- Demo mode with writable sandbox that auto-resets periodically

## Project Structure

```
invio-backend
├── src
JWT_SECRET=...
# Optional security header toggles
# SECURE_HEADERS_DISABLED=false
# ENABLE_HSTS=true
# CONTENT_SECURITY_POLICY="default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'"
│   ├── app.ts
│   ├── routes
│   │   ├── admin.ts
│   │   ├── public.ts
│   │   └── auth.ts
│   ├── middleware
│   │   ├── auth.ts
│   │   └── cors.ts
│   ├── controllers
│   │   ├── invoices.ts
│   │   ├── customers.ts
│   │   ├── templates.ts
│   │   └── settings.ts
│   ├── models
│   │   ├── invoice.ts
│   │   ├── customer.ts
│   │   ├── template.ts
│   │   └── setting.ts
│   ├── database
│   │   ├── init.ts
│   │   └── migrations.sql
│   ├── utils
│   │   ├── jwt.ts
│   │   ├── pdf.ts          ← HTML builder + PDF generators
│   │   └── uuid.ts
│   └── types
│       └── index.ts
├── static
│   └── templates
└── deno.json
```

## Setup

1. Install Deno: https://deno.land

2. Optional (faster PDFs): Install wkhtmltopdf (Ubuntu 20.04)

```bash
sudo apt-get update
sudo apt-get install -y wkhtmltopdf
```

3. Env

```
ADMIN_USER=admin
ADMIN_PASS=supersecret
```

4. Initialize DB (if applicable to your storage):

```bash
deno run --allow-read --allow-write src/database/init.ts
```

5. Run the server:

```bash
deno run --allow-net --allow-read --allow-write --allow-env src/app.ts
```

Server starts on http://localhost:3000

Health check:

```bash
curl -s http://localhost:3000/health
```

## API (v1)

Principles

- JSON only
- ISO dates, currency codes; totals computed server-side
- Minimal endpoints to create, share, download

### Auth

- Admin routes require a JWT obtained via `/api/v1/auth/login` using the admin credentials from env.
- Public routes use a share token (no auth).

### Settings

- GET `/api/v1/settings`
- PATCH `/api/v1/settings`
  - Supported keys (minimal and practical):
  - `companyName`, `companyAddress`, `companyEmail`, `companyPhone`,
    `companyTaxId`
    - `logo` (data URL or URL)
    - `templateId` (`professional-modern` | `minimalist-clean`)
    - `highlight` (hex color like `#6B4EFF`)
  - brand layout is fixed to `logo-left`

Example:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"supersecret"}' | jq -r '.token')

curl -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -X PATCH http://localhost:3000/api/v1/settings \
  -d '{"companyName":"Your Company","logo":"https://example.com/logo.png","templateId":"professional-modern","highlight":"#6B4EFF"}'
```

### Invoices (admin)

- POST `/api/v1/invoices`
- GET `/api/v1/invoices`
- GET `/api/v1/invoices/:id`
- PUT `/api/v1/invoices/:id`
- DELETE `/api/v1/invoices/:id`
- POST `/api/v1/invoices/:id/publish` → assigns share token, transitions draft
  to sent and finalizes invoice number
- POST `/api/v1/invoices/:id/unpublish` → rotates share token and sets status
  back to draft
- POST `/api/v1/invoices/:id/duplicate` → clones the invoice as a new draft

Invoice payload (trimmed):

```json
{
  "customer": { "name": "Acme", "email": "a@acme.test", "address": "123 Road" },
  "issue_date": "2025-01-15",
  "due_date": "2025-02-15",
  "currency": "USD",
  "items": [
    { "description": "Service", "quantity": 1, "unit_price": 500000 }
  ],
  "tax": { "rate_percent": 8.75 },
  "discount": { "amount": 50000 },
  "notes": "Thanks!"
}
```

### Public (no login)

- GET `/api/v1/public/invoices/:share_token` → JSON invoice
- GET `/api/v1/public/invoices/:share_token/html` → HTML page
- GET `/api/v1/public/invoices/:share_token/pdf` → PDF download
- GET `/api/v1/public/invoices/:share_token/ubl.xml` → UBL XML download (legacy path)
- GET `/api/v1/public/invoices/:share_token/xml` → XML download (select profile via `?profile=ubl21` etc.)
- GET `/api/v1/public/xml-profiles` → list built-in XML profiles

Query params: none (generation now uses saved Settings only)

Examples:

```bash
# HTML view
curl -s "http://localhost:3000/api/v1/public/invoices/<token>/html" > invoice.html

# PDF download
curl -s "http://localhost:3000/api/v1/public/invoices/<token>/pdf" -o invoice.pdf

# UBL XML download (legacy)
curl -s "http://localhost:3000/api/v1/public/invoices/<token>/ubl.xml" -o invoice.xml

# Generic XML (select profile)
curl -s "http://localhost:3000/api/v1/public/invoices/<token>/xml?profile=ubl21" -o invoice.xml
```

## Rendering

- The same HTML builder powers both the public HTML view and the PDF.
- wkhtmltopdf (if available) produces high‑fidelity PDFs; otherwise the pdf‑lib
  fallback renders a clean, minimalist layout.
- Templates are tuned for reliability:
  - Logo sits on the left and auto-fits the company info block height.
  - No client-side JS needed; faster and consistent.

## Behavior notes

- Invoice numbering: drafts use `DRAFT-YYYYMMDD-XXX` until published; on publish
  a final number is assigned and locked.
- Overdue status: automatically derived for unpaid invoices past due date;
  setting status to paid suppresses overdue.
- Duplicate/clone: creates a new draft with a new ID and draft number; share
  token is not copied.

  ### UBL / PEPPOL settings

  The UBL generator uses business settings for seller data and invoice/customer
  data for buyer details. Optional PEPPOL endpoint IDs can be configured via
  settings:

  - `peppolSellerEndpointId` (e.g., `0192:123456785`)
  - `peppolSellerEndpointSchemeId` (e.g., `0192`)
  - `peppolBuyerEndpointId`
  - `peppolBuyerEndpointSchemeId`
  - `companyCountryCode` (ISO alpha-2, default `US`)

  If these are left empty, the XML remains valid but omits the corresponding
  EndpointID elements.

### Demo mode

When `DEMO_MODE=true`, the API is fully writable so you can try creating and
editing data. The database automatically resets to a pristine snapshot every 3
hours by default.

Environment variables:

- `DEMO_MODE=true` — enable demo mode
- `DEMO_DB_PATH` — path to the pristine demo database file (e.g.
  `/app/data/invio-demo.db`)
- `DATABASE_PATH` — active database file that the app writes to (e.g.
  `/app/data/invio.db`)
- `DEMO_RESET_HOURS` — interval in hours between resets (default: `3`)
- `DEMO_RESET_ON_START` — whether to perform a reset on startup (default:
  `true`)

On each reset, the server briefly closes the DB connection, copies the pristine
demo DB over the active DB, and reinitializes migrations and built-in templates.

## Ethos

- Focus on invoices. No CRM, projects, subscriptions, or accounting layers.
- Keep defaults sensible and the API tiny.
- Make sharing and downloading a good-looking
