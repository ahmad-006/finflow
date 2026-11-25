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
import type {
  InvoiceCurrency,
  InvoiceWithItemsAndClient,
} from "@/modules/invoices/types";
import type { ClientRecord } from "@/modules/clients/types";
import {
  calculateInvoiceTotals,
  calculateLineItem,
  SUPPORTED_CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
} from "@/modules/invoices/currency";
import { formatMoney } from "@/lib/format";
import { formatUserError } from "@/lib/errors";
import { createInvoiceAction, updateInvoiceAction } from "@/modules/invoices/actions";
import { getLiveExchangeRatesAction } from "@/modules/invoices/rates";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { cn } from "@/lib/utils";

export interface ClientOption {
  id: string;
  clientName: string;
  email: string;
  paymentTermsDays: number;
}

export interface InvoiceBuilderViewProps {
  clients: ClientOption[];
  baseCurrency?: string;
  initialExchangeRates?: Record<InvoiceCurrency, number>;
  mode?: "page" | "modal";
  initialClientId?: string;
  invoiceToEdit?: InvoiceWithItemsAndClient;
  onCancel?: () => void;
  onSuccess?: (invoice: InvoiceWithItemsAndClient) => void;
  formId?: string;
  onPendingChange?: (isPending: boolean) => void;
}

interface FormLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

function normalizeCurrency(code?: string): InvoiceCurrency {
  const upper = (code || "PKR").toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as InvoiceCurrency)
    : "PKR";
}

function calculateDefaultDueDate(
  clientIdent: string,
  issueStr: string,
  clientList: ClientOption[]
): string {
  const selectedClient = clientList.find((c) => c.id === clientIdent);
  const days = selectedClient?.paymentTermsDays || 30;
  const base = new Date(issueStr);
  if (isNaN(base.getTime())) {
    return issueStr;
  }
  base.setDate(base.getDate() + days);
  return base.toISOString().split("T")[0];
}

export function InvoiceBuilderView({
  clients,
  baseCurrency = "PKR",
  initialExchangeRates,
  mode = "page",
  initialClientId,
  invoiceToEdit,
  onCancel,
  onSuccess,
  formId,
  onPendingChange,
}: InvoiceBuilderViewProps) {
  const isEditing = Boolean(invoiceToEdit);
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const normalizedBaseCurrency = React.useMemo(
    () => normalizeCurrency(baseCurrency),
    [baseCurrency]
  );

  // Local client list so inline client creation updates immediately without resetting form
  const [localClients, setLocalClients] = React.useState<ClientOption[]>(() => clients);
  const [isCreateClientOpen, setIsCreateClientOpen] = React.useState(false);
  const [clientNotice, setClientNotice] = React.useState<string | null>(null);

  // Exchange Rates state
  const [rates, setRates] = React.useState<Record<InvoiceCurrency, number>>(() => ({
    ...DEFAULT_EXCHANGE_RATES,
    ...(initialExchangeRates || {}),
    [normalizedBaseCurrency]: 1.0,
  }));
  const [isFetchingRates, setIsFetchingRates] = React.useState(false);
  const [rateFeedback, setRateFeedback] = React.useState<string | null>(null);

  // Initial client selection
  const defaultClientId = React.useMemo(() => {
    if (invoiceToEdit?.clientId) {
      return invoiceToEdit.clientId;
    }
    if (initialClientId && clients.some((c) => c.id === initialClientId)) {
      return initialClientId;
    }
    return clients[0]?.id || "";
  }, [clients, initialClientId, invoiceToEdit]);

  const initialCurrency = invoiceToEdit
    ? normalizeCurrency(invoiceToEdit.currency)
    : normalizedBaseCurrency;

  const [clientId, setClientId] = React.useState<string>(defaultClientId);
  const [currency, setCurrency] = React.useState<InvoiceCurrency>(initialCurrency);
  const [exchangeRate, setExchangeRate] = React.useState<string>(() =>
    invoiceToEdit ? String(invoiceToEdit.exchangeRate) : String(rates[initialCurrency] ?? 1.0)
  );

  const [issueDate, setIssueDate] = React.useState<string>(() =>
    invoiceToEdit
      ? new Date(invoiceToEdit.issueDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [hasManuallyEditedDueDate, setHasManuallyEditedDueDate] = React.useState(
    Boolean(invoiceToEdit)
  );
  const [dueDate, setDueDate] = React.useState<string>(() =>
    invoiceToEdit
      ? new Date(invoiceToEdit.dueDate).toISOString().split("T")[0]
      : calculateDefaultDueDate(
          defaultClientId,
          new Date().toISOString().split("T")[0],
          clients
        )
  );
  const [taxRate, setTaxRate] = React.useState<string>(() =>
    invoiceToEdit ? String(invoiceToEdit.taxRate) : "0"
  );
  const [notes, setNotes] = React.useState<string>(() => invoiceToEdit?.notes || "");

  const [items, setItems] = React.useState<FormLineItem[]>(() =>
    invoiceToEdit && invoiceToEdit.items.length > 0
      ? invoiceToEdit.items.map((it, idx) => ({
          id: it.id || `item-${idx + 1}`,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
        }))
      : [
          {
            id: "item-1",
            description: "",
            quantity: "1",
            unitPrice: "0",
          },
        ]
  );

  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setClientNotice(null);
    setHasManuallyEditedDueDate(false);
    setDueDate(calculateDefaultDueDate(newClientId, issueDate, localClients));
  };

  const handleIssueDateChange = (newIssueDate: string) => {
    setIssueDate(newIssueDate);
    if (!hasManuallyEditedDueDate) {
      setDueDate(calculateDefaultDueDate(clientId, newIssueDate, localClients));
    }
  };

  const handleDueDateChange = (newDueDate: string) => {
    setHasManuallyEditedDueDate(true);
    setDueDate(newDueDate);
  };

  const handleClientCreated = (newClient: ClientRecord) => {
    const newOption: ClientOption = {
      id: newClient.id,
      clientName: newClient.clientName,
      email: newClient.email,
      paymentTermsDays: newClient.paymentTermsDays,
    };

    const nextClients = [
      newOption,
      ...localClients.filter((c) => c.id !== newOption.id),
    ];

    setLocalClients(nextClients);
    setClientId(newOption.id);
    setHasManuallyEditedDueDate(false);
    setDueDate(calculateDefaultDueDate(newOption.id, issueDate, nextClients));
    setClientNotice(`Selected client: ${newOption.clientName}`);
    setErrorBanner(null);
    setFieldErrors((prev) => {
      if (!prev.clientId) return prev;
      const copy = { ...prev };
      delete copy.clientId;
      return copy;
    });
    router.refresh();
  };

  const handleCurrencyChange = (newCurrency: InvoiceCurrency) => {
    setCurrency(newCurrency);
    if (newCurrency === normalizedBaseCurrency) {
      setExchangeRate("1");
      return;
    }
    const newRate = rates[newCurrency] ?? DEFAULT_EXCHANGE_RATES[newCurrency] ?? 1.0;
    setExchangeRate(String(newRate));
  };

  const handleRefreshRates = async () => {
    setIsFetchingRates(true);
    setRateFeedback(null);
    try {
      const res = await getLiveExchangeRatesAction(normalizedBaseCurrency);
      if (res.success && res.rates) {
        setRates(res.rates);
        if (currency !== normalizedBaseCurrency) {
          const freshRate =
            res.rates[currency] ?? DEFAULT_EXCHANGE_RATES[currency] ?? 1.0;
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

  const calculations = React.useMemo(() => {
    const parsedItems = items.map((i) => ({
      quantity: parseFloat(i.quantity) || 0,
      unitPrice: parseFloat(i.unitPrice) || 0,
    }));
    const parsedTax = parseFloat(taxRate) || 0;
    const parsedFx = parseFloat(exchangeRate) || 1.0;

    return calculateInvoiceTotals(
      parsedItems,
      parsedTax,
      currency,
      parsedFx,
      normalizedBaseCurrency
    );
  }, [items, taxRate, currency, exchangeRate, normalizedBaseCurrency]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setFieldErrors({});

    if (!clientId) {
      setErrorBanner("Please select or create a client for this invoice.");
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
        exchangeRate:
          currency === normalizedBaseCurrency ? 1.0 : parseFloat(exchangeRate) || 1.0,
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
        const res = invoiceToEdit
          ? await updateInvoiceAction({ id: invoiceToEdit.id, ...payload })
          : await createInvoiceAction(payload);

        if (!res.success) {
          setErrorBanner(
            res.error || (isEditing ? "Failed to update draft invoice." : "Failed to generate invoice.")
          );
          if (res.errors) {
            setFieldErrors(res.errors);
          }
        } else if (res.data) {
          if (onSuccess) {
            onSuccess(res.data);
          } else {
            router.push(`/invoices/${res.data.id}`);
            if (isEditing) {
              router.refresh();
            }
          }
        }
      } catch (actionErr) {
        setErrorBanner(
          formatUserError(
            actionErr,
            isEditing
              ? "Unable to update draft invoice. Please check your connection."
              : "Unable to generate invoice. Please check your connection."
          )
        );
      }
    });
  };

  const isForeign = currency !== normalizedBaseCurrency;
  const isModal = mode === "modal";

  return (
    <>
      <form
        id={formId}
        onSubmit={handleSubmit}
        className={cn(
          "flex flex-col",
          isModal ? "gap-6" : "gap-8 max-w-5xl mx-auto"
        )}
      >
        {/* 1. Header Navigation (Page mode only) */}
        {!isModal && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-line">
            <div className="flex flex-col gap-1">
              <Link
                href={isEditing && invoiceToEdit ? `/invoices/${invoiceToEdit.id}` : "/invoices"}
                className="inline-flex items-center gap-1.5 min-h-[44px] text-xs text-ink/60 hover:text-ink transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>{isEditing ? "Back to Invoice" : "Back to Invoices"}</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-ink">
                {isEditing && invoiceToEdit
                  ? `Edit Draft ${invoiceToEdit.invoiceNumber}`
                  : "Create Commercial Invoice"}
              </h1>
              <p className="text-xs sm:text-sm text-ink/70">
                {isEditing
                  ? "Update client, line items, currency, spot rate, or due date before issuing this draft."
                  : "Generate an immutable billing statement with frozen spot foreign exchange rates and GAAP-compliant sequential numbering."}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              {onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isPending}
                  className="min-h-[44px] px-5 py-2 rounded-full border border-line text-xs font-medium text-ink/70 hover:bg-fog transition-colors inline-flex items-center justify-center"
                >
                  Discard
                </button>
              ) : (
                <Link
                  href={isEditing && invoiceToEdit ? `/invoices/${invoiceToEdit.id}` : "/invoices"}
                  className="min-h-[44px] px-5 py-2 rounded-full border border-line text-xs font-medium text-ink/70 hover:bg-fog transition-colors inline-flex items-center justify-center"
                >
                  Discard
                </Link>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="min-h-[44px] px-6 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink-hover transition-colors disabled:opacity-50 inline-flex items-center justify-center"
              >
                {isPending
                  ? isEditing
                    ? "Saving Draft..."
                    : "Generating Invoice..."
                  : isEditing
                  ? "Save Draft Changes"
                  : "Create & Issue Invoice"}
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorBanner && (
          <div className="flex items-start gap-2.5 p-3 rounded-[10px] border border-ember/30 bg-ember-tint text-ember-ink text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-medium">{errorBanner}</span>
              {Object.keys(fieldErrors).length > 0 && (
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-ember-ink/90">
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
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-mono uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Client *</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreateClientOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-ink-hover px-2.5 py-1 rounded-full bg-fog hover:bg-fog-2 border border-line transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>New Client</span>
              </button>
            </div>

            {localClients.length === 0 ? (
              <div className="p-3 rounded-[10px] border border-dashed border-line-strong bg-fog/40 flex flex-col gap-2">
                <p className="text-xs text-ink-2 leading-relaxed">
                  Add a client account to select billing terms and issue this invoice.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateClientOpen(true)}
                  className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink-hover transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Client to Continue</span>
                </button>
              </div>
            ) : (
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                required
                className="w-full h-11 px-3 py-2 text-xs rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
              >
                {localClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName} ({c.email}) - Net {c.paymentTermsDays}
                  </option>
                ))}
              </select>
            )}

            {clientNotice ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-moss">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{clientNotice}</span>
              </span>
            ) : (
              <span className="text-[11px] text-ink/50">
                Terms auto-calculate due date based on client agreement
              </span>
            )}
          </div>

          {/* Currency & Spot FX Rate */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-ink/60 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>Billing Currency *</span>
              </span>
              {isForeign && (
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
                onChange={(e) => handleCurrencyChange(e.target.value as InvoiceCurrency)}
                className="w-full h-11 px-3 py-2 text-xs font-mono rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
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
                  disabled={!isForeign}
                  placeholder="Spot Rate"
                  className="w-full h-11 px-3 py-2 text-xs font-mono rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50 disabled:bg-fog disabled:text-ink/40"
                />
              </div>
            </div>
            <span className="text-[11px] text-ink/50">
              {!isForeign
                ? "Base company currency (1.0000)"
                : `Spot FX rate to ${normalizedBaseCurrency} (frozen upon creation)`}
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
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  required
                  className="w-full h-11 px-3 py-2 text-xs rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-ink/50 font-mono">DUE</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  required
                  className="w-full h-11 px-3 py-2 text-xs rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Dynamic Line Items Table */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              className={cn(
                "text-base text-ink",
                isModal ? "font-sans font-semibold" : "font-serif"
              )}
            >
              Line Items
            </h2>
            <span className="text-xs text-ink/50 font-mono">
              Amounts in {currency}
            </span>
          </div>

          <div className="border border-line rounded-[10px] overflow-hidden bg-white">
            {/* Mobile Card Items Stack (< 768px) */}
            <div className="md:hidden divide-y divide-line">
              {items.map((item, index) => {
                const lineCalc = calculateLineItem(
                  parseFloat(item.quantity) || 0,
                  parseFloat(item.unitPrice) || 0
                ).toNumber();
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
                        className="w-full h-11 px-3 py-2 text-xs rounded-[10px] border border-line bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/50"
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
                          className="w-full h-11 px-3 py-2 text-xs font-mono rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
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
                          className="w-full h-11 px-3 py-2 text-xs font-mono rounded-[10px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs">
                      <span className="text-ink/50">Line Total:</span>
                      <span className="font-mono font-semibold text-ink num">
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
                    const lineCalc = calculateLineItem(
                      parseFloat(item.quantity) || 0,
                      parseFloat(item.unitPrice) || 0
                    ).toNumber();
                    return (
                      <tr key={item.id} className="hover:bg-fog/20 transition-colors">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="e.g. Full-Stack Software Engineering Retainer"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                            required
                            className="w-full h-11 px-3 py-2 text-xs rounded-[8px] border border-line bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/50"
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
                            className="w-full h-11 px-3 py-2 text-xs font-mono text-right rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
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
                            className="w-full h-11 px-3 py-2 text-xs font-mono text-right rounded-[8px] border border-line bg-white text-ink focus:outline-none focus:border-ink/50"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium text-ink num">
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
              className="w-full p-3 text-xs rounded-[10px] border border-line bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/50"
            />
            <span className="text-[11px] text-ink/50">
              Visible on the customer printable invoice and guest payment portal.
            </span>
          </div>

          {/* Right Column: Mathematical Settlement Summary */}
          <div className="flex flex-col gap-3 p-4 rounded-[10px] border border-line bg-fog/10">
            <div className="flex items-center justify-between text-xs text-ink/70">
              <span>Subtotal</span>
              <span className="font-mono font-medium text-ink num">
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
                    className="w-16 h-10 px-2 py-1 text-xs font-mono text-right rounded-[8px] border border-line bg-white text-ink focus:outline-none"
                  />
                  <span className="font-mono text-ink/50">%</span>
                </div>
              </div>
              <span className="font-mono text-ink num">
                {formatMoney(calculations.taxAmount, currency)}
              </span>
            </div>

            {/* Total Amount in Invoice Currency */}
            <div className="flex items-center justify-between text-sm font-semibold text-ink pt-2 border-t border-line">
              <span>Total Amount</span>
              <span className="font-mono text-base num">
                {formatMoney(calculations.totalAmount, currency)}
              </span>
            </div>

            {/* Base Currency Equivalent (if Foreign) */}
            {isForeign && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-line/60 bg-white/60 -mx-4 -mb-4 p-4 rounded-b-[10px]">
                <div className="flex flex-col">
                  <span className="font-medium text-ink">
                    Base Equivalent ({normalizedBaseCurrency})
                  </span>
                  <span className="text-[10px] font-mono text-ink/50">
                    @ 1 {currency} = {calculations.exchangeRate} {normalizedBaseCurrency}
                  </span>
                </div>
                <span className="font-mono font-semibold text-ink text-sm num">
                  {formatMoney(calculations.baseTotalAmount, normalizedBaseCurrency)}
                </span>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Stacked Create Client Modal */}
      <CreateClientModal
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onSuccess={handleClientCreated}
      />
    </>
  );
}
