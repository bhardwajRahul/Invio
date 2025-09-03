# Invio — Clean Open‑Source Invoicing

Plain, fast invoicing without enterprise bloat. Create an invoice, share a link, download a good‑looking PDF. That’s it.

## Highlights

- Simple, JSON API (Deno + Elysia), versioned at `/api/v1`
- Admin area behind Basic Auth (env: ADMIN_USER/ADMIN_PASS)
- Public share links for each invoice (no login)
- HTML and PDF renderers using the same templates
- Two built‑in templates: `professional-modern`, `minimalist-clean`
- Smart logo on the left (auto-fills company info block height), theme color, and layout that “just works” in PDFs
- wkhtmltopdf pipeline with pdf-lib fallback (works even without wkhtmltopdf)
- No client-side JS required for rendering (faster, deterministic)

## Project Structure

```
deno-elysia-invoice-app
├── src
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

1) Install Deno: https://deno.land

2) Optional (faster PDFs): Install wkhtmltopdf (Ubuntu 20.04)
```bash
sudo apt-get update
sudo apt-get install -y wkhtmltopdf
```

3) Env
```
ADMIN_USER=admin
ADMIN_PASS=supersecret
```

4) Initialize DB (if applicable to your storage):
```bash
deno run --allow-read --allow-write src/database/init.ts
```

5) Run the server:
```bash
deno run --allow-net --allow-read --allow-write --allow-env src/app.ts
```

Server starts on http://localhost:3000

## API (v1)

Principles
- JSON only
- ISO dates, currency codes; totals computed server-side
- Minimal endpoints to create, share, download

### Auth
- Admin routes use Basic Auth (from ENV).
- Public routes use a share token (no auth).

### Settings
- GET `/api/v1/settings`
- PATCH `/api/v1/settings`
  - Supported keys (minimal and practical):
    - `companyName`, `address`, `email`, `phone`, `taxId`
    - `logo` (data URL or URL)
    - `templateId` (`professional-modern` | `minimalist-clean`)
    - `highlight` (hex color like `#6B4EFF`)
  - brand layout is fixed to `logo-left`

Example:
```bash
curl -u admin:supersecret -H "Content-Type: application/json" \
  -X PATCH http://localhost:3000/api/v1/settings \
  -d '{"companyName":"Your Company","logo":"https://example.com/logo.png","templateId":"professional-modern","highlight":"#6B4EFF"}'
```

### Invoices (admin)
- POST `/api/v1/invoices`
- GET `/api/v1/invoices`
- GET `/api/v1/invoices/:id`
- PUT `/api/v1/invoices/:id`
- DELETE `/api/v1/invoices/:id`
- POST `/api/v1/invoices/:id/publish` → assigns share token

Invoice payload (trimmed):
```json
{
  "customer": {"name":"Acme","email":"a@acme.test","address":"123 Road"},
  "issue_date":"2025-01-15",
  "due_date":"2025-02-15",
  "currency":"USD",
  "items":[
  {"description":"Service","quantity":1,"unit_price":500000}
  ],
  "tax": {"rate_percent": 8.75},
  "discount": {"amount": 50000},
  "notes":"Thanks!"
}
```

### Public (no login)
- GET `/api/v1/public/invoices/:share_token` → JSON invoice
- GET `/api/v1/public/invoices/:share_token/html?template=&highlight=` → HTML page
- GET `/api/v1/public/invoices/:share_token/pdf?template=&highlight=` → PDF download

Query params
- `template`:
  - `professional-modern` (or `professional`)
  - `minimalist-clean` (or `minimalist`)
- `highlight`: hex color e.g. `#22AA55`

Examples:
```bash
# HTML view
curl -s "http://localhost:3000/api/v1/public/invoices/<token>/html?template=minimalist&highlight=%2322aa55" > invoice.html

# PDF download
curl -s "http://localhost:3000/api/v1/public/invoices/<token>/pdf?template=professional&highlight=%236B4EFF" -o invoice.pdf
```

## Rendering

- The same HTML builder powers both the public HTML view and the PDF.
- wkhtmltopdf (if available) produces high‑fidelity PDFs; otherwise the pdf‑lib fallback renders a clean, minimalist layout.
- Templates are tuned for reliability:
  - Logo sits on the left and auto-fits the company info block height.
  - No client-side JS needed; faster and consistent.

## Ethos

- Focus on invoices. No CRM, projects, subscriptions, or accounting layers.
- Keep defaults sensible and the API tiny.
- Make sharing and downloading a good-looking