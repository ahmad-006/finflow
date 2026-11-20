"use client";

import * as React from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { formatUserError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ExpenseRecord, ExpenseRecurrence } from "@/modules/expenses/types";
import { markExpensePaidAction } from "@/modules/expenses/actions";

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRecord | null;
  baseCurrency?: string;
  onSuccess?: () => void;
}

function computeNextCycleDate(dueDate: Date | string, recurrence: ExpenseRecurrence): string {
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return "the next cycle";

  if (recurrence === "WEEKLY") {
    d.setDate(d.getDate() + 7);
  } else if (recurrence === "MONTHLY") {
    d.setMonth(d.getMonth() + 1);
  } else if (recurrence === "QUARTERLY") {
    d.setMonth(d.getMonth() + 3);
  } else if (recurrence === "ANNUALLY") {
    d.setFullYear(d.getFullYear() + 1);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function MarkPaidModal({
  isOpen,
  onClose,
  expense,
  baseCurrency = "PKR",
  onSuccess,
}: MarkPaidModalProps) {
  const [isPending, startTransition] = React.useTransition();
  const [paymentDate, setPaymentDate] = React.useState<string>("");
  const [paymentMethod, setPaymentMethod] = React.useState<string>("BANK_TRANSFER");
  const [reference, setReference] = React.useState<string>("");
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && expense) {
      const todayIso = new Date().toISOString().split("T")[0];
      setPaymentDate(todayIso);
      setPaymentMethod("BANK_TRANSFER");
      setReference("");
      setErrorBanner(null);
    }
  }, [isOpen, expense]);

  if (!isOpen || !expense) return null;

  const isRecurring = expense.recurrence !== "NONE";
  const nextDateLabel = isRecurring
    ? computeNextCycleDate(expense.dueDate, expense.recurrence)
    : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!paymentDate) {
      setErrorBanner("Payment date is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await markExpensePaidAction(expense.id, {
          paymentDate,
          paymentMethod,
          reference: reference.trim() || undefined,
        });

        if (!res.success) {
          setErrorBanner(res.error || "Failed to mark expense as paid.");
        } else {
          onSuccess?.();
          onClose();
        }
      } catch (err) {
        setErrorBanner(
          formatUserError(err, "Unable to mark expense as paid. Please check your connection.")
        );
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-paid-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-[500px] rounded-[18px] bg-white border border-line p-6 sm:p-7 z-10 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-line">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
              Accounts Payable Settlement
            </span>
            <h2 id="mark-paid-modal-title" className="text-xl font-serif text-ink tracking-tight mt-0.5">
              Mark as Paid
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-fog transition-colors -mr-2 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorBanner && (
          <div className="flex items-center gap-2 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Expense Summary Block */}
        <div className="p-3.5 rounded-[12px] bg-fog/50 border border-line flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-3 font-medium">Expense Title:</span>
            <span className="text-ink font-semibold truncate max-w-[220px]">{expense.title}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-3 font-medium">Outflow Amount:</span>
            <span className="text-sm font-serif font-bold text-ink num">
              {formatMoney(expense.amount, baseCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-3 font-medium">Schedule:</span>
            <span className="font-mono text-ink-2">{expense.recurrence}</span>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Payment Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentDate" className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Settlement Date *
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="h-11 text-sm rounded-[10px]"
            />
          </div>

          {/* Payment Method */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentMethod" className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Payment Method *
            </Label>
            <Select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-11 text-sm rounded-[10px]"
            >
              <option value="BANK_TRANSFER">Bank Transfer (Wire / ACH)</option>
              <option value="CASH">Cash</option>
              <option value="CREDIT_CARD">Credit / Corporate Card</option>
              <option value="CHEQUE">Cheque / Demand Draft</option>
              <option value="OTHER">Other Disbursement</option>
            </Select>
          </div>

          {/* Reference */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference" className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Reference / Transaction ID
            </Label>
            <Input
              id="reference"
              type="text"
              placeholder="e.g. TXN-94812, Cheque #4019"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-11 text-sm rounded-[10px]"
            />
          </div>

          {/* Audit & Recurrence Notice */}
          <div className="p-3 rounded-[10px] bg-fog border border-line text-[12px] text-ink-2 leading-relaxed flex flex-col gap-1">
            <p>
              This will record a permanent <strong className="text-ink">OUTFLOW</strong> transaction in your company ledger.
            </p>
            {isRecurring && (
              <p className="text-ink-3">
                A new cycle scheduled for <span className="font-semibold text-ink">{nextDateLabel}</span> will automatically be created.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
              className="min-h-[44px] h-11 px-5 rounded-full text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] h-11 px-6 rounded-full bg-ink text-white hover:bg-ink-hover text-xs font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Recording...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
