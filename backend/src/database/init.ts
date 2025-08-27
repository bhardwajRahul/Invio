import { DB } from "sqlite";
import { load } from "dotenv";

// Load environment variables
await load({ export: true });

let db: DB;

export function initDatabase(): void {
  const dbPath = Deno.env.get("DATABASE_PATH") || "./invio.db";
  db = new DB(dbPath);

  // Read and execute the migration file
  const migrationSQL = Deno.readTextFileSync("./src/database/migrations.sql");
  
  // Split by semicolon and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  for (const statement of statements) {
    try {
      db.execute(statement);
    } catch (error) {
      // Ignore "already exists" errors for tables/indexes
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes("already exists")) {
        console.error("Migration error:", errorMessage);
        console.error("Statement:", statement);
      }
    }
  }

  // Insert built-in templates
  insertBuiltinTemplates(db);

  console.log("Database initialized successfully");
}

function insertBuiltinTemplates(database: DB) {
    const filePathForId = (id: string): string => {
        switch (id) {
            case "professional-modern":
                return "./static/templates/professional-modern.html";
            case "minimalist-clean":
                return "./static/templates/minimalist-clean.html";
            default:
                throw new Error(`Unknown template id: ${id}`);
        }
    };

    const loadHtml = (id: string): string => {
        const path = filePathForId(id);
        try {
            return Deno.readTextFileSync(path);
        } catch (e) {
            console.error(`Failed to read template file ${path}:`, e);
            return "<html><body><p>Template unavailable.</p></body></html>";
        }
    };

    const templates = [
        { id: "professional-modern", name: "Professional Modern", html: loadHtml("professional-modern"), isDefault: true },
        { id: "minimalist-clean", name: "Minimalist Clean", html: loadHtml("minimalist-clean"), isDefault: false },
    ];

    for (const t of templates) {
        try {
            const existing = database.query("SELECT html FROM templates WHERE id = ?", [t.id]);
            if (existing.length === 0) {
                database.query(
                    "INSERT INTO templates (id, name, html, is_default, created_at) VALUES (?, ?, ?, ?, ?)",
                    [t.id, t.name, t.html, t.isDefault, new Date().toISOString()],
                );
                console.log(`✅ Installed template: ${t.name}`);
            } else {
                const currentHtml = String((existing[0] as unknown[])[0] ?? "");
                if (currentHtml.trim() !== t.html.trim()) {
                    database.query(
                        "UPDATE templates SET name = ?, html = ?, is_default = ? WHERE id = ?",
                        [t.name, t.html, t.isDefault, t.id],
                    );
                    console.log(`♻️  Updated template from file: ${t.name}`);
                }
            }
        } catch (error) {
            console.error(`Failed to upsert template ${t.name}:`, error);
        }
    }
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

// Helper function to get next invoice number
export function getNextInvoiceNumber(): string {
    // Derive next number from max existing numeric suffix to avoid UNIQUE conflicts
    const result = db.query("SELECT invoice_number FROM invoices ORDER BY created_at DESC");
    let maxNum = 0;
    for (const row of result) {
        const inv = String((row as unknown[])[0] ?? "");
        const match = inv.match(/(\d{1,})$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!Number.isNaN(num)) maxNum = Math.max(maxNum, num);
        }
    }
    const next = maxNum + 1;
    return `INV-${String(next).padStart(4, '0')}`;
}

// Helper function to calculate totals
export interface CalculatedTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: number; }>,
  discountPercentage: number = 0,
  discountAmount: number = 0,
  taxRate: number = 0
): CalculatedTotals {
  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  // Calculate discount
  let finalDiscountAmount = discountAmount;
  if (discountPercentage > 0) {
    finalDiscountAmount = subtotal * (discountPercentage / 100);
  }

  // Calculate tax on discounted amount
  const taxableAmount = subtotal - finalDiscountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);

  // Calculate total
  const total = subtotal - finalDiscountAmount + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(finalDiscountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
