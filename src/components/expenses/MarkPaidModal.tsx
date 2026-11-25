"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { formatUserError } from "@/lib/errors";
import { Modal } from "@/components/ui/Modal";
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

const MARK_PAID_FORM_ID = "mark-expense-paid-modal-form";

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

function MarkPaidModalContent({
  onClose,
  expense,
  baseCurrency = "PKR",
  onSuccess,
}: {
  onClose: () => void;
  expense: ExpenseRecord;
  baseCurrency?: string;
  onSuccess?: () => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [paymentDate, setPaymentDate] = React.useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = React.useState<string>("BANK_TRANSFER");
  const [reference, setReference] = React.useState<string>("");
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

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
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      eyebrow="Accounts Payable Settlement"
      title="Mark as Paid"
      preventClose={isPending}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            className="min-h-[44px] h-11 px-5 rounded-full text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={MARK_PAID_FORM_ID}
            isLoading={isPending}
            className="min-h-[44px] h-11 px-6 rounded-full text-sm font-medium"
          >
            {isPending ? "Recording..." : "Confirm Payment"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {errorBanner && (
          <div className="flex items-center gap-2 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        <div className="p-3.5 rounded-[12px] bg-fog/50 border border-line flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs gap-3">
            <span className="text-ink-3 font-medium">Expense Title</span>
            <span className="text-ink font-semibold truncate max-w-[240px]">{expense.title}</span>
          </div>
          <div className="flex items-center justify-between text-xs gap-3">
            <span className="text-ink-3 font-medium">Outflow Amount</span>
            <span className="text-sm font-sans font-semibold text-ink num">
              {formatMoney(expense.amount, baseCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs gap-3">
            <span className="text-ink-3 font-medium">Schedule</span>
            <span className="font-mono text-ink-2">{expense.recurrence}</span>
          </div>
        </div>

        <form id={MARK_PAID_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="mark-paid-date">Settlement Date *</Label>
            <Input
              id="mark-paid-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="h-11 text-sm rounded-[10px]"
            />
          </div>

          <div>
            <Label htmlFor="mark-paid-method">Payment Method *</Label>
            <Select
              id="mark-paid-method"
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

          <div>
            <Label htmlFor="mark-paid-reference" optional>
              Reference / Transaction ID
            </Label>
            <Input
              id="mark-paid-reference"
              type="text"
              placeholder="e.g. TXN-94812, Cheque #4019"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-11 text-sm rounded-[10px]"
            />
          </div>

          <div className="p-3 rounded-[10px] bg-fog border border-line text-xs text-ink-2 leading-relaxed flex flex-col gap-1">
            <p>
              This will record a permanent <strong className="text-ink">OUTFLOW</strong> transaction in your company ledger.
            </p>
            {isRecurring && (
              <p className="text-ink-3">
                A new cycle scheduled for <span className="font-semibold text-ink">{nextDateLabel}</span> will automatically be created.
              </p>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function MarkPaidModal({
  isOpen,
  onClose,
  expense,
  baseCurrency = "PKR",
  onSuccess,
}: MarkPaidModalProps) {
  if (!isOpen || !expense) return null;
  return (
    <MarkPaidModalContent
      key={expense.id}
      onClose={onClose}
      expense={expense}
      baseCurrency={baseCurrency}
      onSuccess={onSuccess}
    />
  );
}
