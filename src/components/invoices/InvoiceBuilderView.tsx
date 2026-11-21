"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Building2,
  Coins,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import type { InvoiceCurrency } from "@/modules/invoices/types";
import {
  calculateInvoiceTotals,
  formatMoney,
  SUPPORTED_CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
} from "@/modules/invoices/currency";
import { formatUserError } from "@/lib/errors";
import { createInvoiceAction } from "@/modules/invoices/actions";
import { getLiveExchangeRatesAction } from "@/modules/invoices/rates";

interface ClientOption {
  id: string;
  clientName: string;
  email: string;
  paymentTermsDays: number;
}

interface InvoiceBuilderViewProps {
  clients: ClientOption[];
  baseCurrency?: string;
  initialExchangeRates?: Record<InvoiceCurrency, number>;
}

interface FormLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export function InvoiceBuilderView({
  clients,
  baseCurrency = "PKR",
  initialExchangeRates,
}: InvoiceBuilderViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Exchange Rates state
  const [rates, setRates] = React.useState<Record<InvoiceCurrency, number>>(() => ({
    ...DEFAULT_EXCHANGE_RATES,
    ...(initialExchangeRates || {}),
  }));
  const [isFetchingRates, setIsFetchingRates] = React.useState(false);
  const [rateFeedback, setRateFeedback] = React.useState<string | null>(null);

  // Form State
  const [clientId, setClientId] = React.useState<string>(clients[0]?.id || "");
  const [currency, setCurrency] = React.useState<InvoiceCurrency>("PKR");
  const [exchangeRate, setExchangeRate] = React.useState<string>(
    String(rates.PKR ?? 1.0)
  );

  const todayIso = new Date().toISOString().split("T")[0];
  const [issueDate, setIssueDate] = React.useState<string>(todayIso);

  // Compute default due date from first client
  const calculateDefaultDueDate = (clientIdent: string, issueStr: string) => {
    const selectedClient = clients.find((c) => c.id === clientIdent);
    const days = selectedClient?.paymentTermsDays || 30;
    const base = new Date(issueStr);
    base.setDate(base.getDate() + days);
    return base.toISOString().split("T")[0];
  };

  const [dueDate, setDueDate] = React.useState<string>(() =>
    calculateDefaultDueDate(clientId, todayIso)
  );
  const [taxRate, setTaxRate] = React.useState<string>("0");
  const [notes, setNotes] = React.useState<string>("");

  const [items, setItems] = React.useState<FormLineItem[]>([
    {
      id: "item-1",
      description: "",
      quantity: "1",
      unitPrice: "0",
    },
  ]);

  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  // When selected client changes, adjust dueDate according to their terms
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setDueDate(calculateDefaultDueDate(newClientId, issueDate));
  };

  // When currency changes, update spot exchange rate default
  const handleCurrencyChange = (newCurrency: InvoiceCurrency) => {
    setCurrency(newCurrency);
    const newRate = rates[newCurrency] ?? DEFAULT_EXCHANGE_RATES[newCurrency] ?? 1.0;
    setExchangeRate(String(newRate));
  };

  const handleRefreshRates = async () => {
    setIsFetchingRates(true);
    setRateFeedback(null);
    try {
      const res = await getLiveExchangeRatesAction(baseCurrency);
      if (res.success && res.rates) {
        setRates(res.rates);
        if (currency !== "PKR") {
          const freshRate = res.rates[currency] ?? DEFAULT_EXCHANGE_RATES[currency] ?? 1.0;
          setExchangeRate(String(freshRate));
        }
        setRateFeedback("Rates updated");
        setTimeout(() => setRateFeedback(null), 3000);
      } else {
        setRateFeedback("Baseline rates active");
        setTimeout(() => setRateFeedback(null), 3000);
      }
    } catch {
      setRateFeedback("Unable to refresh");
      setTimeout(() => setRateFeedback(null), 3000);
    } finally {
      setIsFetchingRates(false);
    }
  };

  // Dynamic Item row management
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: "1",
        unitPrice: "0",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof FormLineItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Real-time calculation engine
  const calculations = React.useMemo(() => {
    const parsedItems = items.map((i) => ({
      quantity: parseFloat(i.quantity) || 0,
      unitPrice: parseFloat(i.unitPrice) || 0,
    }));
    const parsedTax = parseFloat(taxRate) || 0;
    const parsedFx = parseFloat(exchangeRate) || 1.0;

    return calculateInvoiceTotals(parsedItems, parsedTax, currency, parsedFx);
  }, [items, taxRate, currency, exchangeRate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setFieldErrors({});

    // Simple frontend validation check
    if (!clientId) {
      setErrorBanner("Please select a client for this invoice.");
      return;
    }

    if (items.some((i) => !i.description.trim())) {
      setErrorBanner("Please ensure all line items have a description.");
      return;
    }

    startTransition(async () => {
      const payload = {
        clientId,
        currency,
        exchangeRate: parseFloat(exchangeRate) || 1.0,
        issueDate,
        dueDate,
        taxRate: parseFloat(taxRate) || 0,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          description: i.description.trim(),
          quantity: parseFloat(i.quantity) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
        })),
      };

      try {
        const res = await createInvoiceAction(payload);

        if (!res.success) {
          setErrorBanner(res.error || "Failed to generate invoice.");
          if (res.errors) {
            setFieldErrors(res.errors);
          }
        } else if (res.data) {
          router.push(`/invoices/${res.data.id}`);
        }
      } catch (actionErr) {
        setErrorBanner(formatUserError(actionErr, "Unable to generate invoice. Please check your connection."));
      }
    });
  };

  const isForeign = currency !== baseCurrency;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* 1. Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
        <div className="flex flex-col gap-1">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 min-h-[44px] text-xs text-ink/60 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Back to Invoices</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-ink">
            Create Commercial Invoice
          </h1>
          <p className="text-xs sm:text-sm text-ink/70">
            Generate an immutable billing statement with frozen spot foreign exchange rates and GAAP-compliant sequential numbering.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <Link
            href="/invoices"
            className="min-h-[44px] px-5 py-2 rounded-full border border-line text-xs font-medium text-ink/70 hover:bg-fog transition-colors inline-flex items-center justify-center"
          >
            Discard
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="min-h-[44px] px-6 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink-hover transition-colors disabled:opacity-50 inline-flex items-center justify-center"
          >
            {isPending ? "Generating Invoice..." : "Create & Issue Invoice"}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorBanner && (
        <div className="flex items-start gap-2.5 p-3 rounded-[8px] border border-ember/30 bg-ember/5 text-ember text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-medium">{errorBanner}</span>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-ember/80">
                {Object.entries(fieldErrors).map(([field, errs]) => (
                  <li key={field}>{errs.join(", ")}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 2. Billing Metadata Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-[10px] border border-line bg-white">
        {/* Client Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>Client *</span>
          </label>
          {clients.length === 0 ? (
            <div className="text-xs text-ember">
              No clients found. Please{" "}
              <Link href="/clients" className="underline font-medium">
                add a client
              </Link>{" "}
              first.
            </div>
          ) : (
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              required
              className="w-full h-11 px-3 py-2 text-xs rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName} ({c.email}) - Net {c.paymentTermsDays}
                </option>
              ))}
            </select>
          )}
          <span className="text-[11px] text-ink/50">
            Terms auto-calculate due date based on client agreement
          </span>
        </div>

        {/* Currency & Spot FX Rate */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-ink/60 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>Billing Currency *</span>
            </span>
            {currency !== "PKR" && (
              <button
                type="button"
                onClick={handleRefreshRates}
                disabled={isFetchingRates}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-ink/60 hover:text-ink disabled:opacity-50 transition-colors"
                title="Fetch live market spot exchange rates"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingRates ? "animate-spin text-ink" : ""}`} />
                <span>{rateFeedback || "Live rates"}</span>
              </button>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as any)}
              className="w-full h-11 px-3 py-2 text-xs font-mono rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
            >
              {SUPPORTED_CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur} ({CURRENCY_SYMBOLS[cur]})
                </option>
              ))}
            </select>

            <div className="relative">
              <input
                type="number"
                step="0.00000001"
                min="0.00000001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                disabled={currency === "PKR"}
                placeholder="Spot Rate"
                className="w-full h-11 px-3 py-2 text-xs font-mono rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50 disabled:bg-fog disabled:text-ink/40"
              />
            </div>
          </div>
          <span className="text-[11px] text-ink/50">
            {currency === "PKR"
              ? "Base company currency (1.0000)"
              : `Spot FX rate to PKR (frozen upon creation)`}
          </span>
        </div>

        {/* Issue Date & Due Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Billing Schedule *</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-ink/50 font-mono">ISSUE</span>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="w-full h-11 px-3 py-2 text-xs rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-ink/50 font-mono">DUE</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full h-11 px-3 py-2 text-xs rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Line Items Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-serif text-ink">Line Items</h2>
          <span className="text-xs text-ink/50 font-mono">
            Amounts in {currency}
          </span>
        </div>

        <div className="border border-line rounded-[10px] overflow-hidden bg-white">
          {/* Mobile Card Items Stack (< 768px) */}
          <div className="md:hidden divide-y divide-line">
            {items.map((item, index) => {
              const lineCalc = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
              return (
                <div key={item.id} className="p-4 flex flex-col gap-3 hover:bg-fog/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium uppercase tracking-wider text-ink/60">
                      Item #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-full text-ink/40 hover:text-ember hover:bg-ember/5 disabled:opacity-20 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono uppercase text-ink/50">
                      Description *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Full-Stack Software Engineering Retainer"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                      required
                      className="w-full h-11 px-3 py-2 text-xs rounded-[8px] border border-line bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-mono uppercase text-ink/50">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, "quantity", e.target.value)}
                        required
                        className="w-full h-11 px-3 py-2 text-xs font-mono rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-mono uppercase text-ink/50">
                        Unit Price ({currency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(item.id, "unitPrice", e.target.value)}
                        required
                        className="w-full h-11 px-3 py-2 text-xs font-mono rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs">
                    <span className="text-ink/50">Line Total:</span>
                    <span className="font-mono font-semibold text-ink">
                      {formatMoney(lineCalc, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-fog/30 text-[11px] font-mono uppercase tracking-wider text-ink/60">
                  <th scope="col" className="py-2.5 px-3 font-normal">Description</th>
                  <th scope="col" className="py-2.5 px-3 w-28 text-right font-normal">Quantity</th>
                  <th scope="col" className="py-2.5 px-3 w-36 text-right font-normal">Unit Price</th>
                  <th scope="col" className="py-2.5 px-3 w-36 text-right font-normal">Line Total</th>
                  <th scope="col" className="py-2.5 px-3 w-14 text-center font-normal"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {items.map((item) => {
                  const lineCalc = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                  return (
                    <tr key={item.id} className="hover:bg-fog/20 transition-colors">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="e.g. Full-Stack Software Engineering Retainer"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                          required
                          className="w-full h-11 px-3 py-2 text-xs rounded-[6px] border border-line bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/50"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, "quantity", e.target.value)}
                          required
                          className="w-full h-11 px-3 py-2 text-xs font-mono text-right rounded-[6px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, "unitPrice", e.target.value)}
                          required
                          className="w-full h-11 px-3 py-2 text-xs font-mono text-right rounded-[6px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-ink">
                        {formatMoney(lineCalc, currency)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length <= 1}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-full text-ink/40 hover:text-ember disabled:opacity-20 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-line bg-fog/20 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddItem}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line bg-white text-xs font-medium text-ink hover:bg-fog transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
            <span className="text-[11px] text-ink/50">
              {items.length} {items.length === 1 ? "item" : "items"} declared
            </span>
          </div>
        </div>
      </div>

      {/* 4. Financial Reconciliation & Tax Calculations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
        {/* Left Column: Notes & Payment Instructions */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono uppercase tracking-wider text-ink/60">
            Terms & Client Notes
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment instructions, bank wire account info, IBAN, Swift code, or project milestones..."
            className="w-full p-3 text-xs rounded-[8px] border border-line bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/50"
          />
          <span className="text-[11px] text-ink/50">
            Visible on the customer printable invoice and guest payment portal.
          </span>
        </div>

        {/* Right Column: Mathematical Settlement Summary */}
        <div className="flex flex-col gap-3 p-4 rounded-[10px] border border-line bg-fog/10">
          <div className="flex items-center justify-between text-xs text-ink/70">
            <span>Subtotal</span>
            <span className="font-mono font-medium text-ink">
              {formatMoney(calculations.subtotal, currency)}
            </span>
          </div>

          {/* Tax Rate Input & Calculated Tax */}
          <div className="flex items-center justify-between text-xs text-ink/70 pt-2 border-t border-line/60">
            <div className="flex items-center gap-2">
              <span>Sales Tax / VAT</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-16 h-10 px-2 py-1 text-xs font-mono text-right rounded border border-line bg-white text-ink focus:outline-none"
                />
                <span className="font-mono text-ink/50">%</span>
              </div>
            </div>
            <span className="font-mono text-ink">
              {formatMoney(calculations.taxAmount, currency)}
            </span>
          </div>

          {/* Total Amount in Invoice Currency */}
          <div className="flex items-center justify-between text-sm font-semibold text-ink pt-2 border-t border-line">
            <span>Total Amount</span>
            <span className="font-mono text-base">
              {formatMoney(calculations.totalAmount, currency)}
            </span>
          </div>

          {/* Base Currency Equivalent (if Foreign) */}
          {isForeign && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-line/60 bg-white/60 -mx-4 -mb-4 p-4 rounded-b-[10px]">
              <div className="flex flex-col">
                <span className="font-medium text-ink">
                  Base Equivalent ({baseCurrency})
                </span>
                <span className="text-[10px] font-mono text-ink/50">
                  @ 1 {currency} = {calculations.exchangeRate} {baseCurrency}
                </span>
              </div>
              <span className="font-mono font-semibold text-ink text-sm">
                {formatMoney(calculations.baseTotalAmount, baseCurrency as any)}
              </span>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
