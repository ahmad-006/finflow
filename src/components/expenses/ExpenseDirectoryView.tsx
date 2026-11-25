"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import type {
  ExpenseRecord,
  ExpenseKPIs,
  ExpenseCategory,
  ExpenseRecurrence,
  ExpenseStatus,
} from "@/modules/expenses/types";
import { formatMoney } from "@/lib/format";
import { canManageBilling, canMutateLedger } from "@/modules/auth/rbac";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { ExpenseFormDrawer } from "./ExpenseFormDrawer";
import { BulkImportExpensesModal } from "./BulkImportExpensesModal";
import { MarkPaidModal } from "./MarkPaidModal";
import { ConfirmModal } from "@/components/ui/Modal";
import { deleteExpenseAction } from "@/modules/expenses/actions";
import { Button } from "@/components/ui/button";

export interface ExpenseDirectoryViewProps {
  initialExpenses: ExpenseRecord[];
  kpis: ExpenseKPIs;
  baseCurrency?: string;
  companyName?: string;
  role?: string;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  PAYROLL: "Payroll",
  RENT: "Rent",
  UTILITIES: "Utilities",
  SUPPLIERS: "Suppliers",
  SOFTWARE: "Software",
  TAX: "Tax",
  OTHER: "Other",
};

const RECURRENCE_LABELS: Record<ExpenseRecurrence, string> = {
  NONE: "One-off",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
};

export function ExpenseDirectoryView({
  initialExpenses,
  kpis,
  baseCurrency = "PKR",
  companyName = "FinFlow",
  role = "MEMBER",
}: ExpenseDirectoryViewProps) {
  const router = useRouter();
  const canMutate = canMutateLedger(role);
  const canPayBilling = canManageBilling(role);
  const [deletedIds, setDeletedIds] = React.useState<string[]>([]);
  const expenses = React.useMemo(
    () => initialExpenses.filter((exp) => !deletedIds.includes(exp.id)),
    [initialExpenses, deletedIds]
  );
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ExpenseStatus | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<ExpenseCategory | "ALL">("ALL");
  const [recurrenceFilter, setRecurrenceFilter] = React.useState<ExpenseRecurrence | "ALL">("ALL");

  // Drawer & Modal state
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [importBanner, setImportBanner] = React.useState<string | null>(null);
  const [expenseToEdit, setExpenseToEdit] = React.useState<ExpenseRecord | null>(null);
  const [expenseToPay, setExpenseToPay] = React.useState<ExpenseRecord | null>(null);
  const [expenseToDelete, setExpenseToDelete] = React.useState<ExpenseRecord | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Compute status counts dynamically
  const statusCounts = React.useMemo(() => {
    const counts = {
      ALL: expenses.length,
      SCHEDULED: 0,
      OVERDUE: 0,
      PAID: 0,
    };
    for (const exp of expenses) {
      if (exp.status in counts) {
        counts[exp.status]++;
      }
    }
    return counts;
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((exp) => {
      // Status filter
      if (statusFilter !== "ALL" && exp.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "ALL" && exp.category !== categoryFilter) {
        return false;
      }

      // Recurrence filter
      if (recurrenceFilter !== "ALL" && exp.recurrence !== recurrenceFilter) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesNotes = exp.notes ? exp.notes.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, statusFilter, categoryFilter, recurrenceFilter, search]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedExpenses = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, safePage]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  };

  const handleOpenAdd = () => {
    setExpenseToEdit(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (exp: ExpenseRecord) => {
    setExpenseToEdit(exp);
    setIsDrawerOpen(true);
  };

  const handleOpenPay = (exp: ExpenseRecord) => {
    setExpenseToPay(exp);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;

    setDeleteError(null);
    setActionError(null);
    setIsDeleting(true);
    try {
      const res = await deleteExpenseAction(expenseToDelete.id);
      if (!res.success) {
        setDeleteError(res.error || "Failed to delete expense.");
      } else {
        setDeletedIds((prev) => [...prev, expenseToDelete.id]);
        setExpenseToDelete(null);
        router.refresh();
      }
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "An unexpected error occurred while deleting."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Statement sentence
  const statementSentence = React.useMemo(() => {
    if (kpis.counts.scheduled === 0 && kpis.counts.overdue === 0) {
      return `All operational outflow commitments are currently settled for ${companyName}.`;
    }
    return `${formatMoney(kpis.totalScheduledAmount, baseCurrency)} scheduled across ${kpis.counts.scheduled} upcoming expenses. ${formatMoney(kpis.next30DaysOutflow, baseCurrency)} due in the next 30 days.`;
  }, [kpis, baseCurrency, companyName]);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Statement Sentence */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
            Accounts Payable & Outflows
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-ink">
            Expenses & Outflows
          </h1>
          <p className="text-sm text-ink-2">
            {statementSentence}
          </p>
        </div>

        {canMutate && (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full border border-line bg-white hover:bg-fog text-sm font-medium flex-1 sm:flex-initial"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>Import CSV</span>
            </Button>
            <Button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full bg-ink text-white text-sm font-medium hover:bg-ink-hover transition-colors flex-1 sm:flex-initial"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Expense</span>
            </Button>
          </div>
        )}
      </div>

      {importBanner && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-[10px] border border-moss/30 bg-moss-tint text-moss text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportBanner(null)}
            className="text-xs underline px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 2. 4 Core KPI Figure Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 py-4 border-y border-line">
        {/* KPI 1: Total Scheduled */}
        <div className="flex flex-col gap-1 p-2">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Total Scheduled
            </span>
            {kpis.counts.scheduled > 0 && (
              <span className="text-[11px] font-mono text-ink-2">
                {kpis.counts.scheduled} active
              </span>
            )}
          </div>
          <div className="text-base sm:text-xl lg:text-2xl font-serif tracking-tight text-ink num break-words leading-tight">
            {formatMoney(kpis.totalScheduledAmount, baseCurrency)}
          </div>
          <span className="text-[11px] text-ink-3">
            Committed forward outflows
          </span>
        </div>

        {/* KPI 2: Next 30 Days Outflow */}
        <div className="flex flex-col gap-1 p-2">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
            Next 30 Days Outflow
          </span>
          <div className="text-base sm:text-xl lg:text-2xl font-serif tracking-tight text-ink num break-words leading-tight">
            {formatMoney(kpis.next30DaysOutflow, baseCurrency)}
          </div>
          <span className="text-[11px] text-ink-3">
            Immediate liquidity demand
          </span>
        </div>

        {/* KPI 3: Overdue Outflow */}
        <div className="flex flex-col gap-1 p-2">
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
              Overdue Outflow
            </span>
            {kpis.counts.overdue > 0 && (
              <span className="text-[11px] font-mono text-ember-ink font-medium">
                {kpis.counts.overdue} delayed
              </span>
            )}
          </div>
          <div
            className={`text-base sm:text-xl lg:text-2xl font-serif tracking-tight num break-words leading-tight ${
              kpis.overdueAmount > 0 ? "text-ember-ink font-semibold" : "text-ink"
            }`}
          >
            {formatMoney(kpis.overdueAmount, baseCurrency)}
          </div>
          <span className="text-[11px] text-ink-3">
            Past due commitments
          </span>
        </div>

        {/* KPI 4: Monthly Recurring Burn */}
        <div className="flex flex-col gap-1 p-2">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-3">
            Monthly Burn Rate
          </span>
          <div className="text-base sm:text-xl lg:text-2xl font-serif tracking-tight text-ink num break-words leading-tight">
            {formatMoney(kpis.monthlyRecurringBurn, baseCurrency)}
          </div>
          <span className="text-[11px] text-ink-3">
            Normalized recurring run-rate
          </span>
        </div>
      </div>

      {/* 3. Filter Bar (Search, Status tabs, Category dropdown, Recurrence dropdown) */}
      <div className="flex flex-col gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          {(["ALL", "SCHEDULED", "OVERDUE", "PAID"] as const).map((status) => {
            const isActive = statusFilter === status;
            const count = statusCounts[status] ?? 0;
            const label =
              status === "ALL"
                ? "All"
                : status === "SCHEDULED"
                ? "Scheduled"
                : status === "OVERDUE"
                ? "Overdue"
                : "Paid";

            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-ink text-white"
                    : "bg-fog text-ink-2 hover:bg-fog-2 hover:text-ink"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-white text-ink-3 border border-line"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Select Dropdowns */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 text-xs sm:text-sm rounded-[10px] border border-line bg-white text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink/50 transition-colors"
            />
          </div>

          {/* Select Dropdowns Row on Mobile */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 shrink-0">
            {/* Category Dropdown */}
            <div className="relative">
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | "ALL")}
                className="appearance-none w-full sm:w-auto pl-3 pr-8 h-11 text-xs rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="PAYROLL">Payroll</option>
                <option value="RENT">Rent</option>
                <option value="UTILITIES">Utilities</option>
                <option value="SUPPLIERS">Suppliers</option>
                <option value="SOFTWARE">Software</option>
                <option value="TAX">Tax</option>
                <option value="OTHER">Other</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Recurrence Dropdown */}
            <div className="relative">
              <select
                aria-label="Filter by recurrence"
                value={recurrenceFilter}
                onChange={(e) => setRecurrenceFilter(e.target.value as ExpenseRecurrence | "ALL")}
                className="appearance-none w-full sm:w-auto pl-3 pr-8 h-11 text-xs rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50 cursor-pointer"
              >
                <option value="ALL">All Schedules</option>
                <option value="NONE">One-off</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUALLY">Annually</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-ink-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Expense Data Display */}
      <div className="border border-line rounded-[10px] overflow-hidden bg-white">
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Calendar className="w-10 h-10 text-ink-3/40 mb-3 stroke-[1.5]" />
            <h3 className="text-base font-serif text-ink mb-1">No scheduled expenses found</h3>
            <p className="text-xs text-ink-3 max-w-sm mb-5">
              {search || statusFilter !== "ALL" || categoryFilter !== "ALL" || recurrenceFilter !== "ALL"
                ? "No expenses matched your current filter criteria. Clear filters to view all records."
                : "Schedule your operational liabilities (payroll, rent, subscriptions) to forecast cash flow."}
            </p>
            {search || statusFilter !== "ALL" || categoryFilter !== "ALL" || recurrenceFilter !== "ALL" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                  setRecurrenceFilter("ALL");
                }}
                className="min-h-[44px] px-5 rounded-full text-xs font-medium inline-flex items-center justify-center"
              >
                Clear all filters
              </Button>
            ) : canMutate ? (
              <Button
                type="button"
                onClick={handleOpenAdd}
                className="min-h-[44px] px-5 rounded-full bg-ink text-white hover:bg-ink-hover text-xs font-medium inline-flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Schedule First Expense
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Desktop Table (>= 1024px) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-fog/50 text-[11px] font-mono uppercase tracking-wider text-ink-3">
                    <th scope="col" className="py-3 px-4 font-normal whitespace-nowrap">Due Date</th>
                    <th scope="col" className="py-3 px-4 font-normal whitespace-nowrap">Title & Payee</th>
                    <th scope="col" className="py-3 px-4 font-normal whitespace-nowrap">Category</th>
                    <th scope="col" className="py-3 px-4 font-normal whitespace-nowrap">Schedule</th>
                    <th scope="col" className="py-3 px-4 font-normal whitespace-nowrap text-right">Amount</th>
                    <th scope="col" className="py-3 px-4 font-normal whitespace-nowrap">Status</th>
                    <th scope="col" className="py-3 px-4 font-normal whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {paginatedExpenses.map((exp) => {
                    const isPaid = exp.status === "PAID";
                    const isOverdue = exp.status === "OVERDUE";

                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-fog/30 transition-colors group"
                      >
                        {/* Due Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono">
                          <span className={isOverdue ? "text-ember-ink font-semibold" : "text-ink-2"}>
                            {formatDate(exp.dueDate)}
                          </span>
                        </td>

                        {/* Title & Memo */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-ink tracking-tight">
                              {exp.title}
                            </span>
                            {exp.notes && (
                              <span className="text-[11px] text-ink-3 truncate max-w-xs">
                                {exp.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-fog text-ink-2 border border-line">
                            {CATEGORY_LABELS[exp.category] || exp.category}
                          </span>
                        </td>

                        {/* Recurrence Schedule */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-xs text-ink-3 font-mono">
                            {RECURRENCE_LABELS[exp.recurrence] || exp.recurrence}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right font-serif text-[15px] font-semibold text-ink num">
                          {formatMoney(exp.amount, baseCurrency)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <ExpenseStatusBadge status={exp.status} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {!isPaid && canPayBilling && (
                              <button
                                type="button"
                                onClick={() => handleOpenPay(exp)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium bg-fog text-ink hover:bg-fog-2 border border-line transition-colors"
                                title="Mark as Paid"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-moss" />
                                <span>Mark as Paid</span>
                              </button>
                            )}

                            {!isPaid && canMutate && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(exp)}
                                aria-label={`Edit ${exp.title}`}
                                className="min-h-[36px] min-w-[36px] p-2 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-fog transition-colors"
                                title="Edit expense"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {!isPaid && canMutate && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setExpenseToDelete(exp);
                                }}
                                aria-label={`Delete ${exp.title}`}
                                className="min-h-[36px] min-w-[36px] p-2 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ember-ink hover:bg-ember-tint/50 transition-colors"
                                title="Delete scheduled expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card Stack Layout (< 1024px) with min 44px Touch Targets */}
            <div className="lg:hidden divide-y divide-line">
              {paginatedExpenses.map((exp) => {
                const isPaid = exp.status === "PAID";
                const isOverdue = exp.status === "OVERDUE";

                return (
                  <div
                    key={exp.id}
                    className="p-4 sm:p-5 flex flex-col gap-3 hover:bg-fog/20 transition-colors"
                  >
                    {/* Row 1: Title and Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium text-sm sm:text-base text-ink tracking-tight break-words">
                          {exp.title}
                        </span>
                        {exp.notes && (
                          <span className="text-xs text-ink-3 break-words mt-0.5">
                            {exp.notes}
                          </span>
                        )}
                      </div>
                      <ExpenseStatusBadge status={exp.status} />
                    </div>

                    {/* Row 2: Category, Recurrence & Formatted Amount */}
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-fog text-ink-2 border border-line whitespace-nowrap">
                          {CATEGORY_LABELS[exp.category] || exp.category}
                        </span>
                        <span className="text-xs text-ink-3 font-mono whitespace-nowrap">
                          {RECURRENCE_LABELS[exp.recurrence] || exp.recurrence}
                        </span>
                      </div>
                      <div className="font-serif text-base sm:text-lg font-semibold text-ink num shrink-0">
                        {formatMoney(exp.amount, baseCurrency)}
                      </div>
                    </div>

                    {/* Row 3: Due date */}
                    <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs text-ink-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                        <span className={isOverdue ? "text-ember-ink font-semibold font-mono" : "text-ink-2 font-mono"}>
                          Due {formatDate(exp.dueDate)}
                        </span>
                        {isOverdue && (
                          <span className="text-ember-ink font-medium ml-1">
                            (Overdue)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 4: Action buttons with touch targets >= 44px */}
                    {isPaid ? (
                      <div className="flex items-center gap-1.5 pt-1 text-xs text-moss font-medium">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Payment settled</span>
                      </div>
                    ) : !canMutate && !canPayBilling ? null : (
                      <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                        {canPayBilling && (
                          <button
                            type="button"
                            onClick={() => handleOpenPay(exp)}
                            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium bg-fog text-ink hover:bg-fog-2 border border-line transition-colors"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="w-4 h-4 text-moss shrink-0" />
                            <span>Mark as Paid</span>
                          </button>
                        )}

                        {canMutate && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            aria-label={`Edit ${exp.title}`}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-fog border border-line transition-colors px-3.5 py-2.5 text-xs font-medium"
                            title="Edit expense"
                          >
                            <Edit2 className="w-4 h-4 shrink-0" />
                            <span className="ml-1.5">Edit</span>
                          </button>
                        )}

                        {canMutate && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setExpenseToDelete(exp);
                            }}
                            aria-label={`Delete ${exp.title}`}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ember-ink hover:bg-ember-tint border border-line transition-colors px-3.5 py-2.5 text-xs font-medium"
                            title="Delete scheduled expense"
                          >
                            <Trash2 className="w-4 h-4 shrink-0 text-ink-3" />
                            <span className="ml-1.5">Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredExpenses.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-ink-3 px-1">
          <span>
            Showing {(safePage - 1) * pageSize + 1}–
            {(safePage - 1) * pageSize + paginatedExpenses.length} of{" "}
            {filteredExpenses.length} expenses
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="font-mono text-[11px] px-2 text-ink-2">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-full border border-line bg-white text-ink hover:bg-fog transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk CSV Import Expenses Modal */}
      {canMutate && (
        <BulkImportExpensesModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          baseCurrency={baseCurrency}
          onSuccess={(result) => {
            if (result.createdCount > 0) {
              setImportBanner(
                `Imported ${result.createdCount} ${
                  result.createdCount === 1 ? "expense" : "expenses"
                }.`
              );
              router.refresh();
            }
          }}
        />
      )}

      {/* Expense Form Modal */}
      {canMutate && (
        <ExpenseFormDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          expenseToEdit={expenseToEdit}
          baseCurrency={baseCurrency}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Mark as Paid Modal */}
      {canPayBilling && (
        <MarkPaidModal
          isOpen={Boolean(expenseToPay)}
          onClose={() => setExpenseToPay(null)}
          expense={expenseToPay}
          baseCurrency={baseCurrency}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}

      {/* Delete Expense Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(expenseToDelete)}
        onClose={() => {
          if (!isDeleting) {
            setExpenseToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        variant="danger"
        eyebrow="Accounts Payable"
        title={expenseToDelete ? `Delete "${expenseToDelete.title}"?` : "Delete Expense"}
        description="This removes the scheduled outflow from your cash flow forecast. Settled payments cannot be deleted here."
        confirmLabel="Delete Expense"
        cancelLabel="Cancel"
        isPending={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}

// Named alias export for ExpenseListView
export const ExpenseListView = ExpenseDirectoryView;
