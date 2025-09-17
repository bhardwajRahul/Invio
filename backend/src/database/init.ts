import { DB } from "sqlite";
import { load } from "dotenv";

// Load environment variables
await load({ export: true });

let db: DB;

// Resolve workspace-relative paths consistently from project root
function resolvePath(p: string): string {
  if (p.startsWith("/")) return p; // absolute
  // Assume process CWD is project root during deno run; keep relative as-is
  return p;
}

// Minimal dirname for POSIX-style paths
function simpleDirname(p: string): string {
  const i = p.lastIndexOf("/");
  if (i <= 0) return "/";
  return p.slice(0, i);
}

export function initDatabase(): void {
  // In all modes, open the active database at DATABASE_PATH. In demo mode we may
  // periodically copy a pristine DEMO_DB_PATH over this file.
  const dbPath = resolvePath(Deno.env.get("DATABASE_PATH") || "./invio.db");

  // Ensure parent directory exists if using a nested path
  try {
    const dir = simpleDirname(dbPath);
    if (dir && dir !== "." && dir !== "/") {
      try {
        Deno.mkdirSync(dir, { recursive: true });
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  db = new DB(dbPath);

  // Read and execute the migration file
  const migrationSQL = Deno.readTextFileSync("./src/database/migrations.sql");

  // Remove line comments and split by semicolon
  const withoutComments = migrationSQL
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) return ""; // drop whole-line comments
      // strip inline comments starting with --
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");

  const statements = withoutComments
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);

  for (const statement of statements) {
    try {
      db.execute(statement);
    } catch (error) {
      // Ignore "already exists" errors for tables/indexes
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      if (!errorMessage.includes("already exists")) {
        console.error("Migration error:", errorMessage);
        console.error("Statement:", statement);
      }
    }
  }

  // Insert built-in templates and clean up legacy/default conflicts
  insertBuiltinTemplates(db);
  ensureTemplateDefaults(db);
  ensureSchemaUpgrades(db);

  console.log("Database initialized successfully");
}

/**
 * Reset the active DATABASE_PATH contents from DEMO_DB_PATH.
 * This closes the current DB connection, copies the file, and re-initializes.
 * Safe to call at startup and on an interval when DEMO_MODE=true.
 */
export function resetDatabaseFromDemo(): void {
  const demoMode = (Deno.env.get("DEMO_MODE") || "").toLowerCase() === "true";
  const demoDb = Deno.env.get("DEMO_DB_PATH");
  const activePath = resolvePath(Deno.env.get("DATABASE_PATH") || "./invio.db");
  if (!demoMode) return; // only meaningful in demo mode
  if (!demoDb) {
    console.warn("DEMO_MODE is true but DEMO_DB_PATH is not set; skipping reset.");
    return;
  }

  try {
    closeDatabase();
  } catch { /* ignore */ }

  try {
    // Ensure destination directory exists
    const dir = simpleDirname(activePath);
    if (dir && dir !== "." && dir !== "/") {
      try {
        Deno.mkdirSync(dir, { recursive: true });
      } catch { /* ignore */ }
    }
    // Overwrite the active DB with the pristine demo DB
    try {
      Deno.removeSync(activePath);
    } catch { /* ignore if missing */ }
    Deno.copyFileSync(resolvePath(demoDb), activePath);
    console.log("♻️  Demo database reset from DEMO_DB_PATH.");
  } catch (e) {
    console.error("Failed to reset demo database:", e);
  }

  // Re-open and run migrations/template maintenance
  initDatabase();
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
    {
      id: "professional-modern",
      name: "Professional Modern",
      html: loadHtml("professional-modern"),
      isDefault: false,
    },
    {
      id: "minimalist-clean",
      name: "Minimalist Clean",
      html: loadHtml("minimalist-clean"),
      isDefault: true,
    },
  ];

  for (const t of templates) {
    try {
      const existing = database.query(
        "SELECT html FROM templates WHERE id = ?",
        [t.id],
      );
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

function ensureTemplateDefaults(database: DB) {
  try {
    // Remove legacy default row if present
    database.query("DELETE FROM templates WHERE id = ?", ["default-template"]);

    // Ensure only one default: prefer minimalist-clean
    const rows = database.query("SELECT id, is_default FROM templates");
    const ids = rows.map((r) => String((r as unknown[])[0]));
    const hasMinimalist = ids.includes("minimalist-clean");

    // Reset all defaults
    database.query("UPDATE templates SET is_default = 0");

    // Set preferred default if present; otherwise set any one template as default for safety
    if (hasMinimalist) {
      database.query("UPDATE templates SET is_default = 1 WHERE id = ?", [
        "minimalist-clean",
      ]);
    } else if (ids.length) {
      const first = ids[0];
      database.query("UPDATE templates SET is_default = 1 WHERE id = ?", [
        first,
      ]);
    }
  } catch (e) {
    console.error("Failed to ensure template defaults:", e);
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

function ensureSchemaUpgrades(database: DB) {
  try {
    // Ensure customers.country_code exists
    const cols = database.query("PRAGMA table_info(customers)") as unknown[] as Array<unknown[]>;
    const names = new Set(cols.map((r) => String(r[1])));
    if (!names.has("country_code")) {
      try {
        database.execute("ALTER TABLE customers ADD COLUMN country_code TEXT");
        console.log("✅ Added customers.country_code column");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/duplicate column|already exists/i.test(msg)) {
          console.warn("Could not add customers.country_code:", msg);
        }
      }
    }
  } catch (e) {
    console.warn("Schema upgrade check failed:", e);
  }
}

// Helper function to get next invoice number
export function getNextInvoiceNumber(): string {
  // Configurable numbering: PREFIX[-YYYY]-NNN
  // Pull simple settings directly; defaults keep it minimal
  let prefix = "INV";
  let includeYear = true;
  let pad = 3;
  try {
    const rows = db.query(
      "SELECT key, value FROM settings WHERE key IN ('invoicePrefix','invoiceIncludeYear','invoiceNumberPadding')",
    );
    const map = new Map<string, string>();
    for (const r of rows) {
      const [k, v] = r as [string, string];
      map.set(k, v);
    }
    prefix = (map.get("invoicePrefix") || prefix).trim() || prefix;
    includeYear =
      (map.get("invoiceIncludeYear") || "true").toLowerCase() !== "false";
    const p = parseInt(map.get("invoiceNumberPadding") || String(pad), 10);
    if (!Number.isNaN(p) && p >= 2 && p <= 8) pad = p;
  } catch (_) { /* use defaults */ }

  const year = new Date().getFullYear();
  const base = includeYear ? `${prefix}-${year}-` : `${prefix}-`;

  // Scan existing invoice_numbers that match this base and find max numeric suffix
  const like = `${base}%`;
  const result = db.query(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ?",
    [like],
  );
  let maxNum = 0;
  const baseEscaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${baseEscaped}(\\d+)$`);
  for (const row of result) {
    const inv = String((row as unknown[])[0] ?? "");
    const m = inv.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }
  const next = maxNum + 1;
  return `${base}${String(next).padStart(pad, "0")}`;
}

export function generateDraftInvoiceNumber(): string {
  // Unique placeholder that will be replaced on send/publish
  // Use short random to avoid UNIQUE collisions
  const rand = cryptoRandom(6);
  return `DRAFT-${rand}`;
}

function cryptoRandom(len: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

// Helper function to calculate totals
export interface CalculatedTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  discountPercentage: number = 0,
  discountAmount: number = 0,
  taxRate: number = 0,
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
    total: Math.round(total * 100) / 100,
  };
}
