import { getDatabase, getNextInvoiceNumber, calculateInvoiceTotals } from "../database/init.ts";
import { CreateInvoiceRequest, UpdateInvoiceRequest, Invoice, InvoiceItem, InvoiceWithDetails } from "../types/index.ts";
import { generateUUID, generateShareToken } from "../utils/uuid.ts";

export const createInvoice = (data: CreateInvoiceRequest): InvoiceWithDetails => {
  const db = getDatabase();
  const invoiceId = generateUUID();
  const shareToken = generateShareToken();
  // Prefer client-provided invoiceNumber when unique; otherwise auto-generate
  let invoiceNumber = data.invoiceNumber;
  if (invoiceNumber) {
    const exists = db.query("SELECT 1 FROM invoices WHERE invoice_number = ? LIMIT 1", [invoiceNumber]);
    if (exists.length > 0) {
      // Fallback to auto-generated to avoid UNIQUE constraint violations
      invoiceNumber = getNextInvoiceNumber();
    }
  } else {
    invoiceNumber = getNextInvoiceNumber();
  }
  
  // Calculate totals from items and discount/tax info
  const totals = calculateInvoiceTotals(
    data.items,
    data.discountPercentage || 0,
    data.discountAmount || 0,
    data.taxRate || 0
  );
  
  const now = new Date();
  const issueDate = data.issueDate ? new Date(data.issueDate) : now;
  const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
  
  // Get default settings for currency and payment terms
  const settings = getSettings();
  const currency = data.currency || settings.currency || 'USD';
  const paymentTerms = data.paymentTerms || settings.paymentTerms || 'Due in 30 days';

  const invoice: Invoice = {
    id: invoiceId,
  invoiceNumber: invoiceNumber!,
    customerId: data.customerId,
    issueDate,
    dueDate,
    currency,
    status: data.status || "draft",
    
    // Totals
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    discountPercentage: data.discountPercentage || 0,
    taxRate: data.taxRate || 0,
    taxAmount: totals.taxAmount,
    total: totals.total,
    
    // Payment and notes
    paymentTerms,
    notes: data.notes,
    
    // System fields
    shareToken,
    createdAt: now,
    updatedAt: now
  };

  // Insert invoice
  db.query(
    `INSERT INTO invoices (
      id, invoice_number, customer_id, issue_date, due_date, currency, status,
      subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
      payment_terms, notes, share_token, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice.id, invoice.invoiceNumber, invoice.customerId, invoice.issueDate, invoice.dueDate, invoice.currency, invoice.status,
      invoice.subtotal, invoice.discountAmount, invoice.discountPercentage, invoice.taxRate, invoice.taxAmount, invoice.total,
      invoice.paymentTerms, invoice.notes, invoice.shareToken, invoice.createdAt, invoice.updatedAt
    ]
  );
  
  // Insert invoice items
  const items: InvoiceItem[] = [];
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const itemId = generateUUID();
    const lineTotal = item.quantity * item.unitPrice;
    
    const invoiceItem: InvoiceItem = {
      id: itemId,
      invoiceId: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal,
      notes: item.notes,
      sortOrder: i
    };
    
    db.query(
      `INSERT INTO invoice_items (
        id, invoice_id, description, quantity, unit_price, line_total, notes, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [itemId, invoiceId, item.description, item.quantity, item.unitPrice, lineTotal, item.notes, i]
    );
    
    items.push(invoiceItem);
  }
  
  // Get customer info for response
  const customer = getCustomerById(data.customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }
  
  return {
    ...invoice,
    customer,
    items
  };
};

export const getInvoices = (): Invoice[] => {
  const db = getDatabase();
  const results = db.query(`
    SELECT id, invoice_number, customer_id, issue_date, due_date, currency, status,
           subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
           payment_terms, notes, share_token, created_at, updated_at
    FROM invoices 
    ORDER BY created_at DESC
  `);
  
  return results.map((row: unknown[]) => mapRowToInvoice(row));
};

export const getInvoiceById = (id: string): InvoiceWithDetails | null => {
  const db = getDatabase();
  const result = db.query(`
    SELECT id, invoice_number, customer_id, issue_date, due_date, currency, status,
           subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
           payment_terms, notes, share_token, created_at, updated_at
    FROM invoices 
    WHERE id = ?
  `, [id]);
  
  if (result.length === 0) return null;
  
  const invoice = mapRowToInvoice(result[0] as unknown[]);
  
  // Get customer
  const customer = getCustomerById(invoice.customerId);
  if (!customer) return null;
  
  // Get items
  const itemsResult = db.query(`
    SELECT id, invoice_id, description, quantity, unit_price, line_total, notes, sort_order
    FROM invoice_items 
    WHERE invoice_id = ? 
    ORDER BY sort_order
  `, [id]);
  
  const items = itemsResult.map((row: unknown[]) => ({
    id: row[0] as string,
    invoiceId: row[1] as string,
    description: row[2] as string,
    quantity: row[3] as number,
    unitPrice: row[4] as number,
    lineTotal: row[5] as number,
    notes: row[6] as string,
    sortOrder: row[7] as number,
  }));
  
  return {
    ...invoice,
    customer,
    items
  };
};

export const getInvoiceByShareToken = (shareToken: string): InvoiceWithDetails | null => {
  const db = getDatabase();
  const result = db.query(`
    SELECT id, invoice_number, customer_id, issue_date, due_date, currency, status,
           subtotal, discount_amount, discount_percentage, tax_rate, tax_amount, total,
           payment_terms, notes, share_token, created_at, updated_at
    FROM invoices 
    WHERE share_token = ?
  `, [shareToken]);
  
  if (result.length === 0) return null;
  
  const invoice = mapRowToInvoice(result[0] as unknown[]);
  
  // Get customer
  const customer = getCustomerById(invoice.customerId);
  if (!customer) return null;
  
  // Get items
  const itemsResult = db.query(`
    SELECT id, invoice_id, description, quantity, unit_price, line_total, notes, sort_order
    FROM invoice_items 
    WHERE invoice_id = ? 
    ORDER BY sort_order
  `, [invoice.id]);
  
  const items = itemsResult.map((row: unknown[]) => ({
    id: row[0] as string,
    invoiceId: row[1] as string,
    description: row[2] as string,
    quantity: row[3] as number,
    unitPrice: row[4] as number,
    lineTotal: row[5] as number,
    notes: row[6] as string,
    sortOrder: row[7] as number,
  }));
  
  return {
    ...invoice,
    customer,
    items
  };
};

export const updateInvoice = async (id: string, data: Partial<UpdateInvoiceRequest>): Promise<InvoiceWithDetails | null> => {
  const existing = await getInvoiceById(id);
  if (!existing) return null;
  
  const db = getDatabase();
  
  // If items are being updated, recalculate totals
  let totals = {
    subtotal: existing.subtotal,
    discountAmount: existing.discountAmount,
    taxAmount: existing.taxAmount,
    total: existing.total
  };
  
  if (data.items) {
    totals = calculateInvoiceTotals(
      data.items,
      data.discountPercentage ?? existing.discountPercentage,
      data.discountAmount ?? existing.discountAmount,
      data.taxRate ?? existing.taxRate
    );
  }
  
  const updatedAt = new Date();
  
  // Normalize notes: treat whitespace-only as empty string so it clears stored notes
  const normalizedNotes = ((): string | undefined => {
    if (data.notes === undefined) return undefined; // not provided
    const v = String(data.notes);
    return v.trim().length === 0 ? "" : v;
  })();

  // Update invoice
  db.query(`
    UPDATE invoices SET 
      customer_id = ?, issue_date = ?, due_date = ?, currency = ?, status = ?,
      subtotal = ?, discount_amount = ?, discount_percentage = ?, tax_rate = ?, tax_amount = ?, total = ?,
      payment_terms = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `, [
    data.customerId ?? existing.customerId,
    data.issueDate ? new Date(data.issueDate) : existing.issueDate,
    data.dueDate ? new Date(data.dueDate) : existing.dueDate,
    data.currency ?? existing.currency,
    data.status ?? existing.status,
    totals.subtotal,
    totals.discountAmount,
    data.discountPercentage ?? existing.discountPercentage,
    data.taxRate ?? existing.taxRate,
    totals.taxAmount,
    totals.total,
    data.paymentTerms ?? existing.paymentTerms,
    normalizedNotes !== undefined ? normalizedNotes : existing.notes,
    updatedAt,
    id
  ]);
  
  // Update items if provided
  if (data.items) {
    // Delete existing items
    db.query("DELETE FROM invoice_items WHERE invoice_id = ?", [id]);
    
    // Insert new items
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const itemId = generateUUID();
      const lineTotal = item.quantity * item.unitPrice;
      
      db.query(`
        INSERT INTO invoice_items (
          id, invoice_id, description, quantity, unit_price, line_total, notes, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [itemId, id, item.description, item.quantity, item.unitPrice, lineTotal, item.notes, i]);
    }
  }
  
  return await getInvoiceById(id);
};

export const deleteInvoice = (id: string): boolean => {
  const db = getDatabase();
  
  // Delete items first (CASCADE should handle this, but being explicit)
  db.query("DELETE FROM invoice_items WHERE invoice_id = ?", [id]);
  
  // Delete invoice
  db.query("DELETE FROM invoices WHERE id = ?", [id]);
  
  return true;
};

export const publishInvoice = async (id: string): Promise<{ shareToken: string; shareUrl: string }> => {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  
  // Update status to 'sent' if it's currently 'draft'
  if (invoice.status === 'draft') {
    const db = getDatabase();
    db.query("UPDATE invoices SET status = 'sent', updated_at = ? WHERE id = ?", [new Date(), id]);
  }
  
  const shareUrl = `${Deno.env.get("BASE_URL") || "http://localhost:3000"}/api/v1/public/invoices/${invoice.shareToken}`;
  
  return {
    shareToken: invoice.shareToken,
    shareUrl
  };
};

export const unpublishInvoice = async (id: string): Promise<{ shareToken: string }> => {
  const existing = await getInvoiceById(id);
  if (!existing) throw new Error("Invoice not found");

  const db = getDatabase();
  const newToken = generateShareToken();
  const now = new Date();
  // Rotate share token and set status back to 'draft' to reflect unpublished state
  db.query("UPDATE invoices SET share_token = ?, status = 'draft', updated_at = ? WHERE id = ?", [newToken, now, id]);

  return { shareToken: newToken };
};

// Helper functions
function mapRowToInvoice(row: unknown[]): Invoice {
  return {
    id: row[0] as string,
    invoiceNumber: row[1] as string,
    customerId: row[2] as string,
    issueDate: new Date(row[3] as string),
    dueDate: row[4] ? new Date(row[4] as string) : undefined,
    currency: row[5] as string,
    status: row[6] as 'draft' | 'sent' | 'paid' | 'overdue',
    subtotal: row[7] as number,
    discountAmount: row[8] as number,
    discountPercentage: row[9] as number,
    taxRate: row[10] as number,
    taxAmount: row[11] as number,
    total: row[12] as number,
    paymentTerms: row[13] as string,
    notes: row[14] as string,
    shareToken: row[15] as string,
    createdAt: new Date(row[16] as string),
    updatedAt: new Date(row[17] as string),
  };
}

function getCustomerById(id: string) {
  const db = getDatabase();
  const result = db.query("SELECT * FROM customers WHERE id = ?", [id]);
  if (result.length === 0) return null;
  
  const row = result[0] as unknown[];
  return {
    id: row[0] as string,
    name: row[1] as string,
    email: row[2] as string,
    phone: row[3] as string,
    address: row[4] as string,
    taxId: row[5] as string,
    createdAt: new Date(row[6] as string),
  };
}

function getSettings() {
  const db = getDatabase();
  const results = db.query("SELECT key, value FROM settings");
  const settings: Record<string, string> = {};
  
  for (const row of results) {
    const [key, value] = row as [string, string];
    settings[key] = value;
  }
  
  return settings;
}
