import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  InvoiceDocumentModel,
  PDFGeneratorOptions,
  GeneratedDocument,
} from "./types";
import type { InvoiceCurrency } from "@/modules/invoices/types";

// Claude Inkline v3 monochromatic design tokens (RGB tuples for jsPDF)
const COLOR_INK = [13, 27, 42] as const; // #0D1B2A (primary ink)
const COLOR_INK_SECONDARY = [59, 70, 84] as const; // #3B4654 (secondary text)
const COLOR_INK_MUTED = [95, 107, 122] as const; // #5F6B7A (tertiary text & labels)
const COLOR_HAIRLINE = [229, 231, 235] as const; // #E5E7EB (crisp hairlines)
const COLOR_TABLE_HEADER = [249, 250, 251] as const; // #F9FAFB (table header background)
const COLOR_FOG = [245, 246, 247] as const; // #F5F6F7 (subtle background fill)
const COLOR_MOSS = [30, 122, 85] as const; // #1E7A55 (paid status green)
const COLOR_EMBER = [196, 46, 22] as const; // #C42E16 (overdue / warning red)

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "Rs.",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
};

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  PKR: 1.0,
  USD: 278.4,
  EUR: 301.25,
  GBP: 351.9,
  AED: 75.8,
};

/**
 * Formats a monetary number with standard grouping and 2 decimal places.
 */
/**
 * Safely sanitizes arbitrary text for jsPDF standard Helvetica (WinAnsi).
 * Converts Unicode Rupee symbol ₨ (\u20A8) to standard ASCII "Rs." to avoid
 * WinAnsi mojibake (¨ or ").
 */
export function sanitizeTextForPDF(text: string | null | undefined): string {
  if (!text) return "";
  return String(text).replace(/₨/g, "Rs.");
}

/**
 * Formats a monetary number with standard grouping and 2 decimal places.
 */
export function formatDocumentMoney(
  amount: number | string,
  currency = "PKR",
  options?: { showSymbol?: boolean; showCode?: boolean }
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const safeNum = isNaN(num) ? 0 : num;
  const isNegative = safeNum < 0;
  const absNum = Math.abs(safeNum);

  const formattedNum = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absNum);

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const sign = isNegative ? "-" : "";

  if (options?.showSymbol && options?.showCode) {
    return `${sign}${symbol} ${formattedNum} ${currency}`;
  }

  if (options?.showCode) {
    return `${sign}${currency} ${formattedNum}`;
  }

  if (currency === "AED") {
    return `${sign}AED ${formattedNum}`;
  }

  return `${sign}${symbol} ${formattedNum}`;
}

/**
 * Formats calendar dates per FinFlow design system: "16 Nov 2026".
 */
export function formatDocumentDate(date: Date | string | number | undefined | null): string {
  if (!date) return "—";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Formats the dual-currency base equivalent string per Claude Inkline v3:
 * e.g. "$ 6,300.00 USD = ₨ 1,753,920.00 PKR @ spot rate"
 */
export function formatDualCurrencyEquivalent(
  totalAmount: number,
  currency: string,
  baseTotalAmount?: number,
  baseCurrency = "PKR",
  exchangeRate?: number
): string {
  const sourceSymbol = CURRENCY_SYMBOLS[currency] || currency;
  const targetSymbol = CURRENCY_SYMBOLS[baseCurrency] || baseCurrency;

  const rate = exchangeRate || DEFAULT_EXCHANGE_RATES[currency] || 1.0;
  const calculatedBase =
    baseTotalAmount !== undefined && baseTotalAmount !== null && baseTotalAmount > 0
      ? baseTotalAmount
      : totalAmount * rate;

  const formattedSource = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalAmount);

  const formattedBase = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(calculatedBase);

  return `${sourceSymbol} ${formattedSource} ${currency} = ${targetSymbol} ${formattedBase} ${baseCurrency} @ spot rate`;
}

/**
 * Resolves standard file name: INV-YYYY-XXXX.pdf
 */
export function getInvoicePDFFilename(
  invoice: InvoiceDocumentModel,
  options?: PDFGeneratorOptions
): string {
  if (options?.filename) {
    return options.filename.endsWith(".pdf") ? options.filename : `${options.filename}.pdf`;
  }
  const rawNumber = invoice.invoiceNumber || "INV-DOCUMENT";
  const cleanNumber = rawNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${cleanNumber}.pdf`;
}

/**
 * Normalizes input invoice data and options into a fully formed InvoiceDocumentModel.
 */
export function toInvoiceDocumentModel(
  invoice: InvoiceDocumentModel | any,
  options?: PDFGeneratorOptions
): InvoiceDocumentModel {
  const baseCurrency = options?.baseCurrency || invoice.baseCurrency || invoice.company?.baseCurrency || "PKR";
  const exchangeRate =
    invoice.exchangeRate ?? options?.baseCurrency
      ? invoice.exchangeRate ?? DEFAULT_EXCHANGE_RATES[invoice.currency] ?? 1.0
      : DEFAULT_EXCHANGE_RATES[invoice.currency] ?? 1.0;

  const calculatedBaseTotal =
    invoice.baseTotalAmount ??
    (invoice.currency === baseCurrency ? invoice.totalAmount : invoice.totalAmount * exchangeRate);

  const resolvedCompanyName =
    options?.companyName ||
    invoice.companyName ||
    invoice.company?.name ||
    "Rehman and Sons Trading";

  const isDemo = resolvedCompanyName === "Rehman and Sons Trading";

  return {
    id: invoice.id,
    companyId: invoice.companyId,
    invoiceNumber: invoice.invoiceNumber || "INV-DRAFT",
    viewToken: invoice.viewToken || invoice.id || "portal",
    currency: invoice.currency || "PKR",
    exchangeRate,
    issueDate: invoice.issueDate || new Date(),
    dueDate: invoice.dueDate || new Date(),
    subtotal: Number(invoice.subtotal) || 0,
    taxRate: Number(invoice.taxRate) || 0,
    taxAmount: Number(invoice.taxAmount) || 0,
    totalAmount: Number(invoice.totalAmount) || 0,
    baseTotalAmount: Number(calculatedBaseTotal) || 0,
    paidAmount: Number(invoice.paidAmount) || 0,
    status: invoice.status || "DRAFT",
    notes: invoice.notes ?? null,
    client: {
      id: invoice.client?.id,
      clientName: invoice.client?.clientName || "Commercial Client",
      email: invoice.client?.email || "",
      paymentTermsDays: invoice.client?.paymentTermsDays ?? 30,
      phone: invoice.client?.phone ?? null,
      address: invoice.client?.address ?? null,
    },
    items: Array.isArray(invoice.items)
      ? invoice.items.map((item: any) => ({
          id: item.id,
          description: item.description || "Service / Goods Delivery",
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          lineTotal: Number(item.lineTotal) || Number(item.quantity || 1) * Number(item.unitPrice || 0),
        }))
      : [],
    company: {
      name: resolvedCompanyName,
      email:
        options?.companyEmail ||
        invoice.company?.email ||
        (isDemo ? "billing@rehman-trading.pk" : ""),
      phone:
        options?.companyPhone ||
        invoice.company?.phone ||
        (isDemo ? "+92 (51) 844-2100" : ""),
      address:
        options?.companyAddress ||
        invoice.company?.address ||
        (isDemo ? "Plot 14-B, Industrial Zone, Sector I-9\nIslamabad, 44000, Pakistan" : ""),
      baseCurrency,
    },
    companyName: resolvedCompanyName,
    baseCurrency,
    wireRemittanceNotes: options?.wireRemittanceNotes || invoice.wireRemittanceNotes,
    verificationUrl: options?.verificationUrl || invoice.verificationUrl,
  };
}

/**
 * Pure client-side vector PDF generator using jsPDF and jspdf-autotable.
 * Strictly adheres to Claude Inkline v3 standards:
 * - A4 dimensions: 210 x 297 mm
 * - 20 mm margins
 * - Monochromatic #0D1B2A palette
 * - Crisp hairlines (#E5E7EB)
 * - Table headers (#F9FAFB)
 * - Company header & Bill-To block
 * - Auto-table line items
 * - Right-aligned totals block
 * - Dual-currency base equivalent
 * - Wire remittance notes
 * - Digital verification link (/pay/{viewToken})
 */
export function generateInvoicePDF(
  rawInvoice: InvoiceDocumentModel,
  options?: PDFGeneratorOptions
): jsPDF {
  const invoice = toInvoiceDocumentModel(rawInvoice, options);

  // Initialize jsPDF A4 document with 20mm margins
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Geometry
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const leftX = margin;
  const rightX = pageWidth - margin; // 190mm
  const usableWidth = rightX - leftX; // 170mm

  // PDF Document Metadata
  doc.setProperties({
    title: `Invoice ${invoice.invoiceNumber}`,
    subject: `Commercial Invoice for ${invoice.client.clientName}`,
    author: invoice.companyName || "FinFlow Workspace",
    creator: "FinFlow Treasury Systems (Inkline v3)",
  });

  // Default font hierarchy (falls back to clean Helvetica per design system specification)
  doc.setFont("helvetica", "normal");

  // ==========================================
  // 1. TOP HEADER SECTION (Y: 20mm to ~52mm)
  // ==========================================
  let curY = 22;

  // Left: Company Header
  const companyName = invoice.company?.name || invoice.companyName || "Rehman and Sons Trading";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_INK);
  doc.text(companyName, leftX, curY);

  curY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_INK_MUTED);
  doc.text("COMMERCIAL ACCOUNTS RECEIVABLE", leftX, curY);

  curY += 4.5;
  if (invoice.company?.address) {
    const addressLines = doc.splitTextToSize(invoice.company.address, 75);
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_INK_SECONDARY);
    doc.text(addressLines, leftX, curY);
    curY += addressLines.length * 3.5;
  }

  const contactLine = [invoice.company?.email, invoice.company?.phone].filter(Boolean).join(" · ");
  if (contactLine) {
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_INK_MUTED);
    doc.text(contactLine, leftX, curY);
    curY += 4;
  }

  // Right: Document Title & Metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(26);
  doc.setTextColor(...COLOR_INK);
  doc.text("INVOICE", rightX, 26, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(invoice.invoiceNumber, rightX, 33, { align: "right" });

  // Status Badge Callout
  const rawStatus = (invoice.status || "DRAFT").toUpperCase();
  const statusColor: readonly [number, number, number] =
    rawStatus === "PAID"
      ? COLOR_MOSS
      : rawStatus === "OVERDUE"
      ? COLOR_EMBER
      : COLOR_INK_MUTED;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`STATUS: ${rawStatus}`, rightX, 38, { align: "right" });

  // Right-aligned Key Metadata Block
  const metaStartY = 43;
  const metaItems = [
    { label: "ISSUE DATE", val: formatDocumentDate(invoice.issueDate) },
    { label: "PAYMENT DUE", val: formatDocumentDate(invoice.dueDate) },
    { label: "TERMS", val: `Net ${invoice.client.paymentTermsDays ?? 30} Days` },
    { label: "CURRENCY", val: String(invoice.currency) },
  ];

  let mY = metaStartY;
  for (const item of metaItems) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_INK_MUTED);
    doc.text(`${item.label}:`, rightX - 32, mY, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLOR_INK);
    doc.text(item.val, rightX, mY, { align: "right" });
    mY += 4.2;
  }

  // Header Divider Hairline (#E5E7EB)
  const headerDividerY = Math.max(curY + 4, mY + 2);
  doc.setDrawColor(...COLOR_HAIRLINE);
  doc.setLineWidth(0.25);
  doc.line(leftX, headerDividerY, rightX, headerDividerY);

  // ==========================================
  // 2. BILL-TO BLOCK (Y: ~60mm to ~82mm)
  // ==========================================
  let billY = headerDividerY + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_INK_MUTED);
  doc.text("BILLED TO", leftX, billY);

  billY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_INK);
  doc.text(invoice.client.clientName, leftX, billY);

  billY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_INK_SECONDARY);
  doc.text(invoice.client.email, leftX, billY);

  if (invoice.client.phone) {
    billY += 3.8;
    doc.text(invoice.client.phone, leftX, billY);
  }

  if (invoice.client.address) {
    billY += 3.8;
    const clientAddrLines = doc.splitTextToSize(invoice.client.address, 90);
    doc.text(clientAddrLines, leftX, billY);
    billY += clientAddrLines.length * 3.8;
  }

  // ==========================================
  // 3. AUTO-TABLE LINE ITEMS
  // ==========================================
  const tableStartY = Math.max(billY + 6, headerDividerY + 26);

  const tableBody = invoice.items.length
    ? invoice.items.map((item) => [
        item.description,
        String(item.quantity),
        formatDocumentMoney(item.unitPrice, String(invoice.currency)),
        formatDocumentMoney(item.lineTotal, String(invoice.currency)),
      ])
    : [["No line items provided", "1", "0.00", "0.00"]];

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: leftX, right: pageWidth - rightX },
    head: [["DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"]],
    body: tableBody,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: [...COLOR_INK],
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      lineWidth: { bottom: 0.2 },
      lineColor: [...COLOR_HAIRLINE],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [...COLOR_TABLE_HEADER],
      textColor: [...COLOR_INK_MUTED],
      fontSize: 7.5,
      fontStyle: "bold",
      lineWidth: { top: 0.2, bottom: 0.25 },
      lineColor: [...COLOR_HAIRLINE],
    },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left" },
      1: { cellWidth: 20, halign: "right" },
      2: { cellWidth: 34, halign: "right" },
      3: { cellWidth: 38, halign: "right" },
    },
  });

  // Position after line items table
  let finalY = ((doc as any).lastAutoTable?.finalY ?? tableStartY + 40) + 7;

  // If table ran very long, break cleanly to next page for totals
  if (finalY > 215) {
    doc.addPage();
    finalY = 25;
  }

  // ==========================================
  // 4. LOWER ASYMMETRIC SECTION:
  //    Left: Wire Remittance & Digital Verification
  //    Right: Right-Aligned Totals & Dual Currency
  // ==========================================

  // --- RIGHT COLUMN: Totals Block ---
  const totalsBlockWidth = 76;
  const totalsLeftX = rightX - totalsBlockWidth;
  let tY = finalY;

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_INK_MUTED);
  doc.text("Subtotal", totalsLeftX, tY);
  doc.setTextColor(...COLOR_INK);
  doc.text(
    formatDocumentMoney(invoice.subtotal, String(invoice.currency)),
    rightX,
    tY,
    { align: "right" }
  );

  // Tax breakdown
  if (invoice.taxRate && invoice.taxRate > 0) {
    tY += 4.5;
    doc.setTextColor(...COLOR_INK_MUTED);
    doc.text(`Tax (${invoice.taxRate}%)`, totalsLeftX, tY);
    doc.setTextColor(...COLOR_INK);
    doc.text(
      formatDocumentMoney(invoice.taxAmount ?? 0, String(invoice.currency)),
      rightX,
      tY,
      { align: "right" }
    );
  }

  // Hairline divider above Total
  tY += 3;
  doc.setDrawColor(...COLOR_HAIRLINE);
  doc.setLineWidth(0.2);
  doc.line(totalsLeftX, tY, rightX, tY);

  // Total Amount (Prominent 14pt bold figure)
  tY += 5.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_INK);
  doc.text("Total Amount", totalsLeftX, tY);

  doc.setFontSize(13);
  doc.text(
    formatDocumentMoney(invoice.totalAmount, String(invoice.currency), { showCode: true }),
    rightX,
    tY,
    { align: "right" }
  );

  // Paid to Date & Balance Due (if payment recorded)
  if (invoice.paidAmount && invoice.paidAmount > 0) {
    tY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_MOSS);
    doc.text("Paid to Date", totalsLeftX, tY);
    doc.text(
      `- ${formatDocumentMoney(invoice.paidAmount, String(invoice.currency))}`,
      rightX,
      tY,
      { align: "right" }
    );

    tY += 4.5;
    const remainingBalance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    const balColor: readonly [number, number, number] =
      remainingBalance > 0 && rawStatus === "OVERDUE" ? COLOR_EMBER : COLOR_INK;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(balColor[0], balColor[1], balColor[2]);
    doc.text("Balance Due", totalsLeftX, tY);
    doc.text(
      formatDocumentMoney(remainingBalance, String(invoice.currency)),
      rightX,
      tY,
      { align: "right" }
    );
  }

  // Dual-Currency Base Equivalent Block
  // Rendered when foreign currency invoice is processed relative to company base currency
  const baseCurrency = options?.baseCurrency || invoice.baseCurrency || "PKR";
  const fxRate = invoice.exchangeRate || DEFAULT_EXCHANGE_RATES[String(invoice.currency)] || 1.0;
  const isForeignCurrency = String(invoice.currency) !== baseCurrency;

  if (isForeignCurrency) {
    const baseTotalAmount =
      invoice.baseTotalAmount ??
      (invoice.currency === baseCurrency ? invoice.totalAmount : invoice.totalAmount * fxRate);

    const formattedSource = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(invoice.totalAmount);

    const formattedBase = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(baseTotalAmount);

    tY += 6;
    const boxHeight = 17;
    doc.setFillColor(...COLOR_TABLE_HEADER);
    doc.setDrawColor(...COLOR_HAIRLINE);
    doc.setLineWidth(0.2);
    doc.rect(totalsLeftX, tY, totalsBlockWidth, boxHeight, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_INK_MUTED);
    doc.text(`BASE EQUIVALENT (${baseCurrency})`, totalsLeftX + 3.5, tY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_INK);
    const dualSummary = `${invoice.currency} ${formattedSource} = ${baseCurrency} ${formattedBase}`;
    doc.text(dualSummary, totalsLeftX + 3.5, tY + 9.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...COLOR_INK_MUTED);
    doc.text(
      `Spot FX Rate: 1 ${invoice.currency} = ${fxRate} ${baseCurrency}`,
      totalsLeftX + 3.5,
      tY + 14
    );
  }

  // --- LEFT COLUMN: Remittance Notes & Digital Verification ---
  let lY = finalY;
  const leftColWidth = 84;

  // Remittance Header & Instructions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_INK_MUTED);
  doc.text("PAYMENT INSTRUCTIONS & REMITTANCE", leftX, lY);

  lY += 4;
  const rawRemittanceText =
    options?.wireRemittanceNotes ||
    invoice.wireRemittanceNotes ||
    invoice.notes ||
    "Payment is requested in full by the due date specified. Wire transfer: Standard Chartered Bank, A/C # 01-2345678-01, IBAN: PK36SCBL0000001234567801. Please cite invoice number with wire transfer remittance.";
  const remittanceText = sanitizeTextForPDF(rawRemittanceText);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_INK_SECONDARY);
  const splitRemittance = doc.splitTextToSize(remittanceText, leftColWidth);
  doc.text(splitRemittance, leftX, lY);

  lY += splitRemittance.length * 3.5 + 4;

  // Digital Verification Link (Full URL format for print & digital verification)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_INK_MUTED);
  doc.text("DIGITAL VERIFICATION", leftX, lY);

  lY += 4;
  const origin =
    options?.origin ||
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://finflow.app");

  const viewToken = invoice.viewToken || "preview";
  const verificationPath = `/pay/${viewToken}`;
  const verificationUrl =
    options?.verificationUrl || invoice.verificationUrl || `${origin}${verificationPath}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_INK);
  doc.textWithLink(verificationUrl, leftX, lY, { url: verificationUrl });

  // Subtle underline for verification link
  const linkWidth = doc.getTextWidth(verificationUrl);
  doc.setDrawColor(...COLOR_INK_MUTED);
  doc.setLineWidth(0.15);
  doc.line(leftX, lY + 0.6, leftX + linkWidth, lY + 0.6);

  // ==========================================
  // 5. GLOBAL FOOTER (All Pages)
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Hairline divider at Y: 282mm
    doc.setDrawColor(...COLOR_HAIRLINE);
    doc.setLineWidth(0.2);
    doc.line(leftX, 282, rightX, 282);

    // Footer text at Y: 286mm
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_INK_MUTED);
    doc.text("FinFlow Treasury Systems · Official Commercial Document", leftX, 286);
    doc.text(`Page ${i} of ${totalPages}`, rightX, 286, { align: "right" });
  }

  return doc;
}

/**
 * Compiles and returns the raw PDF Blob representation.
 */
export function getInvoicePDFBlob(
  invoice: InvoiceDocumentModel,
  options?: PDFGeneratorOptions
): Blob {
  const doc = generateInvoicePDF(invoice, options);
  return doc.output("blob");
}

/**
 * Compiles and returns the raw PDF ArrayBuffer representation.
 */
export function getInvoicePDFArrayBuffer(
  invoice: InvoiceDocumentModel,
  options?: PDFGeneratorOptions
): ArrayBuffer {
  const doc = generateInvoicePDF(invoice, options);
  return doc.output("arraybuffer");
}

/**
 * Compiles the invoice PDF and triggers immediate client-side download as INV-YYYY-XXXX.pdf.
 */
export function downloadInvoicePDF(
  invoice: InvoiceDocumentModel,
  options?: PDFGeneratorOptions
): void {
  const doc = generateInvoicePDF(invoice, options);
  const filename = getInvoicePDFFilename(invoice, options);
  doc.save(filename);
}

/**
 * Returns a complete GeneratedDocument contract with filename, blob, dataUri, arrayBuffer, and doc.
 */
export function generateInvoiceDocument(
  invoice: InvoiceDocumentModel,
  options?: PDFGeneratorOptions
): GeneratedDocument {
  const doc = generateInvoicePDF(invoice, options);
  const filename = getInvoicePDFFilename(invoice, options);
  const blob = doc.output("blob");
  const dataUri = doc.output("dataurlstring");
  const arrayBuffer = doc.output("arraybuffer");

  return {
    filename,
    blob,
    dataUri,
    arrayBuffer,
    doc,
  };
}
