import { Database } from "../database/init.ts";
import { Invoice } from "../models/invoice.ts";
import { v4 as uuidv4 } from "../utils/uuid.ts";

export const createInvoice = async (data: any) => {
  const invoiceId = uuidv4();
  const newInvoice = new Invoice({
    id: invoiceId,
    customer_id: data.customer_id,
    issue_date: data.issue_date,
    due_date: data.due_date,
    status: data.status,
    notes: data.notes,
    total: data.total,
    share_token: uuidv4(), // Generate a share token
  });

  await Database.insert("invoices", newInvoice);
  return newInvoice;
};

export const getInvoices = async () => {
  return await Database.query("SELECT * FROM invoices");
};

export const getInvoiceById = async (id: string) => {
  return await Database.query("SELECT * FROM invoices WHERE id = ?", [id]);
};

export const updateInvoice = async (id: string, data: any) => {
  await Database.update("invoices", id, data);
  return await getInvoiceById(id);
};

export const deleteInvoice = async (id: string) => {
  await Database.delete("invoices", id);
  return { message: "Invoice deleted successfully" };
};

export const publishInvoice = async (id: string) => {
  const shareToken = uuidv4();
  await Database.update("invoices", id, { share_token: shareToken });
  return { share_link: `https://yoursite.com/public/invoice/${shareToken}` };
};