"use client";

import * as React from "react";
import { Download, Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  generateCsv,
  parseCsv,
  pickCsvField,
} from "@/lib/csv";
import { formatMoney } from "@/lib/format";
import { formatUserError } from "@/lib/errors";
import { bulkImportExpensesAction } from "@/modules/expenses/actions";
import { bulkExpenseRowSchema } from "@/modules/expenses/validation";
import type {
  BulkExpenseRowInput,
  BulkImportExpensesResult,
  ExpenseCategory,
  ExpenseRecurrence,
} from "@/modules/expenses/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";

interface BulkImportExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseCurrency?: string;
  onSuccess?: (result: BulkImportExpensesResult) => void;
}

interface ParsedExpensePreviewRow {
  rowNumber: number;
  title: string;
  category: ExpenseCategory;
  amount: number;
  dueDate: string;
  recurrence: ExpenseRecurrence;
  notes: string;
  valid: boolean;
  error?: string;
}

const SAMPLE_EXPENSES_CSV = generateCsv(
  ["title", "category", "amount", "due_date", "recurrence", "notes"],
  [
    ["Cloud Hosting (AWS & Neon)", "SOFTWARE", "42500", "2026-12-05", "MONTHLY", "Monthly production infrastructure"],
    ["Office Lease - Gulberg HQ", "RENT", "180000", "2026-12-01", "MONTHLY", "Standard commercial lease"],
    ["Engineering Payroll Run", "PAYROLL", "850000", "2026-12-28", "MONTHLY", "Core engineering and ops team"],
  ]
);

function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function BulkImportExpensesModalContent({
  onClose,
  baseCurrency = "PKR",
  onSuccess,
}: Omit<BulkImportExpensesModalProps, "isOpen">) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [fileName, setFileName] = React.useState<string>("");
  const [rawInputs, setRawInputs] = React.useState<BulkExpenseRowInput[]>([]);
  const [previewRows, setPreviewRows] = React.useState<ParsedExpensePreviewRow[]>([]);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [importResult, setImportResult] = React.useState<BulkImportExpensesResult | null>(null);

  const validCount = React.useMemo(
    () => previewRows.filter((r) => r.valid).length,
    [previewRows]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setParseError(null);
    setImportResult(null);

    if (!file) {
      return;
    }
    if (file.size > CSV_MAX_BYTES) {
      setParseError("CSV file exceeds the 2 MB upload limit.");
      return;
    }

    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (parsed.rows.length === 0) {
        setParseError("No data rows found in this CSV file.");
        setRawInputs([]);
        setPreviewRows([]);
        return;
      }

      if (parsed.rows.length > CSV_MAX_ROWS) {
        setParseError(`CSV contains ${parsed.rows.length} rows. Maximum allowed per import is ${CSV_MAX_ROWS}.`);
        setRawInputs([]);
        setPreviewRows([]);
        return;
      }

      const inputs: BulkExpenseRowInput[] = [];
      const previews: ParsedExpensePreviewRow[] = [];

      for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const rowNumber = i + 1;
        const title = pickCsvField(row, ["title", "name", "expense", "description", "item"]);
        const categoryRaw = pickCsvField(row, ["category", "type", "group"]) || "OTHER";
        const amountRaw = pickCsvField(row, ["amount", "total", "cost", "value"]);
        const dueDate = pickCsvField(row, ["due_date", "duedate", "due", "date"]);
        const recurrenceRaw = pickCsvField(row, ["recurrence", "frequency", "schedule", "repeat"]) || "NONE";
        const notes = pickCsvField(row, ["notes", "memo", "reference"]);

        inputs.push({
          rowNumber,
          title,
          category: categoryRaw,
          amount: amountRaw,
          dueDate,
          recurrence: recurrenceRaw,
          notes,
        });

        const check = bulkExpenseRowSchema.safeParse({
          title,
          category: categoryRaw,
          amount: amountRaw,
          dueDate,
          recurrence: recurrenceRaw,
          notes,
        });

        previews.push({
          rowNumber,
          title: check.success ? check.data.title : title || "(Missing title)",
          category: check.success ? check.data.category : "OTHER",
          amount: check.success ? check.data.amount : Number(amountRaw) || 0,
          dueDate: check.success
            ? check.data.dueDate.toISOString().split("T")[0]
            : dueDate || "(Missing date)",
          recurrence: check.success ? check.data.recurrence : "NONE",
          notes,
          valid: check.success,
          error: check.success
            ? undefined
            : check.error.issues.map((iss) => iss.message).join("; "),
        });
      }

      setRawInputs(inputs);
      setPreviewRows(previews);
    } catch (err) {
      setParseError(formatUserError(err, "Unable to read CSV file."));
    }
  };

  const handleImport = () => {
    setParseError(null);
    const rowsToSubmit = rawInputs.filter((_, idx) => previewRows[idx]?.valid);
    if (rowsToSubmit.length === 0) {
      setParseError("Fix or remove invalid rows before importing.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkImportExpensesAction(rowsToSubmit);
        if (!res.success || !res.data) {
          setParseError(res.error || "Failed to import expenses.");
          return;
        }
        setImportResult(res.data);
        if (res.data.createdCount > 0) {
          onSuccess?.(res.data);
        }
      } catch (err) {
        setParseError(formatUserError(err, "Failed to import expenses from CSV."));
      }
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      eyebrow="Accounts Payable Bulk Upload"
      title="Import Expenses from CSV"
      description="Upload scheduled or recurring expense rows to populate your 30-day cash flow forecast."
      preventClose={isPending}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="min-h-[44px] h-11 px-5 rounded-full text-sm"
          >
            {importResult ? "Done" : "Cancel"}
          </Button>
          {!importResult && (
            <Button
              type="button"
              variant="primary"
              onClick={handleImport}
              disabled={validCount === 0 || isPending}
              isLoading={isPending}
              className="min-h-[44px] h-11 px-6 rounded-full text-sm"
            >
              Import {validCount > 0 ? `${validCount} ${validCount === 1 ? "Expense" : "Expenses"}` : "CSV"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Template Download & File Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-[12px] bg-fog/40 border border-line">
          <div className="flex items-start gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-ink">Expected CSV columns</span>
              <span className="text-ink-3">
                title, category, amount, due_date (YYYY-MM-DD), recurrence, notes
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => downloadCsvFile("finflow-expenses-template.csv", SAMPLE_EXPENSES_CSV)}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-line bg-white text-xs font-medium text-ink hover:bg-fog transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </button>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="sr-only"
            id="expenses-csv-upload"
          />
          <label
            htmlFor="expenses-csv-upload"
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-[12px] border border-dashed border-line-strong bg-white hover:bg-fog/30 cursor-pointer transition-colors text-center"
          >
            <Upload className="w-5 h-5 text-ink-2" />
            <span className="text-sm font-medium text-ink">
              {fileName ? `Selected: ${fileName}` : "Choose CSV file (up to 500 rows)"}
            </span>
            <span className="text-xs text-ink-3">
              Amounts are imported in your company base currency ({baseCurrency}).
            </span>
          </label>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 p-3 rounded-[10px] border border-ember-ink/20 bg-ember-tint text-ember-ink text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {importResult && (
          <div className="flex items-start gap-2.5 p-4 rounded-[12px] border border-moss/30 bg-moss-tint text-moss text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold">
                Imported {importResult.createdCount}{" "}
                {importResult.createdCount === 1 ? "expense" : "expenses"}
                {importResult.failedCount > 0 ? ` (${importResult.failedCount} skipped)` : ""}.
              </span>
              {importResult.errors.length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((err) => (
                    <li key={err.rowNumber}>
                      Row {err.rowNumber}: {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Row Preview */}
        {previewRows.length > 0 && !importResult && (
          <div className="border border-line rounded-[12px] overflow-hidden">
            <div className="px-4 py-2.5 bg-fog/40 border-b border-line flex items-center justify-between text-xs">
              <span className="font-medium text-ink">
                Preview ({validCount} valid of {previewRows.length} rows)
              </span>
              {previewRows.length - validCount > 0 && (
                <span className="text-ember-ink font-medium">
                  {previewRows.length - validCount} invalid rows will be skipped
                </span>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-fog/20 text-[10px] font-mono uppercase text-ink-3">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3">Due</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {previewRows.slice(0, 25).map((row) => (
                    <tr key={row.rowNumber} className={!row.valid ? "bg-ember-tint/30" : ""}>
                      <td className="py-2 px-3 font-mono text-ink-3">{row.rowNumber}</td>
                      <td className="py-2 px-3 font-medium text-ink truncate max-w-[180px]">
                        {row.title}
                      </td>
                      <td className="py-2 px-3 font-mono text-ink-2">{row.category}</td>
                      <td className="py-2 px-3 font-mono text-right text-ink">
                        {formatMoney(row.amount, baseCurrency)}
                      </td>
                      <td className="py-2 px-3 font-mono text-ink-2">{row.dueDate}</td>
                      <td className="py-2 px-3">
                        {row.valid ? (
                          <span className="text-moss font-medium">Ready</span>
                        ) : (
                          <span className="text-ember-ink">{row.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function BulkImportExpensesModal({
  isOpen,
  onClose,
  baseCurrency,
  onSuccess,
}: BulkImportExpensesModalProps) {
  if (!isOpen) return null;
  return (
    <BulkImportExpensesModalContent
      onClose={onClose}
      baseCurrency={baseCurrency}
      onSuccess={onSuccess}
    />
  );
}
