export interface Customer {
  id: string;
  name: string;
  email?: string;
  address?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  customerId: string;
  issueDate: Date;
  dueDate?: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  total: number;
  shareToken: string;
  createdAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Template {
  id: string;
  name: string;
  html: string;
  createdAt: Date;
}

export interface Setting {
  key: string;
  value: string;
}

export interface Settings {
  companyName: string;
  taxId: string;
  currency: string;
  logo?: string;
}