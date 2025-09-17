import { getDatabase } from "../database/init.ts";
import {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from "../types/index.ts";
import { generateUUID } from "../utils/uuid.ts";

const mapRowToCustomer = (row: unknown[]): Customer => ({
  id: row[0] as string,
  name: row[1] as string,
  email: (row[2] ?? undefined) as string | undefined,
  phone: (row[3] ?? undefined) as string | undefined,
  address: (row[4] ?? undefined) as string | undefined,
  countryCode: (row[5] ?? undefined) as string | undefined,
  taxId: (row[6] ?? undefined) as string | undefined,
  createdAt: new Date(row[7] as string),
});

export const getCustomers = () => {
  const db = getDatabase();
  const results = db.query(
    "SELECT id, name, email, phone, address, country_code, tax_id, created_at FROM customers ORDER BY created_at DESC",
  );
  return results.map((row: unknown[]) => mapRowToCustomer(row));
};

export const getCustomerById = (id: string): Customer | null => {
  const db = getDatabase();
  const results = db.query(
    "SELECT id, name, email, phone, address, country_code, tax_id, created_at FROM customers WHERE id = ?",
    [id],
  );
  if (results.length === 0) return null;
  return mapRowToCustomer(results[0] as unknown[]);
};

const toNullable = (v?: string): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

export const createCustomer = (data: CreateCustomerRequest): Customer => {
  const db = getDatabase();
  const customerId = generateUUID();
  const now = new Date();

  // Normalize optional fields: store NULLs for empty strings
  const email = toNullable(data.email);
  const phone = toNullable(data.phone);
  const address = toNullable(data.address);
  const countryCode = toNullable(data.countryCode);
  const taxId = toNullable(data.taxId);

  db.query(
    `
    INSERT INTO customers (id, name, email, phone, address, country_code, tax_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      customerId,
      data.name,
      email,
      phone,
      address,
      countryCode,
      taxId,
      now,
    ],
  );

  // Return undefined for missing optional fields
  return {
    id: customerId,
    name: data.name,
    email: email ?? undefined,
    phone: phone ?? undefined,
    address: address ?? undefined,
    countryCode: countryCode ?? undefined,
    taxId: taxId ?? undefined,
    createdAt: now,
  };
};

export const updateCustomer = (
  id: string,
  data: UpdateCustomerRequest,
): Customer | null => {
  const db = getDatabase();
  // Read existing to support partials and normalize empties
  const existing = getCustomerById(id);
  if (!existing) return null;

  const next = {
    name: data.name ?? existing.name,
    email: data.email === undefined ? existing.email : undefined,
    phone: data.phone === undefined ? existing.phone : undefined,
    address: data.address === undefined ? existing.address : undefined,
    taxId: data.taxId === undefined ? existing.taxId : undefined,
  } as Partial<Customer>;

  // If provided, coerce empty to NULL
  const email = data.email !== undefined
    ? toNullable(data.email)
    : (existing.email ?? null);
  const phone = data.phone !== undefined
    ? toNullable(data.phone)
    : (existing.phone ?? null);
  const address = data.address !== undefined
    ? toNullable(data.address)
    : (existing.address ?? null);
  const countryCode = data.countryCode !== undefined
    ? toNullable(data.countryCode)
    : (existing.countryCode ?? null);
  const taxId = data.taxId !== undefined
    ? toNullable(data.taxId)
    : (existing.taxId ?? null);

  db.query(
    `
    UPDATE customers SET 
      name = ?, email = ?, phone = ?, address = ?, country_code = ?, tax_id = ?
    WHERE id = ?
  `,
    [
      next.name,
      email,
      phone,
      address,
      countryCode,
      taxId,
      id,
    ],
  );

  return getCustomerById(id);
};

export function deleteCustomer(customerId: string): void {
  try {
    const db = getDatabase();

    // First check if customer has any invoices
    const invoices = db.query(
      `
      SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?
    `,
      [customerId],
    );

    const invoiceCount = invoices[0] ? Number(invoices[0][0]) : 0;

    if (invoiceCount > 0) {
      throw new Error(
        `Cannot delete customer: ${invoiceCount} invoice(s) exist for this customer. Delete invoices first.`,
      );
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
