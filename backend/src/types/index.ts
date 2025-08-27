export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  issueDate: Date;
  dueDate?: Date;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  
  // Totals
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  
  // Payment and notes
  paymentTerms?: string;
  notes?: string;
  
  // System fields
  shareToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  sortOrder: number;
}

export interface InvoiceAttachment {
  id: string;
  invoiceId: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface Template {
  id: string;
  name: string;
  html: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface Setting {
  key: string;
  value: string;
}

export interface BusinessSettings {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyTaxId: string;
  currency: string;
  logo?: string;
  paymentMethods: string;
  bankAccount: string;
  paymentTerms: string;
  defaultNotes: string;
}

// Request/Response types for API
export interface CreateInvoiceRequest {
  customerId: string;
  invoiceNumber?: string;
  issueDate?: string | Date;
  dueDate?: string | Date;
  currency?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  
  // Totals (optional, will be calculated if not provided)
  discountAmount?: number;
  discountPercentage?: number;
  taxRate?: number;
  
  // Payment and notes
  paymentTerms?: string;
  notes?: string;
  
  // Items
  items: {
    itemCode?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }[];
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {
  id: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: string;
}

export interface InvoiceWithDetails extends Invoice {
  customer: Customer;
  items: InvoiceItem[];
  attachments?: InvoiceAttachment[];
}

// Template rendering context
export interface TemplateContext {
  // Company info
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyTaxId?: string;
  
  // Invoice info
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  status: string;
  
  // Customer info
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerTaxId?: string;
  
  // Items
  items: Array<{
    itemCode?: string;
    description: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    notes?: string;
  }>;
  
  // Totals
  subtotal: string;
  discountAmount?: string;
  discountPercentage?: number;
  taxRate?: number;
  taxAmount?: string;
  total: string;
  
  // Flags
  hasDiscount: boolean;
  hasTax: boolean;
  showItemCode: boolean;
  
  // Payment info
  paymentTerms?: string;
  paymentMethods?: string;
  bankAccount?: string;
  
  // Notes
  notes?: string;
}