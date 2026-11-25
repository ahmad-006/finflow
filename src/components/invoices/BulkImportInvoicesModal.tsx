"use client";

import * as React from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserPlus,
} from "lucide-react";
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  generateCsv,
  parseCsv,
  pickCsvField,
} from "@/lib/csv";
import { formatUserError } from "@/lib/errors";
import { bulkImportInvoicesAction } from "@/modules/invoices/actions";
import {
  calculateInvoiceTotals,
  DEFAULT_EXCHANGE_RATES,
  SUPPORTED_CURRENCIES,
} from "@/modules/invoices/currency";
import { formatMoney } from "@/lib/format";
import type {
  BulkImportInvoicesResult,
  BulkInvoiceRowInput,
  InvoiceCurrency,
} from "@/modules/invoices/types";
import type { ClientOption } from "./InvoiceBuilderView";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface BulkImportInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientOption[];
  baseCurrency?: string;
  initialExchangeRates?: Record<InvoiceCurrency, number>;
  onSuccess?: (result: BulkImportInvoicesResult) => void;
}

type ImportStep = "upload" | "preview" | "summary";

interface PreviewInvoiceGroup {
  key: string;
  label: string;
  rowNumbers: number[];
  clientEmail: string;
  clientName: string;
  clientStatus: "existing" | "autocreate" | "missing";
  canAutoCreate: boolean;
  currency: InvoiceCurrency;
  status: string;
  itemCount: number;
  totalAmount: number;
  errorMessage: string | null;
}

const INVOICE_TEMPLATE_HEADERS = [
  "invoiceGroup",
  "clientEmail",
  "clientName",
  "currency",
  "exchangeRate",
  "issueDate",
  "dueDate",
  "taxRate",
  "status",
  "description",
  "quantity",
  "unitPrice",
  "notes",
] as const;

function normalizeBaseCurrency(code?: string): InvoiceCurrency {
  const upper = (code || "PKR").toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as InvoiceCurrency)
    : "PKR";
}

function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function BulkImportInvoicesModalContent({
  onClose,
  clients,
  baseCurrency = "PKR",
  initialExchangeRates,
  onSuccess,
}: Omit<BulkImportInvoicesModalProps, "isOpen">) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [autoCreateMissingClients, setAutoCreateMissingClients] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [rawInputs, setRawInputs] = React.useState<BulkInvoiceRowInput[]>([]);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importResult, setImportResult] = React.useState<BulkImportInvoicesResult | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const normalizedBase = React.useMemo(
    () => normalizeBaseCurrency(baseCurrency),
    [baseCurrency]
  );

  const rates = React.useMemo<Record<InvoiceCurrency, number>>(
    () => ({
      ...DEFAULT_EXCHANGE_RATES,
      ...(initialExchangeRates || {}),
      [normalizedBase]: 1.0,
    }),
    [initialExchangeRates, normalizedBase]
  );

  const clientByEmail = React.useMemo(() => {
    const map = new Map<string, ClientOption>();
    for (const c of clients) {
      map.set(c.email.trim().toLowerCase(), c);
    }
    return map;
  }, [clients]);

  const handleDownloadTemplate = () => {
    const todayIso = new Date().toISOString().split("T")[0];
    const dueIso = addDaysIso(todayIso, 30);
    const sampleClient = clients[0];
    const sampleEmail1 = sampleClient?.email || "billing@crestline.pk";
    const sampleName1 = sampleClient?.clientName || "Crestline Packaging LLC";
    const sampleEmail2 = clients[1]?.email || "accounts@northstarlogistics.com";
    const sampleName2 = clients[1]?.clientName || "Northstar Logistics Pvt Ltd";

    const rows = [
      [
        "",
        sampleEmail1,
        sampleName1,
        normalizedBase,
        "1",
        todayIso,
        dueIso,
        "0",
        "DRAFT",
        "Monthly Advisory Retainer",
        "1",
        "75000",
        "Bank transfer within 30 days",
      ],
      [
        "GRP-2026-01",
        sampleEmail2,
        sampleName2,
        normalizedBase,
        "1",
        todayIso,
        dueIso,
        "10",
        "SENT",
        "Platform Architecture Review",
        "10",
        "4500",
        "Q4 engineering milestone",
      ],
      [
        "GRP-2026-01",
        sampleEmail2,
        sampleName2,
        normalizedBase,
        "1",
        todayIso,
        dueIso,
        "10",
        "SENT",
        "Security & Ledger Audit",
        "1",
        "35000",
        "Q4 engineering milestone",
      ],
    ];

    const csv = generateCsv(INVOICE_TEMPLATE_HEADERS, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "finflow-invoices-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processCsvText = (text: string, sourceName: string) => {
    setParseError(null);
    setImportError(null);

    const parsed = parseCsv(text);
    if (parsed.error) {
      setParseError(parsed.error);
      return;
    }

    const mappedRows: BulkInvoiceRowInput[] = parsed.rows.map((row) => ({
      rowNumber: row.rowNumber,
      invoiceGroup:
        pickCsvField(row, [
          "invoiceGroup",
          "invoice_group",
          "group",
          "invoiceRef",
          "reference",
        ]) || undefined,
      clientEmail: pickCsvField(row, ["clientEmail", "client_email", "email"]),
      clientName:
        pickCsvField(row, ["clientName", "client_name", "name"]) || undefined,
      currency: pickCsvField(row, ["currency", "curr"]) || undefined,
      exchangeRate:
        pickCsvField(row, ["exchangeRate", "exchange_rate", "fxRate", "rate"]) ||
        undefined,
      issueDate: pickCsvField(row, ["issueDate", "issue_date", "date"]),
      dueDate: pickCsvField(row, ["dueDate", "due_date"]) || undefined,
      taxRate: pickCsvField(row, ["taxRate", "tax_rate", "tax"]) || undefined,
      status: pickCsvField(row, ["status"]) || undefined,
      description: pickCsvField(row, [
        "description",
        "itemDescription",
        "item",
        "lineItem",
      ]),
      quantity: pickCsvField(row, ["quantity", "qty"]) || "1",
      unitPrice: pickCsvField(row, [
        "unitPrice",
        "unit_price",
        "price",
        "rateAmount",
      ]),
      notes: pickCsvField(row, ["notes", "memo"]) || undefined,
    }));

    setFileName(sourceName);
    setRawInputs(mappedRows);
    setStep("preview");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParseError(null);

    if (file.size > CSV_MAX_BYTES) {
      setParseError(
        `File exceeds the ${Math.floor(CSV_MAX_BYTES / (1024 * 1024))} MB limit.`
      );
      return;
    }

    if (
      !file.name.toLowerCase().endsWith(".csv") &&
      file.type &&
      !file.type.includes("csv") &&
      !file.type.includes("text")
    ) {
      setParseError("Please upload a valid .csv file.");
      return;
    }

    try {
      const text = await file.text();
      processCsvText(text, file.name);
    } catch {
      setParseError("Unable to read the selected CSV file.");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    void handleFile(file);
  };

  const groupedPreview = React.useMemo<PreviewInvoiceGroup[]>(() => {
    if (rawInputs.length === 0) return [];

    const groupMap = new Map<string, BulkInvoiceRowInput[]>();
    for (const row of rawInputs) {
      const groupKey = row.invoiceGroup?.trim();
      const mapKey = groupKey
        ? `grp:${groupKey.toLowerCase()}`
        : `row:${row.rowNumber ?? 0}`;
      const bucket = groupMap.get(mapKey);
      if (bucket) {
        bucket.push(row);
      } else {
        groupMap.set(mapKey, [row]);
      }
    }

    const result: PreviewInvoiceGroup[] = [];

    for (const [key, groupRows] of groupMap.entries()) {
      const first = groupRows[0];
      const rowNumbers = groupRows.map((r) => r.rowNumber ?? 0);
      const label = first.invoiceGroup?.trim() || `Row #${first.rowNumber ?? 0}`;

      const distinctEmails = new Set(
        groupRows.map((r) => (r.clientEmail || "").trim().toLowerCase()).filter(Boolean)
      );
      const primaryEmail = (first.clientEmail || "").trim().toLowerCase();
      const firstClientName =
        groupRows.find((r) => r.clientName && r.clientName.trim().length >= 2)?.clientName?.trim() ||
        "";

      const existingClient = primaryEmail ? clientByEmail.get(primaryEmail) : undefined;
      const canAutoCreate = Boolean(!existingClient && firstClientName.length >= 2);

      let clientStatus: PreviewInvoiceGroup["clientStatus"] = "missing";
      if (existingClient) {
        clientStatus = "existing";
      } else if (autoCreateMissingClients && canAutoCreate) {
        clientStatus = "autocreate";
      }

      const rawCurrency = (first.currency || normalizedBase).trim().toUpperCase();
      const validCurrency = (SUPPORTED_CURRENCIES as readonly string[]).includes(rawCurrency);
      const currency: InvoiceCurrency = validCurrency
        ? (rawCurrency as InvoiceCurrency)
        : normalizedBase;

      const rawStatus = (first.status || "DRAFT").trim().toUpperCase();
      const validStatus = rawStatus === "DRAFT" || rawStatus === "SENT";

      const taxRateNum =
        first.taxRate !== undefined && String(first.taxRate).trim() !== ""
          ? Number(first.taxRate)
          : 0;
      const customFx =
        first.exchangeRate !== undefined && String(first.exchangeRate).trim() !== ""
          ? Number(first.exchangeRate)
          : currency === normalizedBase
          ? 1
          : rates[currency] ?? 1;

      const issueDateObj = new Date(first.issueDate);
      const termsDays = existingClient?.paymentTermsDays ?? 30;
      const resolvedDueDateStr =
        first.dueDate?.trim() || addDaysIso(first.issueDate, termsDays);
      const dueDateObj = new Date(resolvedDueDateStr);

      let errorMessage: string | null = null;

      if (!primaryEmail || !isValidEmailFormat(primaryEmail)) {
        errorMessage = "Valid clientEmail is required.";
      } else if (distinctEmails.size > 1) {
        errorMessage = "Mixed clientEmail values within the same invoiceGroup.";
      } else if (!existingClient && !autoCreateMissingClients) {
        errorMessage = canAutoCreate
          ? "Client not in directory (enable auto-create to create)."
          : "Client email not found in directory.";
      } else if (!existingClient && autoCreateMissingClients && !canAutoCreate) {
        errorMessage = "Provide clientName (min 2 chars) to auto-create missing client.";
      } else if (!validCurrency) {
        errorMessage = `Unsupported currency "${rawCurrency}".`;
      } else if (!validStatus) {
        errorMessage = `Status "${rawStatus}" is not allowed (use DRAFT or SENT).`;
      } else if (!first.issueDate || isNaN(issueDateObj.getTime())) {
        errorMessage = "Invalid issueDate.";
      } else if (isNaN(dueDateObj.getTime())) {
        errorMessage = "Invalid dueDate.";
      } else if (dueDateObj.setHours(0, 0, 0, 0) < issueDateObj.setHours(0, 0, 0, 0)) {
        errorMessage = "dueDate cannot be earlier than issueDate.";
      } else if (isNaN(taxRateNum) || taxRateNum < 0 || taxRateNum > 100) {
        errorMessage = "taxRate must be between 0 and 100.";
      } else if (isNaN(customFx) || customFx <= 0) {
        errorMessage = "exchangeRate must be positive.";
      }

      const lineItems: Array<{ quantity: number; unitPrice: number }> = [];
      for (const itemRow of groupRows) {
        const desc = (itemRow.description || "").trim();
        const qty =
          itemRow.quantity !== undefined && String(itemRow.quantity).trim() !== ""
            ? Number(itemRow.quantity)
            : 1;
        const price = Number(itemRow.unitPrice);

        if (!errorMessage) {
          if (!desc) {
            errorMessage = `Row #${itemRow.rowNumber}: description is required.`;
          } else if (isNaN(qty) || qty <= 0) {
            errorMessage = `Row #${itemRow.rowNumber}: quantity must be greater than 0.`;
          } else if (itemRow.unitPrice === "" || isNaN(price) || price < 0) {
            errorMessage = `Row #${itemRow.rowNumber}: unitPrice must be 0 or greater.`;
          }
        }

        lineItems.push({
          quantity: isNaN(qty) || qty < 0 ? 0 : qty,
          unitPrice: isNaN(price) || price < 0 ? 0 : price,
        });
      }

      const totals = calculateInvoiceTotals(
        lineItems,
        isNaN(taxRateNum) || taxRateNum < 0 ? 0 : taxRateNum,
        currency,
        isNaN(customFx) || customFx <= 0 ? 1 : customFx,
        normalizedBase
      );

      result.push({
        key,
        label,
        rowNumbers,
        clientEmail: first.clientEmail || "—",
        clientName: existingClient?.clientName || firstClientName || "Unknown client",
        clientStatus,
        canAutoCreate,
        currency,
        status: validStatus ? rawStatus : rawStatus || "DRAFT",
        itemCount: groupRows.length,
        totalAmount: totals.totalAmount,
        errorMessage,
      });
    }

    return result;
  }, [rawInputs, clientByEmail, autoCreateMissingClients, normalizedBase, rates]);

  const previewSummary = React.useMemo(() => {
    let valid = 0;
    let invalid = 0;
    let missingCreatable = 0;
    for (const g of groupedPreview) {
      if (g.errorMessage === null) valid++;
      else invalid++;
      if (g.clientStatus === "missing" && g.canAutoCreate) {
        missingCreatable++;
      }
    }
    return {
      totalInvoices: groupedPreview.length,
      totalRows: rawInputs.length,
      valid,
      invalid,
      missingCreatable,
    };
  }, [groupedPreview, rawInputs.length]);

  const handleImport = () => {
    setImportError(null);
    startTransition(async () => {
      try {
        const res = await bulkImportInvoicesAction(rawInputs, {
          autoCreateMissingClients,
        });
        if (!res.success || !res.data) {
          setImportError(res.error || "Failed to import invoices.");
          return;
        }
        setImportResult(res.data);
        setStep("summary");
        onSuccess?.(res.data);
      } catch (err) {
        setImportError(
          formatUserError(err, "Unable to complete invoice import. Please try again.")
        );
      }
    });
  };

  const footer =
    step === "upload" ? (
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        className="min-h-[44px] h-11 px-5 rounded-full text-sm font-medium"
      >
        Cancel
      </Button>
    ) : step === "preview" ? (
      <>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            setStep("upload");
            setImportError(null);
          }}
          className="min-h-[44px] h-11 px-5 rounded-full text-sm font-medium"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={isPending || previewSummary.valid === 0}
          isLoading={isPending}
          onClick={handleImport}
          className="min-h-[44px] h-11 px-6 rounded-full text-sm font-medium"
        >
          {isPending
            ? "Importing..."
            : `Import ${previewSummary.valid} ${previewSummary.valid === 1 ? "Invoice" : "Invoices"}`}
        </Button>
      </>
    ) : (
      <Button
        type="button"
        variant="primary"
        onClick={onClose}
        className="min-h-[44px] h-11 px-6 rounded-full text-sm font-medium"
      >
        Done
      </Button>
    );

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      eyebrow="Accounts Receivable Import"
      title="Bulk Import Invoices (CSV)"
      description="Upload single-line or multi-line grouped invoices (up to 500 CSV rows per batch)."
      preventClose={isPending}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { id: "upload", label: "1. Upload CSV" },
            { id: "preview", label: "2. Preview & Totals" },
            { id: "summary", label: "3. Import Summary" },
          ].map((item) => {
            const active = step === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  "px-3 py-2 rounded-[10px] border text-center font-medium transition-colors",
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-fog/50 text-ink-3"
                )}
              >
                {item.label}
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[12px] bg-fog/60 border border-line">
              <div className="text-xs text-ink-2">
                <p className="font-semibold text-ink">Download a multi-line CSV template</p>
                <p className="text-ink-3 mt-0.5">
                  Includes 1 single-line invoice and 1 two-line invoice grouped via invoiceGroup.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="compact"
                onClick={handleDownloadTemplate}
                className="min-h-[44px] px-4 rounded-full bg-white border border-line text-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Template</span>
              </Button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                "border border-dashed rounded-[14px] p-8 text-center cursor-pointer transition-colors flex flex-col items-center gap-2.5",
                isDragging
                  ? "border-ink bg-fog"
                  : "border-line-strong bg-fog/30 hover:bg-fog/60"
              )}
            >
              <div className="h-11 w-11 rounded-full bg-white border border-line flex items-center justify-center text-ink">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">
                  Drop your invoice CSV file here, or click to browse
                </p>
                <p className="text-xs text-ink-3 mt-1">
                  Maximum file size: {Math.floor(CSV_MAX_BYTES / (1024 * 1024))} MB · Up to {CSV_MAX_ROWS} rows
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="p-4 rounded-[12px] border border-line bg-white">
              <Checkbox
                id="auto-create-missing-clients"
                checked={autoCreateMissingClients}
                onChange={(e) => setAutoCreateMissingClients(e.target.checked)}
                label="Auto-create missing clients when clientName is provided"
              />
              <p className="text-xs text-ink-3 mt-1.5 pl-6">
                When disabled, rows referencing an unknown clientEmail are rejected during import.
              </p>
            </div>

            {parseError && (
              <div className="flex items-start gap-2 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-ink-2">
                <FileSpreadsheet className="w-4 h-4 text-ink-3" />
                <span className="font-medium text-ink">{fileName}</span>
                <span className="text-ink-3">
                  ({previewSummary.totalInvoices} invoices from {previewSummary.totalRows} rows)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-moss-tint text-moss font-medium">
                  {previewSummary.valid} ready
                </span>
                {previewSummary.invalid > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-ember-tint text-ember-ink font-medium">
                    {previewSummary.invalid} invalid
                  </span>
                )}
              </div>
            </div>

            {/* One-click enable banner for missing clients */}
            {previewSummary.missingCreatable > 0 && !autoCreateMissingClients && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[12px] border border-amber/30 bg-amber-tint/70 text-xs">
                <div className="flex items-start gap-2 text-ink">
                  <UserPlus className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                  <span>
                    {previewSummary.missingCreatable}{" "}
                    {previewSummary.missingCreatable === 1 ? "invoice references" : "invoices reference"}{" "}
                    clients not yet in your directory with a clientName provided.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => setAutoCreateMissingClients(true)}
                  className="min-h-[36px] px-3.5 rounded-full bg-white border border-line text-xs shrink-0"
                >
                  Auto-create missing clients
                </Button>
              </div>
            )}

            {importError && (
              <div className="flex items-start gap-2 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div className="border border-line rounded-[12px] overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-fog border-b border-line text-[11px] font-mono uppercase text-ink-3">
                    <tr>
                      <th className="py-2.5 px-3">Group / Rows</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {groupedPreview.map((group) => (
                      <tr key={group.key}>
                        <td className="py-2.5 px-3 font-mono text-ink">
                          <div>{group.label}</div>
                          <div className="text-[10px] text-ink-3">
                            Rows: {group.rowNumbers.join(", ")}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-ink">{group.clientName}</div>
                          <div className="text-[11px] text-ink-3">{group.clientEmail}</div>
                          {group.clientStatus === "autocreate" && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-[6px] bg-amber-tint text-amber text-[10px] font-medium">
                              Will auto-create
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-ink-2">
                          {group.itemCount} · {group.status}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink num">
                          {formatMoney(group.totalAmount, group.currency)}
                        </td>
                        <td className="py-2.5 px-3">
                          {group.errorMessage === null ? (
                            <span className="inline-flex items-center gap-1 text-moss font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-ember-ink font-medium">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              {group.errorMessage}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Summary */}
        {step === "summary" && importResult && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-[12px] bg-moss-tint/50 border border-line">
                <span className="text-[11px] font-mono uppercase text-ink-3 block">
                  Invoices Created
                </span>
                <span className="text-xl font-sans font-semibold text-moss num">
                  {importResult.createdCount}
                </span>
              </div>
              <div className="p-3.5 rounded-[12px] bg-fog border border-line">
                <span className="text-[11px] font-mono uppercase text-ink-3 block">
                  Clients Auto-Created
                </span>
                <span className="text-xl font-sans font-semibold text-ink num">
                  {importResult.autoCreatedClientsCount}
                </span>
              </div>
              <div className="p-3.5 rounded-[12px] bg-ember-tint/50 border border-line">
                <span className="text-[11px] font-mono uppercase text-ink-3 block">
                  Failed
                </span>
                <span className="text-xl font-sans font-semibold text-ember-ink num">
                  {importResult.failedCount}
                </span>
              </div>
            </div>

            {importResult.createdInvoices.length > 0 && (
              <div className="border border-line rounded-[12px] p-3.5 bg-fog/30">
                <h3 className="text-xs font-semibold text-ink mb-2">
                  Generated invoices ({importResult.createdInvoices.length})
                </h3>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {importResult.createdInvoices.map((inv) => (
                    <span
                      key={inv.id}
                      className="px-2.5 py-1 rounded-full bg-white border border-line font-mono text-[11px] text-ink"
                    >
                      {inv.invoiceNumber}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="border border-ember/30 rounded-[12px] p-3.5 bg-ember-tint/40">
                <h3 className="text-xs font-semibold text-ember-ink mb-2">
                  Import errors ({importResult.errors.length})
                </h3>
                <ul className="space-y-1 max-h-36 overflow-y-auto text-xs text-ember-ink">
                  {importResult.errors.map((err, idx) => (
                    <li key={`${err.rowNumber}-${idx}`}>
                      Row #{err.rowNumber} ({err.invoiceGroup || err.clientEmail || "Row"}):{" "}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function BulkImportInvoicesModal({
  isOpen,
  onClose,
  clients,
  baseCurrency = "PKR",
  initialExchangeRates,
  onSuccess,
}: BulkImportInvoicesModalProps) {
  if (!isOpen) return null;
  return (
    <BulkImportInvoicesModalContent
      onClose={onClose}
      clients={clients}
      baseCurrency={baseCurrency}
      initialExchangeRates={initialExchangeRates}
      onSuccess={onSuccess}
    />
  );
}
