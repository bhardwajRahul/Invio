import { DB } from "sqlite";
import { load } from "dotenv";

// Load environment variables
await load({ export: true });

let db: DB;

export function initDatabase(): void {
  const dbPath = Deno.env.get("DATABASE_PATH") || "./invio.db";
  db = new DB(dbPath);

  // Create Customers table
  db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Invoices table
  db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      issue_date DATE NOT NULL,
      due_date DATE,
      status TEXT CHECK(status IN ('draft', 'sent', 'paid', 'overdue')),
      notes TEXT,
      total NUMERIC NOT NULL,
      share_token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Invoice Items table
  db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT REFERENCES invoices(id),
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL
    )
  `);

  // Create Templates table
  db.execute(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      html TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Settings table
  db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  console.log("Database initialized successfully");
}

export function getDatabase(): DB {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}