import { getDatabase } from "../database/init.ts";
import { Invoice } from "../types/index.ts";
import { generateUUID } from "../utils/uuid.ts";

export const createInvoice = async (data: Partial<Invoice>) => {
  const db = getDatabase();
  const invoiceId = generateUUID();
  const shareToken = generateUUID();
  
  const invoice: Invoice = {
    id: invoiceId,
    customerId: data.customerId!,
    issueDate: data.issueDate || new Date(),
    dueDate: data.dueDate,
    status: data.status || "draft",
    notes: data.notes,
    total: data.total!,
    shareToken: shareToken,
    createdAt: new Date()
  };

  db.query(
    "INSERT INTO invoices (id, customer_id, issue_date, due_date, status, notes, total, share_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [invoice.id, invoice.customerId, invoice.issueDate, invoice.dueDate, invoice.status, invoice.notes, invoice.total, invoice.shareToken, invoice.createdAt]
  );
  
  return invoice;
};

export const getInvoices = () => {
  const db = getDatabase();
  return db.query("SELECT * FROM invoices");
};

export const getInvoiceById = (id: string) => {
  const db = getDatabase();
  const result = db.query("SELECT * FROM invoices WHERE id = ?", [id]);
  return result.length > 0 ? result[0] : null;
};

export const getInvoiceByShareToken = (shareToken: string) => {
  const db = getDatabase();
  const result = db.query("SELECT * FROM invoices WHERE share_token = ?", [shareToken]);
  return result.length > 0 ? result[0] : null;
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
