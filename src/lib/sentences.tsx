import React from "react";

export type SentencePart = {
  text: string;
  isEmphasized?: boolean;
  isBreach?: boolean;
};

/**
 * Overview / Cash Flow sentence when cash falls below buffer.
 * "Cash falls {amount} below your buffer on {date} and stays there for {days} days."
 */
export function getOverviewBreachText(amount: string, date: string, days: number): string {
  const dayStr = days === 1 ? "1 day" : `${days} days`;
  return `Cash falls ${amount} below your buffer on ${date} and stays there for ${dayStr}.`;
}

export function renderOverviewBreach(amount: string, date: string, days: number): React.ReactNode {
  const dayStr = days === 1 ? "1 day" : `${days} days`;
  return (
    <>
      Cash falls <span className="font-semibold text-[var(--ember-ink)]">{amount}</span> below your buffer on{" "}
      <span className="font-semibold text-[var(--ink)]">{date}</span> and stays there for{" "}
      <span className="font-semibold text-[var(--ink)]">{dayStr}</span>.
    </>
  );
}

/**
 * Overview / Cash Flow sentence when cash stays above buffer.
 * "Cash stays above your buffer for the next 30 days. The lowest point is {amount} on {date}."
 */
export function getOverviewNoBreachText(amount: string, date: string): string {
  return `Cash stays above your buffer for the next 30 days. The lowest point is ${amount} on ${date}.`;
}

export function renderOverviewNoBreach(amount: string, date: string): React.ReactNode {
  return (
    <>
      Cash stays above your buffer for the next 30 days. The lowest point is{" "}
      <span className="font-semibold text-[var(--ink)]">{amount}</span> on{" "}
      <span className="font-semibold text-[var(--ink)]">{date}</span>.
    </>
  );
}

/**
 * Invoices overview sentence.
 * "{amount} is outstanding across {n} invoices, {overdue} of it overdue."
 */
export function getInvoicesOverviewText(amount: string, count: number, overdueAmount?: string): string {
  if (count === 0) return "No outstanding invoices.";
  const invStr = count === 1 ? "1 invoice" : `${count} invoices`;
  if (overdueAmount && overdueAmount !== "0" && overdueAmount !== "PKR 0.00") {
    return `${amount} is outstanding across ${invStr}, ${overdueAmount} of it overdue.`;
  }
  return `${amount} is outstanding across ${invStr}.`;
}

export function renderInvoicesOverview(amount: string, count: number, overdueAmount?: string): React.ReactNode {
  if (count === 0) return <>No outstanding invoices.</>;
  const invStr = count === 1 ? "1 invoice" : `${count} invoices`;
  if (overdueAmount && overdueAmount !== "0" && overdueAmount !== "PKR 0.00") {
    return (
      <>
        <span className="font-semibold text-[var(--ink)]">{amount}</span> is outstanding across{" "}
        <span className="font-semibold text-[var(--ink)]">{invStr}</span>,{" "}
        <span className="font-semibold text-[var(--ember-ink)]">{overdueAmount}</span> of it overdue.
      </>
    );
  }
  return (
    <>
      <span className="font-semibold text-[var(--ink)]">{amount}</span> is outstanding across{" "}
      <span className="font-semibold text-[var(--ink)]">{invStr}</span>.
    </>
  );
}

/**
 * Clients overview sentence.
 * "{n} clients. {k} on the watchlist or critical."
 */
export function getClientsOverviewText(totalCount: number, atRiskCount: number): string {
  if (totalCount === 0) return "No clients recorded.";
  const clientStr = totalCount === 1 ? "1 client" : `${totalCount} clients`;
  const riskStr = atRiskCount === 0 ? "None" : `${atRiskCount}`;
  return `${clientStr}. ${riskStr} on the watchlist or critical.`;
}

export function renderClientsOverview(totalCount: number, atRiskCount: number): React.ReactNode {
  if (totalCount === 0) return <>No clients recorded.</>;
  const clientStr = totalCount === 1 ? "1 client" : `${totalCount} clients`;
  return (
    <>
      <span className="font-semibold text-[var(--ink)]">{clientStr}</span>.{" "}
      <span className={atRiskCount > 0 ? "font-semibold text-[var(--ember-ink)]" : "font-semibold text-[var(--ink)]"}>
        {atRiskCount === 0 ? "None" : atRiskCount}
      </span>{" "}
      on the watchlist or critical.
    </>
  );
}

/**
 * Client detail sentence.
 * "Pays in {d} days on average. {amount} outstanding."
 */
export function getClientDetailText(days: number, outstanding: string): string {
  const dayStr = days === 1 ? "1 day" : `${days} days`;
  return `Pays in ${dayStr} on average. ${outstanding} outstanding.`;
}

/**
 * Invoice detail sentence.
 * "Due {date}, {n} days away." or "{n} days overdue."
 */
export function getInvoiceDetailText(date: string, daysDistance: number): string {
  if (daysDistance === 0) return "Due today.";
  if (daysDistance > 0) {
    const dayStr = daysDistance === 1 ? "1 day away" : `${daysDistance} days away`;
    return `Due ${date}, ${dayStr}.`;
  }
  const absDays = Math.abs(daysDistance);
  const dayStr = absDays === 1 ? "1 day overdue" : `${absDays} days overdue`;
  return `${dayStr}.`;
}

/**
 * Calendar sentence.
 * "{n} payments due and {m} expenses in {month}."
 */
export function getCalendarOverviewText(paymentsCount: number, expensesCount: number, month: string): string {
  const payStr = paymentsCount === 1 ? "1 payment due" : `${paymentsCount} payments due`;
  const expStr = expensesCount === 1 ? "1 expense" : `${expensesCount} expenses`;
  return `${payStr} and ${expStr} in ${month}.`;
}

/**
 * StatementSentence Component
 */
export function StatementSentence({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[21px] leading-[30px] font-normal tracking-[-0.01em] text-[var(--ink-2)] ${className}`}>
      {children}
    </p>
  );
}
