"use client";

import * as React from "react";
import Decimal from "decimal.js";
import { AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { InvoiceCurrency } from "@/modules/invoices/types";
import { formatUserError } from "@/lib/errors";
import { recordPaymentAction } from "@/modules/invoices/actions";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  currency: InvoiceCurrency;
  onSuccess?: () => void;
}

const RECORD_PAYMENT_FORM_ID = "record-payment-modal-form";

function RecordPaymentModalContent({
  onClose,
  invoiceId,
  invoiceNumber,
  totalAmount,
  paidAmount,
  currency,
  onSuccess,
}: Omit<RecordPaymentModalProps, "isOpen">) {
  const [isPending, startTransition] = React.useTransition();
  const remaining = React.useMemo(() => {
    const diff = new Decimal(totalAmount).minus(new Decimal(paidAmount));
    return diff.gt(0) ? diff.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber() : 0;
  }, [totalAmount, paidAmount]);

  const [paymentAmount, setPaymentAmount] = React.useState<string>(() =>
    remaining > 0 ? String(remaining) : ""
  );
  const [paymentDate, setPaymentDate] = React.useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = React.useState<string>("");
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const parsedAmount = parseFloat(paymentAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorBanner("Payment amount must be greater than zero.");
      return;
    }

    if (new Decimal(parsedAmount).gt(new Decimal(remaining))) {
      setErrorBanner(
        `Payment cannot exceed the remaining balance of ${formatMoney(remaining, currency)}.`
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordPaymentAction({
          invoiceId,
          paidAmount: parsedAmount,
          paidAt: paymentDate,
          notes: notes.trim() || undefined,
        });

        if (!res.success) {
          setErrorBanner(res.error || "Failed to record payment.");
        } else {
          onSuccess?.();
          onClose();
        }
      } catch (actionErr) {
        setErrorBanner(
          formatUserError(actionErr, "Unable to record payment. Please check your connection.")
        );
      }
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      eyebrow="Accounts Receivable Settlement"
      title="Record Customer Payment"
      description={invoiceNumber}
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
            form={RECORD_PAYMENT_FORM_ID}
            variant="primary"
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

        <div className="flex items-center justify-between p-3.5 rounded-[10px] bg-fog border border-line text-xs">
          <span className="text-ink-2 font-medium">Outstanding Balance</span>
          <span className="font-mono font-semibold text-ink num">
            {formatMoney(remaining, currency)}
          </span>
        </div>

        <form id={RECORD_PAYMENT_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="record-payment-amount">
              Payment Amount ({currency}) *
            </Label>
            <Input
              id="record-payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
              className="h-11 text-sm font-mono num rounded-[10px]"
            />
          </div>

          <div>
            <Label htmlFor="record-payment-date">Payment Date *</Label>
            <Input
              id="record-payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="h-11 text-sm rounded-[10px]"
            />
          </div>

          <div>
            <Label htmlFor="record-payment-notes" optional>
              Reference / Bank Wire Details
            </Label>
            <Input
              id="record-payment-notes"
              type="text"
              placeholder="e.g. Wire Ref #881290 / Bank Transfer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-11 text-sm rounded-[10px]"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  totalAmount,
  paidAmount,
  currency,
  onSuccess,
}: RecordPaymentModalProps) {
  if (!isOpen) return null;
  return (
    <RecordPaymentModalContent
      onClose={onClose}
      invoiceId={invoiceId}
      invoiceNumber={invoiceNumber}
      totalAmount={totalAmount}
      paidAmount={paidAmount}
      currency={currency}
      onSuccess={onSuccess}
    />
  );
}
