"use client";

import * as React from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  SkipForward,
  XCircle,
} from "lucide-react";
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  generateCsv,
  parseCsv,
  pickCsvField,
} from "@/lib/csv";
import { formatUserError } from "@/lib/errors";
import { bulkImportClientsAction } from "@/modules/clients/actions";
import { createClientSchema } from "@/modules/clients/validation";
import type {
  BulkClientRowInput,
  BulkImportClientsResult,
} from "@/modules/clients/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BulkImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingClientEmails?: string[];
  onSuccess?: (result: BulkImportClientsResult) => void;
}

type ImportStep = "upload" | "preview" | "summary";
type DuplicateMode = "skip" | "fail";

interface PreviewClientRow {
  rowNumber: number;
  input: BulkClientRowInput;
  parsedTerms: number | string;
  status: "valid" | "duplicate" | "invalid";
  message: string;
}

const CLIENT_TEMPLATE_HEADERS = [
  "clientName",
  "email",
  "phone",
  "address",
  "paymentTermsDays",
] as const;

const CLIENT_TEMPLATE_ROWS = [
  [
    "Crestline Packaging LLC",
    "billing@crestline.pk",
    "+92 300 4128901",
    "Plot 14, Industrial Area, Sector I-9, Islamabad",
    "30",
  ],
  [
    "Northstar Logistics Pvt Ltd",
    "accounts@northstarlogistics.com",
    "+92 321 9812340",
    "Suite 402, Shahrah-e-Faisal, Karachi",
    "Net 15",
  ],
];

function BulkImportClientsModalContent({
  onClose,
  existingClientEmails = [],
  onSuccess,
}: Omit<BulkImportClientsModalProps, "isOpen">) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [duplicateMode, setDuplicateMode] = React.useState<DuplicateMode>("skip");
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [previewRows, setPreviewRows] = React.useState<PreviewClientRow[]>([]);
  const [rawInputs, setRawInputs] = React.useState<BulkClientRowInput[]>([]);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importResult, setImportResult] = React.useState<BulkImportClientsResult | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const existingEmailSet = React.useMemo(
    () => new Set(existingClientEmails.map((e) => e.trim().toLowerCase())),
    [existingClientEmails]
  );

  const handleDownloadTemplate = () => {
    const csv = generateCsv(CLIENT_TEMPLATE_HEADERS, CLIENT_TEMPLATE_ROWS);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "finflow-clients-template.csv";
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

    const seenEmails = new Set<string>();
    const mappedInputs: BulkClientRowInput[] = [];
    const preview: PreviewClientRow[] = [];

    for (const row of parsed.rows) {
      const clientName = pickCsvField(row, [
        "clientName",
        "client_name",
        "name",
        "company",
        "companyName",
      ]);
      const email = pickCsvField(row, [
        "email",
        "billingEmail",
        "billing_email",
        "emailAddress",
      ]);
      const phone = pickCsvField(row, [
        "phone",
        "phoneNumber",
        "phone_number",
        "telephone",
      ]);
      const address = pickCsvField(row, [
        "address",
        "billingAddress",
        "billing_address",
      ]);
      const paymentTermsRaw = pickCsvField(row, [
        "paymentTermsDays",
        "payment_terms_days",
        "paymentTerms",
        "terms",
        "netDays",
      ]);

      const input: BulkClientRowInput = {
        rowNumber: row.rowNumber,
        clientName,
        email,
        phone: phone || null,
        address: address || null,
        paymentTermsDays: paymentTermsRaw || 30,
      };
      mappedInputs.push(input);

      const validation = createClientSchema.safeParse({
        clientName,
        email,
        phone: phone || null,
        address: address || null,
        paymentTermsDays: paymentTermsRaw || 30,
      });

      if (!validation.success) {
        const firstMsg = validation.error.issues[0]?.message || "Invalid client row";
        preview.push({
          rowNumber: row.rowNumber,
          input,
          parsedTerms: paymentTermsRaw || 30,
          status: "invalid",
          message: firstMsg,
        });
        continue;
      }

      const normEmail = validation.data.email.toLowerCase();
      if (seenEmails.has(normEmail)) {
        preview.push({
          rowNumber: row.rowNumber,
          input,
          parsedTerms: validation.data.paymentTermsDays,
          status: "duplicate",
          message: "Duplicate email in CSV",
        });
        continue;
      }
      seenEmails.add(normEmail);

      if (existingEmailSet.has(normEmail)) {
        preview.push({
          rowNumber: row.rowNumber,
          input,
          parsedTerms: validation.data.paymentTermsDays,
          status: "duplicate",
          message: "Already in directory",
        });
        continue;
      }

      preview.push({
        rowNumber: row.rowNumber,
        input,
        parsedTerms: validation.data.paymentTermsDays,
        status: "valid",
        message: `Net ${validation.data.paymentTermsDays}`,
      });
    }

    setFileName(sourceName);
    setRawInputs(mappedInputs);
    setPreviewRows(preview);
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

    if (!file.name.toLowerCase().endsWith(".csv") && file.type && !file.type.includes("csv") && !file.type.includes("text")) {
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

  const counts = React.useMemo(() => {
    let valid = 0;
    let duplicate = 0;
    let invalid = 0;
    for (const r of previewRows) {
      if (r.status === "valid") valid++;
      else if (r.status === "duplicate") duplicate++;
      else invalid++;
    }
    return { total: previewRows.length, valid, duplicate, invalid };
  }, [previewRows]);

  const handleImport = () => {
    setImportError(null);
    startTransition(async () => {
      try {
        const res = await bulkImportClientsAction(rawInputs, { duplicateMode });
        if (!res.success || !res.data) {
          setImportError(res.error || "Failed to import clients.");
          return;
        }
        setImportResult(res.data);
        setStep("summary");
        onSuccess?.(res.data);
      } catch (err) {
        setImportError(
          formatUserError(err, "Unable to complete client import. Please try again.")
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
          disabled={isPending || counts.valid === 0}
          isLoading={isPending}
          onClick={handleImport}
          className="min-h-[44px] h-11 px-6 rounded-full text-sm font-medium"
        >
          {isPending ? "Importing..." : `Import ${counts.valid} ${counts.valid === 1 ? "Client" : "Clients"}`}
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
      title="Bulk Import Clients (CSV)"
      description="Upload a CSV spreadsheet to create up to 500 client profiles in a single transaction."
      preventClose={isPending}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        {/* Step Progress Indicator */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { id: "upload", label: "1. Upload CSV" },
            { id: "preview", label: "2. Validate Rows" },
            { id: "summary", label: "3. Summary" },
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
                <p className="font-semibold text-ink">Download a ready-to-edit template</p>
                <p className="text-ink-3 mt-0.5">
                  Columns: clientName, email, phone, address, paymentTermsDays
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
                  Drop your CSV file here, or click to browse
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

            {/* Duplicate Handling Mode */}
            <div className="p-4 rounded-[12px] border border-line bg-white flex flex-col gap-2.5">
              <span className="text-xs font-medium text-ink">
                Duplicate email handling
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDuplicateMode("skip")}
                  className={cn(
                    "p-3 rounded-[10px] border text-left transition-colors",
                    duplicateMode === "skip"
                      ? "border-ink bg-fog/70"
                      : "border-line bg-white hover:bg-fog/30"
                  )}
                >
                  <p className="text-xs font-semibold text-ink">Skip duplicates (default)</p>
                  <p className="text-[11px] text-ink-3 mt-0.5">
                    Existing emails are skipped while new clients are imported.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateMode("fail")}
                  className={cn(
                    "p-3 rounded-[10px] border text-left transition-colors",
                    duplicateMode === "fail"
                      ? "border-ink bg-fog/70"
                      : "border-line bg-white hover:bg-fog/30"
                  )}
                >
                  <p className="text-xs font-semibold text-ink">Flag duplicates as errors</p>
                  <p className="text-[11px] text-ink-3 mt-0.5">
                    Report existing directory emails in the error log.
                  </p>
                </button>
              </div>
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
                <span className="text-ink-3">({counts.total} rows)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-moss-tint text-moss font-medium">
                  {counts.valid} ready
                </span>
                {counts.duplicate > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-tint text-amber font-medium">
                    {counts.duplicate} {duplicateMode === "skip" ? "to skip" : "duplicate"}
                  </span>
                )}
                {counts.invalid > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-ember-tint text-ember-ink font-medium">
                    {counts.invalid} invalid
                  </span>
                )}
              </div>
            </div>

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
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Client Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Terms</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-white">
                    {previewRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="py-2.5 px-3 font-mono text-ink-3">
                          #{row.rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-ink">
                          {row.input.clientName || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-ink-2">
                          {row.input.email || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-ink-2">
                          {row.status === "invalid" ? String(row.parsedTerms) : row.message}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.status === "valid" ? (
                            <span className="inline-flex items-center gap-1 text-moss font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready
                            </span>
                          ) : row.status === "duplicate" ? (
                            <span className="inline-flex items-center gap-1 text-amber font-medium">
                              <SkipForward className="w-3.5 h-3.5" />
                              {row.message}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-ember-ink font-medium">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              {row.message}
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
                  Created
                </span>
                <span className="text-xl font-sans font-semibold text-moss num">
                  {importResult.createdCount}
                </span>
              </div>
              <div className="p-3.5 rounded-[12px] bg-amber-tint/50 border border-line">
                <span className="text-[11px] font-mono uppercase text-ink-3 block">
                  Skipped
                </span>
                <span className="text-xl font-sans font-semibold text-amber num">
                  {importResult.skippedCount}
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

            {importResult.skipped.length > 0 && (
              <div className="border border-line rounded-[12px] p-3.5 bg-fog/30">
                <h3 className="text-xs font-semibold text-ink mb-2">
                  Skipped duplicates ({importResult.skipped.length})
                </h3>
                <ul className="space-y-1 max-h-32 overflow-y-auto text-xs text-ink-2">
                  {importResult.skipped.map((item, idx) => (
                    <li key={`${item.rowNumber}-${idx}`}>
                      Row #{item.rowNumber} ({item.email || item.clientName || "Unknown"}): {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.errors.length > 0 && (
              <div className="border border-ember/30 rounded-[12px] p-3.5 bg-ember-tint/40">
                <h3 className="text-xs font-semibold text-ember-ink mb-2">
                  Row errors ({importResult.errors.length})
                </h3>
                <ul className="space-y-1 max-h-36 overflow-y-auto text-xs text-ember-ink">
                  {importResult.errors.map((err, idx) => (
                    <li key={`${err.rowNumber}-${idx}`}>
                      Row #{err.rowNumber} ({err.email || err.clientName || "Unknown"}): {err.message}
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

export function BulkImportClientsModal({
  isOpen,
  onClose,
  existingClientEmails,
  onSuccess,
}: BulkImportClientsModalProps) {
  if (!isOpen) return null;
  return (
    <BulkImportClientsModalContent
      onClose={onClose}
      existingClientEmails={existingClientEmails}
      onSuccess={onSuccess}
    />
  );
}
