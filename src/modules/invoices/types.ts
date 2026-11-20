export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export type InvoiceCurrency = "PKR" | "USD" | "EUR" | "GBP" | "AED";

export interface InvoiceItemRecord {
  id: string;
  companyId: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceRecord {
  id: string;
  companyId: string;
  clientId: string;
  invoiceNumber: string;
  viewToken: string;
  currency: InvoiceCurrency;
  exchangeRate: number;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  baseTotalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItemInput {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  clientId: string;
  currency: InvoiceCurrency;
  exchangeRate?: number;
  issueDate: Date | string;
  dueDate: Date | string;
  taxRate?: number;
  notes?: string | null;
  items: InvoiceItemInput[];
}

export interface UpdateInvoiceInput {
  id: string;
  clientId?: string;
  currency?: InvoiceCurrency;
  exchangeRate?: number;
  issueDate?: Date | string;
  dueDate?: Date | string;
  taxRate?: number;
  notes?: string | null;
  items?: InvoiceItemInput[];
}

export interface RecordPaymentInput {
  invoiceId: string;
  paidAmount: number;
  paidAt?: Date | string;
  notes?: string | null;
}

export interface InvoiceClientSummary {
  id: string;
  clientName: string;
  email: string;
  paymentTermsDays: number;
  phone: string | null;
  address: string | null;
}

export interface InvoiceWithItemsAndClient extends InvoiceRecord {
  client: InvoiceClientSummary;
  items: InvoiceItemRecord[];
}

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus | "ALL";
  clientId?: string;
  currency?: InvoiceCurrency | "ALL";
  startDate?: Date | string;
  endDate?: Date | string;
  page?: number;
  limit?: number;
  sortBy?: "issueDate" | "dueDate" | "totalAmount" | "invoiceNumber";
  sortOrder?: "asc" | "desc";
  includeItems?: boolean;
}

export interface InvoiceKPIs {
  totalOutstanding: number;
  totalOverdue: number;
  totalPaidThisMonth: number;
  totalDrafts: number;
  activeCount: number;
  overdueCount: number;
}

export interface InvoiceActionResult<T = unknown> {
  success: boolean;
  error?: string;
  errors?: Record<string, string[]>;
  data?: T;
}
