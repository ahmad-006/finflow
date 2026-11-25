export type ClientRiskStatus = "HEALTHY" | "WATCHLIST" | "CRITICAL";

export type PaymentTermsOption = 7 | 15 | 30 | 45 | 60 | 90;

export interface ClientRecord {
  id: string;
  companyId: string;
  clientName: string;
  email: string;
  phone: string | null;
  address: string | null;
  paymentTermsDays: number;
  riskStatus: ClientRiskStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientInput {
  clientName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  paymentTermsDays?: number;
}

export interface UpdateClientInput {
  id: string;
  clientName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  paymentTermsDays?: number;
}

export interface ClientMetrics {
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueAmount: number;
  avgPaymentDelayDays: number;
  settledInvoicesCount: number;
  openInvoicesCount: number;
  overdueInvoicesCount: number;
  riskStatus: ClientRiskStatus;
}

export interface ClientInvoiceSummary {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  paidAt: Date | null;
  currency: string;
  totalAmount: number;
  baseTotalAmount: number;
  paidAmount: number;
  status: string;
  viewToken: string;
  delayDays: number;
}

export interface ClientWithMetrics extends ClientRecord {
  metrics: ClientMetrics;
}

export interface ClientDetailWithInvoices extends ClientWithMetrics {
  invoices: ClientInvoiceSummary[];
}

export interface ARAgingBuckets {
  current: number;       // Invoices not yet due
  days1to30: number;     // 1-30 days past due
  days31to60: number;    // 31-60 days past due
  days61to90: number;    // 61-90 days past due
  days90Plus: number;    // > 90 days past due
  totalOutstanding: number;
  totalOverdue: number;
}

export interface ClientActionResult<T = unknown> {
  success: boolean;
  error?: string;
  errors?: Record<string, string[]>;
  data?: T;
}

export interface BulkClientRowInput {
  rowNumber?: number;
  clientName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  paymentTermsDays?: number | string;
}

export interface BulkClientRowFeedback {
  rowNumber: number;
  clientName?: string;
  email?: string;
  message: string;
}

export interface BulkImportClientsOptions {
  duplicateMode?: "skip" | "fail";
}

export interface BulkImportClientsResult {
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  createdClients: ClientRecord[];
  skipped: BulkClientRowFeedback[];
  errors: BulkClientRowFeedback[];
}
