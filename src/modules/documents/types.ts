import type { jsPDF } from "jspdf";
import type { InvoiceCurrency, InvoiceStatus } from "@/modules/invoices/types";

export interface InvoiceDocumentItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceDocumentClient {
  id?: string;
  clientName: string;
  email: string;
  paymentTermsDays?: number;
  phone?: string | null;
  address?: string | null;
}

export interface InvoiceDocumentCompany {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  baseCurrency?: string;
}

export interface InvoiceDocumentModel {
  id?: string;
  companyId?: string;
  invoiceNumber: string;
  viewToken: string;
  currency: InvoiceCurrency | string;
  exchangeRate?: number;
  issueDate: Date | string;
  dueDate: Date | string;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount: number;
  baseTotalAmount?: number;
  paidAmount?: number;
  status?: InvoiceStatus | string;
  notes?: string | null;
  client: InvoiceDocumentClient;
  items: InvoiceDocumentItem[];
  company?: InvoiceDocumentCompany;
  companyName?: string;
  baseCurrency?: string;
  wireRemittanceNotes?: string | null;
  verificationUrl?: string;
}

export interface PDFGeneratorOptions {
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  baseCurrency?: string;
  origin?: string;
  verificationUrl?: string;
  wireRemittanceNotes?: string | null;
  filename?: string;
  autoDownload?: boolean;
  showDualCurrency?: boolean;
}

export interface GeneratedDocument {
  filename: string;
  blob: Blob;
  dataUri: string;
  arrayBuffer: ArrayBuffer;
  doc: jsPDF;
}
