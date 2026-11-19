"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { formatMoney } from "@/modules/invoices/currency";
import type { InvoiceCurrency } from "@/modules/invoices/types";
import { formatUserError } from "@/lib/errors";
import { recordPaymentAction } from "@/modules/invoices/actions";

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
  const [isPending, startTransition] = React.useTransition();
  const remaining = Math.max(0, totalAmount - paidAmount);

  const [paymentAmount, setPaymentAmount] = React.useState<string>(String(remaining));
  const todayIso = new Date().toISOString().split("T")[0];
  const [paymentDate, setPaymentDate] = React.useState<string>(todayIso);
  const [notes, setNotes] = React.useState<string>("");
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPaymentAmount(String(remaining));
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setErrorBanner(null);
    }
  }, [isOpen, remaining]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const parsedAmount = parseFloat(paymentAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorBanner("Payment amount must be greater than zero.");
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
        setErrorBanner(formatUserError(actionErr, "Unable to record payment. Please check your connection."));
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-[10px] border border-line bg-white p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex flex-col">
            <h3 className="text-base font-serif text-ink">Record Customer Payment</h3>
            <span className="text-xs font-mono text-ink/60">{invoiceNumber}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-ink/50 hover:text-ink hover:bg-fog transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorBanner && (
          <div className="flex items-center gap-2 p-2.5 rounded-[8px] border border-ember/30 bg-ember/5 text-ember text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Outstanding Balance Info */}
          <div className="flex items-center justify-between p-3 rounded-[8px] bg-fog/30 border border-line text-xs">
            <span className="text-ink/60">Outstanding Balance:</span>
            <span className="font-mono font-semibold text-ink">
              {formatMoney(remaining, currency)}
            </span>
          </div>

          {/* Payment Amount Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono uppercase tracking-wider text-ink/60">
              Payment Amount ({currency}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining * 1.5}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm font-mono rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
            />
          </div>

          {/* Payment Date Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono uppercase tracking-wider text-ink/60">
              Payment Date *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
            />
          </div>

          {/* Payment Reference Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono uppercase tracking-wider text-ink/60">
              Reference / Bank Wire Details
            </label>
            <input
              type="text"
              placeholder="e.g. Wire Ref #881290 / Stripe Transfer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[8px] border border-line bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/50"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-full border border-line text-xs font-medium text-ink/70 hover:bg-fog transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Recording..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
