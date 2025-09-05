<p align="center">
  <img src="./assets/banner-default.png" alt="Invio" width="100%" />
</p>
Open‑source minimalist invoicing

Invio is a clean, fast invoicing app. Create an invoice, share a link, download
a great‑looking PDF.

Monorepo layout:

- `backend/` — Deno + Hono JSON API, SQLite storage
- `frontend/` — Deno Fresh UI (SSR), DaisyUI, accessible by default

Getting started (quick):

- See `backend/README.md` for API setup, environment variables, and health
  checks
- See `frontend/README.md` for running the UI and environment config

Current feature set (v1):

- Invoice numbering (draft prefixes, finalized on publish)
- Overdue logic derived from due date for unpaid invoices
- Duplicate/clone invoice
- Due date editing and status updates
- Public share links with HTML/PDF rendering (uses saved Settings; no query
  params)

Roadmap and full documentation will be published separately.
