export interface Invoice {
  id: string;
  customer_id: string;
  issue_date: Date;
  due_date?: Date;
  status: "draft" | "sent" | "paid" | "overdue";
  notes?: string;
  total: number;
  share_token: string;
  created_at: Date;
}

export class InvoiceModel {
  constructor(
    public customer_id: string,
    public issue_date: Date,
    public total: number,
    public id: string = crypto.randomUUID(),
    public due_date?: Date,
    public status: "draft" | "sent" | "paid" | "overdue" = "draft",
    public notes?: string,
    public share_token: string = crypto.randomUUID(),
    public created_at: Date = new Date()
  ) {}

  // Additional methods for interacting with the invoices table can be added here
}