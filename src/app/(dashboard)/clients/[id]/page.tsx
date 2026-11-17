import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, FileText } from "lucide-react";
import { getSession, getCurrentUser } from "@/modules/auth";
import { getClientById } from "@/modules/clients/service";
import { Band } from "@/components/shell/Band";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Money } from "@/components/data/Money";
import { cn } from "@/lib/utils";

interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const client = await getClientById(session.companyId, id);

  if (!client) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const currency = currentUser?.company?.baseCurrency || "PKR";

  const latency = client.metrics.avgPaymentDelayDays;

  return (
    <main className="min-h-screen bg-white">
      <Band tone="white" className="py-8 md:py-12">
        <div className="flex flex-col gap-8">
          {/* 1. Breadcrumb & Navigation */}
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <Link
              href="/clients"
              className="inline-flex items-center gap-1 hover:text-ink transition-colors font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Clients Directory
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink font-medium">{client.clientName}</span>
          </div>

          {/* 2. Client Profile Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-line">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-ink">
                  {client.clientName}
                </h1>
                <StatusBadge status={client.metrics.riskStatus} />
              </div>

              {/* Contact Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-ink-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-ink-3" />
                  <a
                    href={`mailto:${client.email}`}
                    className="hover:underline text-ink"
                  >
                    {client.email}
                  </a>
                </div>

                {client.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-ink-3" />
                    <span>{client.phone}</span>
                  </div>
                )}

                {client.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-ink-3" />
                    <span>{client.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 font-mono">
                  <Clock className="h-3.5 w-3.5 text-ink-3" />
                  <span>Terms: Net {client.paymentTermsDays} days</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/clients"
                className="inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-medium text-ink bg-fog hover:bg-fog-2 transition-colors"
              >
                Back to Directory
              </Link>
            </div>
          </div>

          {/* 3. Financial Summary Stat Rail */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-2">
            <div className="flex flex-col gap-1 p-4 rounded-[14px] bg-fog">
              <span className="text-xs text-ink-3">Total Billed</span>
              <span className="text-lg font-semibold text-ink">
                <Money amount={client.metrics.totalBilled} currency={currency} />
              </span>
              <span className="text-[11px] text-ink-3">Lifetime invoices</span>
            </div>

            <div className="flex flex-col gap-1 p-4 rounded-[14px] bg-fog">
              <span className="text-xs text-ink-3">Total Collected</span>
              <span className="text-lg font-semibold text-moss">
                <Money amount={client.metrics.totalPaid} currency={currency} />
              </span>
              <span className="text-[11px] text-ink-3">
                {client.metrics.settledInvoicesCount} invoices settled
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4 rounded-[14px] bg-fog">
              <span className="text-xs text-ink-3">Outstanding</span>
              <span className="text-lg font-semibold text-ink">
                <Money amount={client.metrics.outstandingBalance} currency={currency} />
              </span>
              <span className="text-[11px] text-ink-3">
                {client.metrics.openInvoicesCount} open
              </span>
            </div>

            <div className="flex flex-col gap-1 p-4 rounded-[14px] bg-fog">
              <span className="text-xs text-ink-3">Overdue Debt</span>
              <span
                className={cn(
                  "text-lg font-semibold",
                  client.metrics.overdueAmount > 0 ? "text-ember-ink" : "text-moss"
                )}
              >
                <Money amount={client.metrics.overdueAmount} currency={currency} />
              </span>
              <span className="text-[11px] text-ink-3">Past agreed terms</span>
            </div>

            <div className="flex flex-col gap-1 p-4 rounded-[14px] bg-fog col-span-2 md:col-span-1">
              <span className="text-xs text-ink-3">Payment Latency</span>
              <span
                className={cn(
                  "text-lg font-semibold font-mono",
                  latency <= 3
                    ? "text-moss"
                    : latency <= 14
                    ? "text-amber"
                    : "text-ember-ink"
                )}
              >
                {client.metrics.settledInvoicesCount > 0
                  ? latency <= 0
                    ? "0.0d on time"
                    : `+${latency.toFixed(1)}d late`
                  : "No history"}
              </span>
              <span className="text-[11px] text-ink-3">Average turnaround</span>
            </div>
          </div>

          {/* 4. Historical Invoices & Statement Ledger */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
                  Invoice & Settlement Ledger
                </h2>
                <p className="text-xs text-ink-3">
                  Historical statement of all issued invoices, payment settlements, and delays.
                </p>
              </div>
              <span className="text-xs text-ink-3 font-mono">
                {client.invoices.length} {client.invoices.length === 1 ? "record" : "records"}
              </span>
            </div>

            {client.invoices.length > 0 ? (
              <div className="overflow-x-auto border-t border-b border-line">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.06em] text-ink-3">
                      <th className="py-3.5 pl-2 pr-4">Invoice</th>
                      <th className="py-3.5 px-4">Issued</th>
                      <th className="py-3.5 px-4">Due Date</th>
                      <th className="py-3.5 px-4 text-right">Total</th>
                      <th className="py-3.5 px-4 text-right">Paid</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 pl-4 pr-2 text-right">Turnaround / Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {client.invoices.map((inv) => {
                      const isPaid = inv.status === "PAID";
                      const issueFormatted = new Date(inv.issueDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      const dueFormatted = new Date(inv.dueDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-fog/50 transition-colors"
                        >
                          {/* Invoice Number */}
                          <td className="py-3.5 pl-2 pr-4 font-mono font-medium text-ink">
                            {inv.invoiceNumber}
                          </td>

                          {/* Issue Date */}
                          <td className="py-3.5 px-4 text-xs text-ink-2 whitespace-nowrap">
                            {issueFormatted}
                          </td>

                          {/* Due Date */}
                          <td className="py-3.5 px-4 text-xs text-ink-2 whitespace-nowrap">
                            {dueFormatted}
                          </td>

                          {/* Total */}
                          <td className="py-3.5 px-4 text-right font-medium whitespace-nowrap">
                            <Money amount={inv.baseTotalAmount} currency={currency} />
                          </td>

                          {/* Paid */}
                          <td className="py-3.5 px-4 text-right text-xs whitespace-nowrap">
                            <Money amount={inv.paidAmount} currency={currency} />
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <StatusBadge status={inv.status as "PAID" | "OVERDUE" | "SENT"} />
                          </td>

                          {/* Latency */}
                          <td className="py-3.5 pl-4 pr-2 text-right whitespace-nowrap font-mono text-xs">
                            {isPaid ? (
                              <span
                                className={cn(
                                  inv.delayDays === 0 ? "text-moss" : "text-amber"
                                )}
                              >
                                {inv.delayDays === 0
                                  ? "Settled on time"
                                  : `+${inv.delayDays}d delay`}
                              </span>
                            ) : inv.delayDays > 0 ? (
                              <span className="text-ember-ink font-medium">
                                {inv.delayDays}d overdue
                              </span>
                            ) : (
                              <span className="text-ink-3">Not yet due</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center border-t border-b border-line">
                <FileText className="mx-auto h-8 w-8 text-ink-3 mb-2" />
                <p className="text-sm font-medium text-ink">No invoices issued to this client yet</p>
                <p className="text-xs text-ink-3 mt-1">
                  When you issue an invoice to {client.clientName}, it will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </Band>
    </main>
  );
}
