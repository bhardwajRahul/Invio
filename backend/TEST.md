# Invio API Testing Guide

## Prerequisites
- API running on `http://localhost:3000`
- Admin credentials: `admin:supersecret` (from .env)
- `curl` and `jq` for JSON formatting

## Quick Test Commands

### 1. Health Check
```bash
curl http://localhost:3000/
```

### 2. Admin Authentication Test
```bash
# Should fail (401)
curl http://localhost:3000/api/v1/invoices

# Should work
curl -u admin:supersecret http://localhost:3000/api/v1/invoices
```

### 3. Create Customer
```bash
curl -u admin:supersecret -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "email": "test@example.com",
    "address": "123 Test St"
  }'
```

### 4. Create Invoice
```bash
curl -u admin:supersecret -X POST http://localhost:3000/api/v1/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID_HERE",
    "issueDate": "2025-01-15",
    "dueDate": "2025-02-15",
    "status": "draft",
    "notes": "Test invoice",
    "items": [
      {
        "description": "Service",
        "quantity": 1,
        "unitPrice": 100
      }
    ]
  }'
```

### 5. Publish Invoice (Generate Share Token)
```bash
curl -u admin:supersecret -X POST http://localhost:3000/api/v1/invoices/INVOICE_ID/publish
```

### 6. View Public Invoice
```bash
curl http://localhost:3000/api/v1/public/invoices/SHARE_TOKEN
```

### 7. Create Template
```bash
curl -u admin:supersecret -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Simple Template",
    "html": "<h1>Invoice</h1><p>Total: ${{total}}</p>"
  }'
```

### 8. Update Settings
```bash
curl -u admin:supersecret -X PUT http://localhost:3000/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "My Company",
    "currency": "USD"
  }'
```

## All Available Endpoints

### Admin Endpoints (require Basic Auth)
- `GET /api/v1/invoices` - List all invoices
- `POST /api/v1/invoices` - Create invoice
- `GET /api/v1/invoices/:id` - Get invoice by ID
- `PUT /api/v1/invoices/:id` - Update invoice
- `DELETE /api/v1/invoices/:id` - Delete invoice
- `POST /api/v1/invoices/:id/publish` - Generate share token

- `GET /api/v1/customers` - List all customers
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers/:id` - Get customer by ID
- `PUT /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer

- `GET /api/v1/templates` - List all templates
- `POST /api/v1/templates` - Create template
- `PUT /api/v1/templates/:id` - Update template
- `DELETE /api/v1/templates/:id` - Delete template

- `GET /api/v1/settings` - Get all settings
- `PUT /api/v1/settings` - Update settings

### Public Endpoints (no auth required)
- `GET /api/v1/public/invoices/:shareToken` - View public invoice
- `GET /api/v1/public/invoices/:shareToken/pdf` - Download invoice PDF

## Running the Automated Test
```bash
./test_api.sh
```