import { getDatabase } from "../database/init.ts";
import { CreateCustomerRequest, UpdateCustomerRequest, Customer } from "../types/index.ts";
import { generateUUID } from "../utils/uuid.ts";

const mapRowToCustomer = (row: unknown[]): Customer => ({
  id: row[0] as string,
  name: row[1] as string,
  email: row[2] as string,
  phone: row[3] as string,
  address: row[4] as string,
  taxId: row[5] as string,
  createdAt: new Date(row[6] as string),
});

export const getCustomers = () => {
  const db = getDatabase();
  const results = db.query("SELECT * FROM customers ORDER BY created_at DESC");
  return results.map((row: unknown[]) => mapRowToCustomer(row));
};

export const getCustomerById = (id: string): Customer | null => {
  const db = getDatabase();
  const results = db.query("SELECT * FROM customers WHERE id = ?", [id]);
  if (results.length === 0) return null;
  return mapRowToCustomer(results[0] as unknown[]);
};

export const createCustomer = (data: CreateCustomerRequest): Customer => {
  const db = getDatabase();
  const customerId = generateUUID();
  const now = new Date();
  
  const customer: Customer = {
    id: customerId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    taxId: data.taxId,
    createdAt: now,
  };

  db.query(`
    INSERT INTO customers (id, name, email, phone, address, tax_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    customer.id, customer.name, customer.email, customer.phone, 
    customer.address, customer.taxId, customer.createdAt
  ]);

  return customer;
};

export const updateCustomer = (id: string, data: UpdateCustomerRequest): Customer | null => {
  const db = getDatabase();
  
  db.query(`
    UPDATE customers SET 
      name = ?, email = ?, phone = ?, address = ?, tax_id = ?
    WHERE id = ?
  `, [
    data.name, data.email, data.phone, data.address, data.taxId, id
  ]);

  return getCustomerById(id);
};

export function deleteCustomer(customerId: string): void {
  try {
    const db = getDatabase();
    
    // First check if customer has any invoices
    const invoices = db.query(`
      SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?
    `, [customerId]);
    
    const invoiceCount = invoices[0] ? Number(invoices[0][0]) : 0;
    
    if (invoiceCount > 0) {
      throw new Error(`Cannot delete customer: ${invoiceCount} invoice(s) exist for this customer. Delete invoices first.`);
    }
    
    // Delete customer if no invoices exist
    db.query(`DELETE FROM customers WHERE id = ?`, [customerId]);
    if ((getDatabase() as unknown as { changes: number }).changes === 0) {
      throw new Error("Customer not found");
    }
  } catch (error) {
    console.error("Error deleting customer:", error);
    throw error;
  }
}