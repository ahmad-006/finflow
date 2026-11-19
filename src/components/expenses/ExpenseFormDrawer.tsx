"use client";

import * as React from "react";
import { z } from "zod";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { formatUserError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  ExpenseRecord,
  ExpenseCategory,
  ExpenseRecurrence,
  CreateExpenseInput,
} from "@/modules/expenses/types";
import { createExpenseAction, updateExpenseAction } from "@/modules/expenses/actions";

const expenseFormSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters.")
    .max(120, "Title cannot exceed 120 characters."),
  category: z.enum(
    ["PAYROLL", "RENT", "UTILITIES", "SUPPLIERS", "SOFTWARE", "TAX", "OTHER"],
    { message: "Please select a valid expense category." }
  ),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero.")
    .refine((val) => Number(val.toFixed(2)) === val || Math.floor(val * 100) === val * 100, {
      message: "Amount cannot exceed 2 decimal places.",
    }),
  dueDate: z.string().min(1, "Due date is required."),
  recurrence: z.enum(["NONE", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"], {
    message: "Please select a recurrence schedule.",
  }),
  notes: z.string().max(500, "Notes cannot exceed 500 characters.").optional(),
});

interface ExpenseFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: ExpenseRecord | null;
  baseCurrency?: string;
  onSuccess?: (expense?: ExpenseRecord) => void;
}

export function ExpenseFormDrawer({
  isOpen,
  onClose,
  expenseToEdit,
  baseCurrency = "PKR",
  onSuccess,
}: ExpenseFormDrawerProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<ExpenseCategory>("SOFTWARE");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [recurrence, setRecurrence] = React.useState<ExpenseRecurrence>("NONE");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setErrorBanner(null);
      setFieldErrors({});

      if (expenseToEdit) {
        setTitle(expenseToEdit.title);
        setCategory(expenseToEdit.category);
        setAmount(String(expenseToEdit.amount));
        const dateStr =
          typeof expenseToEdit.dueDate === "string"
            ? expenseToEdit.dueDate.split("T")[0]
            : new Date(expenseToEdit.dueDate).toISOString().split("T")[0];
        setDueDate(dateStr);
        setRecurrence(expenseToEdit.recurrence);
        setNotes(expenseToEdit.notes || "");
      } else {
        const todayIso = new Date().toISOString().split("T")[0];
        setTitle("");
        setCategory("SOFTWARE");
        setAmount("");
        setDueDate(todayIso);
        setRecurrence("NONE");
        setNotes("");
      }
    }
  }, [isOpen, expenseToEdit]);

  if (!isOpen) return null;

  const validateClientSide = () => {
    const rawData = {
      title: title.trim(),
      category,
      amount: amount.trim(),
      dueDate,
      recurrence,
      notes: notes.trim() || undefined,
    };

    const parsed = expenseFormSchema.safeParse(rawData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return null;
    }

    setFieldErrors({});
    return parsed.data;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const validData = validateClientSide();
    if (!validData) {
      return;
    }

    startTransition(async () => {
      try {
        if (expenseToEdit) {
          const res = await updateExpenseAction(expenseToEdit.id, {
            title: validData.title,
            category: validData.category,
            amount: validData.amount,
            dueDate: validData.dueDate,
            recurrence: validData.recurrence,
            notes: validData.notes,
          });

          if (!res.success) {
            setErrorBanner(res.error || "Failed to update expense.");
          } else {
            onSuccess?.(res.data);
            onClose();
          }
        } else {
          const payload: CreateExpenseInput = {
            title: validData.title,
            category: validData.category,
            amount: validData.amount,
            dueDate: validData.dueDate,
            recurrence: validData.recurrence,
            notes: validData.notes,
          };

          const res = await createExpenseAction(payload);
          if (!res.success) {
            setErrorBanner(res.error || "Failed to schedule expense.");
          } else {
            onSuccess?.(res.data);
            onClose();
          }
        }
      } catch (err) {
        setErrorBanner(
          formatUserError(
            err,
            "An unexpected error occurred while saving the expense record."
          )
        );
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Surface */}
      <div className="relative w-full max-w-lg bg-white h-full border-l border-line flex flex-col z-10">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
                  Accounts Payable Schedule
                </span>
                <h2 id="expense-drawer-title" className="text-xl font-serif text-ink tracking-tight mt-0.5">
                  {expenseToEdit ? "Edit Scheduled Outflow" : "Schedule New Outflow"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="p-1.5 rounded-full text-ink-3 hover:text-ink hover:bg-fog transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorBanner && (
              <div className="flex items-center gap-2 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Form Content */}
            <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Title / Payee */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title" className="text-xs font-mono uppercase tracking-wider text-ink-3">
                Title / Payee *
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g. AWS Cloud Infrastructure, Office Lease, Team Salaries"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                isInvalid={Boolean(fieldErrors.title)}
                className="h-11 text-sm rounded-[10px]"
                required
              />
              {fieldErrors.title && (
                <span className="text-[11px] text-ember-ink">{fieldErrors.title}</span>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category" className="text-xs font-mono uppercase tracking-wider text-ink-3">
                Expenditure Category *
              </Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="h-11 text-sm rounded-[10px]"
              >
                <option value="PAYROLL">Payroll & Salaries</option>
                <option value="RENT">Rent & Facilities</option>
                <option value="UTILITIES">Utilities & Telecom</option>
                <option value="SUPPLIERS">Suppliers & Raw Materials</option>
                <option value="SOFTWARE">Software & Subscriptions</option>
                <option value="TAX">Tax & Regulatory</option>
                <option value="OTHER">Other Operational Expenses</option>
              </Select>
              {fieldErrors.category && (
                <span className="text-[11px] text-ember-ink">{fieldErrors.category}</span>
              )}
            </div>

            {/* Amount & Due Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount" className="text-xs font-mono uppercase tracking-wider text-ink-3">
                  Amount ({baseCurrency}) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  isInvalid={Boolean(fieldErrors.amount)}
                  className="h-11 text-sm rounded-[10px] num"
                  required
                />
                {fieldErrors.amount && (
                  <span className="text-[11px] text-ember-ink">{fieldErrors.amount}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dueDate" className="text-xs font-mono uppercase tracking-wider text-ink-3">
                  Due Date *
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  isInvalid={Boolean(fieldErrors.dueDate)}
                  className="h-11 text-sm rounded-[10px]"
                  required
                />
                {fieldErrors.dueDate && (
                  <span className="text-[11px] text-ember-ink">{fieldErrors.dueDate}</span>
                )}
              </div>
            </div>

            {/* Recurrence Schedule */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recurrence" className="text-xs font-mono uppercase tracking-wider text-ink-3">
                Recurrence Schedule
              </Label>
              <Select
                id="recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as ExpenseRecurrence)}
                className="h-11 text-sm rounded-[10px]"
              >
                <option value="NONE">One-off Outflow (No recurrence)</option>
                <option value="WEEKLY">Weekly (Repeats every 7 days)</option>
                <option value="MONTHLY">Monthly (Repeats every calendar month)</option>
                <option value="QUARTERLY">Quarterly (Repeats every 3 months)</option>
                <option value="ANNUALLY">Annually (Repeats every year)</option>
              </Select>
              <span className="text-[11px] text-ink-3">
                Recurring expenses automatically spawn the next cycle when marked as paid.
              </span>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="text-xs font-mono uppercase tracking-wider text-ink-3">
                Internal Memo / Notes
              </Label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Optional billing details, vendor account numbers, or contract notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-[10px] bg-fog border-0 text-sm text-ink placeholder:text-ink-3 transition-colors outline-none focus:bg-white focus:outline-2 focus:outline-ink focus:outline-offset-2 resize-none"
              />
              {fieldErrors.notes && (
                <span className="text-[11px] text-ember-ink">{fieldErrors.notes}</span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Pinned Drawer Footer Actions */}
      <div className="flex items-center justify-end gap-3 p-5 sm:px-8 border-t border-line bg-white shrink-0">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isPending}
          className="h-10 px-5 rounded-full text-xs font-medium"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="expense-form"
          disabled={isPending}
          className="h-10 px-6 rounded-full bg-ink text-white hover:bg-ink-hover text-xs font-medium"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              {expenseToEdit ? "Updating..." : "Scheduling..."}
            </>
          ) : expenseToEdit ? (
            "Save Changes"
          ) : (
            "Schedule Outflow"
          )}
        </Button>
      </div>
      </div>
    </div>
  );
}
