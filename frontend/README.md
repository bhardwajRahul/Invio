# Invio Frontend (Deno Fresh)

Read-only admin UI for Invio backend.

- Framework: Fresh
- Auth: Basic Auth against backend ADMIN_USER/ADMIN_PASS
- Features (read-only):
  - Login (store credentials in HTTP-only cookie as base64 basic auth header)
  - Dashboard summary
  - List invoices, view invoice detail
  - List customers, view customer detail
  - View templates list
  - View settings

## Dev

Requires Deno 1.42+.

Set environment to point to backend (default http://localhost:3000):

- BACKEND_URL

Run:

```bash
deno task start
```

## Notes

This UI only performs GET requests to backend admin endpoints. No mutations.
