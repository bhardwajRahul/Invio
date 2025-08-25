# Deno Elysia Invoice App

This project is a simple invoice management application built using Deno and Elysia. It provides an admin dashboard for managing invoices, customers, and templates, as well as public access to invoices via share tokens.

## Features

- **Admin Authentication**: Basic Auth and JWT support for secure access to the admin dashboard.
- **Invoice Management**: Create, read, update, and delete invoices with unique share tokens for public access.
- **Customer Management**: Store and manage customer information linked to invoices.
- **Template Management**: Upload and edit HTML templates for invoices.
- **Settings Management**: Configure application settings such as company name, tax ID, and logo.

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
│   │   ├── pdf.ts
│   │   └── uuid.ts
│   └── types
│       └── index.ts
├── static
│   ├── templates
│   └── uploads
├── .env
├── deno.json
└── import_map.json
```

## Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/deno-elysia-invoice-app.git
   cd deno-elysia-invoice-app
   ```

2. **Install Deno**: Follow the instructions on the [Deno website](https://deno.land/) to install Deno.

3. **Configure Environment Variables**: Create a `.env` file in the root directory with the following content:
   ```
   ADMIN_USER=admin
   ADMIN_PASS=supersecret
   ```

4. **Initialize the Database**: Run the database initialization script:
   ```bash
   deno run --allow-read --allow-write src/database/init.ts
   ```

5. **Run the Application**:
   ```bash
   deno run --allow-net --allow-read --allow-write --allow-env src/app.ts
   ```

## API Usage

### Admin Routes (Protected)

- **Create Invoice**: `POST /api/v1/invoices`
- **Get Invoices**: `GET /api/v1/invoices`
- **Get Invoice by ID**: `GET /api/v1/invoices/:id`
- **Update Invoice**: `PUT /api/v1/invoices/:id`
- **Delete Invoice**: `DELETE /api/v1/invoices/:id`
- **Publish Invoice**: `POST /api/v1/invoices/:id/publish`
- **Get Templates**: `GET /api/v1/templates`
- **Create Template**: `POST /api/v1/templates`
- **Update Settings**: `PUT /api/v1/settings`
- **Get Settings**: `GET /api/v1/settings`

### Public Routes (No Login Required)

- **Get Public Invoice**: `GET /api/v1/public/invoices/:share_token`
- **Get Public Invoice PDF**: `GET /api/v1/public/invoices/:share_token/pdf`

## License

This project is licensed under the MIT License. See the LICENSE file for more details.