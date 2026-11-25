"use client";

import * as React from "react";
import Decimal from "decimal.js";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { formatUserError } from "@/lib/errors";
import { Modal } from "@/components/ui/Modal";
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

function hasMaxTwoDecimals(val: number): boolean {
  try {
    return new Decimal(val).decimalPlaces() <= 2;
  } catch {
    return false;
  }
}

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
    .refine(hasMaxTwoDecimals, {
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

const EXPENSE_FORM_ID = "expense-modal-form";

function getInitialDueDate(expenseToEdit?: ExpenseRecord | null): string {
  if (!expenseToEdit) {
    return new Date().toISOString().split("T")[0];
  }
  return typeof expenseToEdit.dueDate === "string"
    ? expenseToEdit.dueDate.split("T")[0]
    : new Date(expenseToEdit.dueDate).toISOString().split("T")[0];
}

function ExpenseFormModalContent({
  onClose,
  expenseToEdit,
  baseCurrency = "PKR",
  onSuccess,
}: Omit<ExpenseFormDrawerProps, "isOpen">) {
  const [isPending, startTransition] = React.useTransition();
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const [title, setTitle] = React.useState(() => expenseToEdit?.title ?? "");
  const [category, setCategory] = React.useState<ExpenseCategory>(
    () => expenseToEdit?.category ?? "SOFTWARE"
  );
  const [amount, setAmount] = React.useState(() =>
    expenseToEdit ? String(expenseToEdit.amount) : ""
  );
  const [dueDate, setDueDate] = React.useState(() => getInitialDueDate(expenseToEdit));
  const [recurrence, setRecurrence] = React.useState<ExpenseRecurrence>(
    () => expenseToEdit?.recurrence ?? "NONE"
  );
  const [notes, setNotes] = React.useState(() => expenseToEdit?.notes || "");

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
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      eyebrow="Accounts Payable Schedule"
      title={expenseToEdit ? "Edit Scheduled Outflow" : "Schedule New Outflow"}
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
            form={EXPENSE_FORM_ID}
            isLoading={isPending}
            className="min-h-[44px] h-11 px-6 rounded-full text-sm font-medium"
          >
            {isPending
              ? expenseToEdit
                ? "Updating..."
                : "Scheduling..."
              : expenseToEdit
              ? "Save Changes"
              : "Schedule Outflow"}
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

        <form id={EXPENSE_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="expense-title">Title / Payee *</Label>
            <Input
              id="expense-title"
              type="text"
              placeholder="e.g. AWS Cloud Infrastructure, Office Lease, Team Salaries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              isInvalid={Boolean(fieldErrors.title)}
              className="h-11 text-sm rounded-[10px]"
              required
            />
            {fieldErrors.title && (
              <span className="mt-1 block text-xs text-ember-ink">{fieldErrors.title}</span>
            )}
          </div>

          <div>
            <Label htmlFor="expense-category">Expenditure Category *</Label>
            <Select
              id="expense-category"
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
              <span className="mt-1 block text-xs text-ember-ink">{fieldErrors.category}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expense-amount">Amount ({baseCurrency}) *</Label>
              <Input
                id="expense-amount"
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
                <span className="mt-1 block text-xs text-ember-ink">{fieldErrors.amount}</span>
              )}
            </div>

            <div>
              <Label htmlFor="expense-dueDate">Due Date *</Label>
              <Input
                id="expense-dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                isInvalid={Boolean(fieldErrors.dueDate)}
                className="h-11 text-sm rounded-[10px]"
                required
              />
              {fieldErrors.dueDate && (
                <span className="mt-1 block text-xs text-ember-ink">{fieldErrors.dueDate}</span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="expense-recurrence">Recurrence Schedule</Label>
            <Select
              id="expense-recurrence"
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
            <span className="mt-1 block text-xs text-ink-3">
              Recurring expenses automatically spawn the next cycle when marked as paid.
            </span>
          </div>

          <div>
            <Label htmlFor="expense-notes" optional>
              Internal Memo / Notes
            </Label>
            <textarea
              id="expense-notes"
              rows={3}
              placeholder="Optional billing details, vendor account numbers, or contract notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-[10px] bg-fog border-0 text-sm text-ink placeholder:text-ink-3 transition-colors outline-none focus:bg-white focus:outline-2 focus:outline-ink focus:outline-offset-2 resize-none"
            />
            {fieldErrors.notes && (
              <span className="mt-1 block text-xs text-ember-ink">{fieldErrors.notes}</span>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function ExpenseFormDrawer({
  isOpen,
  onClose,
  expenseToEdit,
  baseCurrency = "PKR",
  onSuccess,
}: ExpenseFormDrawerProps) {
  if (!isOpen) return null;
  return (
    <ExpenseFormModalContent
      key={expenseToEdit?.id ?? "new"}
      onClose={onClose}
      expenseToEdit={expenseToEdit}
      baseCurrency={baseCurrency}
      onSuccess={onSuccess}
    />
  );
}
