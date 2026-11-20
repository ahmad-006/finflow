import * as React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/modules/auth";
import { getCached30DayForecast } from "@/modules/treasury";
import { getInvoices } from "@/modules/invoices";
import { getCachedExpenses } from "@/modules/expenses";
import {
  DashboardOverviewClientView,
  type ActionableInvoice,
  type ActionableExpense,
} from "@/components/dashboard/DashboardOverviewClientView";
import { CashFlowSkeleton } from "@/components/treasury/CashFlowSkeleton";
import { formatDocumentDate } from "@/modules/documents/pdf-generator";

export const metadata = {
  title: "Treasury Overview & Cash Runway | FinFlow",
  description:
    "Real-time 30-day predictive cash runway, liquidity buffer alerts, accounts receivable collection, and scheduled operational outflows.",
};

async function DashboardDataLoader() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [expectedForecast, onTimeForecast, invoiceResult, rawExpenses] = await Promise.all([
    getCached30DayForecast(session.companyId, "expected"),
    getCached30DayForecast(session.companyId, "onTime"),
    getInvoices(session.companyId, { limit: 100 }),
    getCachedExpenses(session.companyId),
  ]);

  const baseCurrency = expectedForecast.baseCurrency || "PKR";

  const allInvoices = invoiceResult.invoices || [];
  const allExpenses = Array.isArray(rawExpenses)
    ? rawExpenses
    : (rawExpenses as { expenses: any[] }).expenses || [];

  const now = new Date();
  const todayTimestamp = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).getTime();

  const fourteenDaysLater = todayTimestamp + 14 * 86400000;

  // 1. Overdue Invoices
  const overdueInvoices: ActionableInvoice[] = allInvoices
    .filter((inv) => {
      if (inv.status === "PAID" || inv.status === "CANCELLED") return false;
      const due = new Date(inv.dueDate).getTime();
      return due < todayTimestamp;
    })
    .sort((a, b) => {
      const dueA = new Date(a.dueDate).getTime();
      const dueB = new Date(b.dueDate).getTime();
      return dueA - dueB;
    })
    .map((inv) => {
      const due = new Date(inv.dueDate).getTime();
      const diffDays = Math.max(1, Math.floor((todayTimestamp - due) / 86400000));
      return {
        id: inv.id,
        client: inv.client?.clientName || "Commercial Client",
        number: inv.invoiceNumber,
        dueText: `${diffDays} ${diffDays === 1 ? "day" : "days"} overdue`,
        amount: Number(inv.baseTotalAmount || inv.totalAmount),
        status: "OVERDUE" as const,
        daysOverdue: diffDays,
        dueDate: formatDocumentDate(inv.dueDate),
      };
    });

  // 2. Upcoming Invoices (next 14 days)
  const upcomingInvoices: ActionableInvoice[] = allInvoices
    .filter((inv) => {
      if (inv.status === "PAID" || inv.status === "CANCELLED") return false;
      const due = new Date(inv.dueDate).getTime();
      return due >= todayTimestamp && due <= fourteenDaysLater;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map((inv) => {
      return {
        id: inv.id,
        client: inv.client?.clientName || "Commercial Client",
        number: inv.invoiceNumber,
        dueText: `Due ${formatDocumentDate(inv.dueDate)}`,
        amount: Number(inv.baseTotalAmount || inv.totalAmount),
        status: "SENT" as const,
        dueDate: formatDocumentDate(inv.dueDate),
      };
    });

  // 3. Upcoming Expenses (next 14 days)
  const upcomingExpenses: ActionableExpense[] = allExpenses
    .filter((exp) => {
      if (exp.isPaid) return false;
      const due = new Date(exp.dueDate).getTime();
      return due >= todayTimestamp && due <= fourteenDaysLater;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map((exp) => {
      return {
        id: exp.id,
        title: exp.title,
        category: exp.category,
        dueText: `Due ${formatDocumentDate(exp.dueDate)}`,
        amount: Number(exp.amount),
        dueDate: formatDocumentDate(exp.dueDate),
        isPaid: false,
      };
    });

  return (
    <DashboardOverviewClientView
      initialForecast={expectedForecast}
      initialOnTimeForecast={onTimeForecast}
      initialOverdueInvoices={overdueInvoices}
      initialUpcomingInvoices={upcomingInvoices}
      initialUpcomingExpenses={upcomingExpenses}
      baseCurrency={baseCurrency}
    />
  );
}

export default function DashboardOverviewPage() {
  return (
    <React.Suspense fallback={<CashFlowSkeleton />}>
      <DashboardDataLoader />
    </React.Suspense>
  );
}
