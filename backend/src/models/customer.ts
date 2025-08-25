import { DB } from "sqlite";

export interface Customer {
  id: string;
  name: string;
  email?: string;
  address?: string;
  createdAt: Date;
}

export class CustomerModel {
  constructor(private db: DB) {}

  async create(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    const id = crypto.randomUUID();
    const createdAt = new Date();
    await this.db.query("INSERT INTO customers (id, name, email, address, created_at) VALUES (?, ?, ?, ?, ?)", [id, customer.name, customer.email, customer.address, createdAt]);
    return { id, createdAt, ...customer };
  }

  async findAll(): Promise<Customer[]> {
    const results = await this.db.query("SELECT * FROM customers");
    return results.map((row: unknown[]) => ({
      id: row[0] as string,
      name: row[1] as string,
      email: row[2] as string,
      address: row[3] as string,
      createdAt: new Date(row[4] as string),
    }));
  }

  async findById(id: string): Promise<Customer | null> {
    const result = await this.db.query("SELECT * FROM customers WHERE id = ?", [id]);
    if (result.length === 0) return null;
    const row = result[0] as unknown[];
    return {
      id: row[0] as string,
      name: row[1] as string,
      email: row[2] as string,
      address: row[3] as string,
      createdAt: new Date(row[4] as string),
    };
  }

  async update(id: string, customer: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<Customer | null> {
    const existingCustomer = await this.findById(id);
    if (!existingCustomer) return null;

    const updatedCustomer = { ...existingCustomer, ...customer };
    await this.db.query("UPDATE customers SET name = ?, email = ?, address = ? WHERE id = ?", [updatedCustomer.name, updatedCustomer.email, updatedCustomer.address, id]);
    return updatedCustomer;
  }

  async delete(id: string): Promise<boolean> {
    await this.db.query("DELETE FROM customers WHERE id = ?", [id]);
    return true;
  }
}