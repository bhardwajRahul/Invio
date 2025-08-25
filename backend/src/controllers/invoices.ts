import { getDatabase } from "../database/init.ts";
import { Invoice } from "../types/index.ts";
import { generateUUID } from "../utils/uuid.ts";

interface CreateInvoiceData {
  customerId: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export const createInvoice = (data: CreateInvoiceData) => {
  const db = getDatabase();
  const invoiceId = generateUUID();
  const shareToken = generateUUID();
  
  // Calculate total from items
  const total = data.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);
  
  const invoice: Invoice = {
    id: invoiceId,
    customerId: data.customerId,
    issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    status: data.status || "draft",
    notes: data.notes,
    total: total,
    shareToken: shareToken,
    createdAt: new Date()
  };

  // Insert invoice
  db.query(
    "INSERT INTO invoices (id, customer_id, issue_date, due_date, status, notes, total, share_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [invoice.id, invoice.customerId, invoice.issueDate, invoice.dueDate, invoice.status, invoice.notes, invoice.total, invoice.shareToken, invoice.createdAt]
  );
  
  // Insert invoice items
  for (const item of data.items) {
    const itemId = generateUUID();
    db.query(
      "INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
      [itemId, invoiceId, item.description, item.quantity, item.unitPrice]
    );
  }
  
  return { ...invoice, items: data.items.map((item) => ({
    id: generateUUID(), // This would be from the actual insert
    invoiceId: invoiceId,
    ...item
  })) };
};

export const getInvoices = () => {
  const db = getDatabase();
  return db.query("SELECT * FROM invoices");
};

export const getInvoiceById = (id: string) => {
  const db = getDatabase();
  const result = db.query("SELECT * FROM invoices WHERE id = ?", [id]);
  if (result.length > 0) {
    const row = result[0] as unknown[];
    return {
      id: row[0] as string,
      customerId: row[1] as string,
      issueDate: new Date(row[2] as string),
      dueDate: row[3] ? new Date(row[3] as string) : undefined,
      status: row[4] as "draft" | "sent" | "paid" | "overdue",
      notes: row[5] as string,
      total: row[6] as number,
      shareToken: row[7] as string,
      createdAt: new Date(row[8] as string),
    };
  }
  return null;
};

export const getInvoiceByShareToken = (shareToken: string) => {
  const db = getDatabase();
  const result = db.query("SELECT * FROM invoices WHERE share_token = ?", [shareToken]);
  if (result.length > 0) {
    const row = result[0] as unknown[];
    return {
      id: row[0] as string,
      customerId: row[1] as string,
      issueDate: new Date(row[2] as string),
      dueDate: row[3] ? new Date(row[3] as string) : undefined,
      status: row[4] as "draft" | "sent" | "paid" | "overdue",
      notes: row[5] as string,
      total: row[6] as number,
      shareToken: row[7] as string,
      createdAt: new Date(row[8] as string),
    };
  }
  return null;
};

export const updateInvoice = (id: string, data: Partial<Invoice>) => {
  const db = getDatabase();
  db.query("UPDATE invoices SET customer_id = ?, issue_date = ?, due_date = ?, status = ?, notes = ?, total = ? WHERE id = ?", 
    [data.customerId, data.issueDate, data.dueDate, data.status, data.notes, data.total, id]);
  return getInvoiceById(id);
};

export const deleteInvoice = (id: string) => {
  const db = getDatabase();
  db.query("DELETE FROM invoices WHERE id = ?", [id]);
  return true;
};

export const publishInvoice = (id: string) => {
  const shareToken = generateUUID();
  const db = getDatabase();
  db.query("UPDATE invoices SET share_token = ?, status = 'sent' WHERE id = ?", [shareToken, id]);
  return { shareToken };
};
