"use client";

import * as React from "react";
import type {
  InvoiceCurrency,
  InvoiceWithItemsAndClient,
} from "@/modules/invoices/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import {
  InvoiceBuilderView,
  type ClientOption,
} from "./InvoiceBuilderView";

export interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientOption[];
  baseCurrency?: string;
  initialExchangeRates?: Record<InvoiceCurrency, number>;
  initialClientId?: string;
  onSuccess?: (invoice: InvoiceWithItemsAndClient) => void;
}

const CREATE_INVOICE_FORM_ID = "create-invoice-modal-form";

function CreateInvoiceModalContent({
  onClose,
  clients,
  baseCurrency = "PKR",
  initialExchangeRates,
  initialClientId,
  onSuccess,
}: Omit<CreateInvoiceModalProps, "isOpen">) {
  const [isPending, setIsPending] = React.useState(false);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      eyebrow="Accounts Receivable"
      title="Create Commercial Invoice"
      description="Issue a multi-currency invoice with frozen spot FX rates and sequential numbering."
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
            Discard
          </Button>
          <Button
            type="submit"
            form={CREATE_INVOICE_FORM_ID}
            isLoading={isPending}
            className="min-h-[44px] h-11 px-6 rounded-full text-sm font-medium"
          >
            {isPending ? "Generating Invoice..." : "Create & Issue Invoice"}
          </Button>
        </>
      }
    >
      <InvoiceBuilderView
        mode="modal"
        formId={CREATE_INVOICE_FORM_ID}
        clients={clients}
        baseCurrency={baseCurrency}
        initialExchangeRates={initialExchangeRates}
        initialClientId={initialClientId}
        onPendingChange={setIsPending}
        onCancel={onClose}
        onSuccess={(invoice) => {
          onSuccess?.(invoice);
          onClose();
        }}
      />
    </Modal>
  );
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  clients,
  baseCurrency = "PKR",
  initialExchangeRates,
  initialClientId,
  onSuccess,
}: CreateInvoiceModalProps) {
  if (!isOpen) return null;
  return (
    <CreateInvoiceModalContent
      onClose={onClose}
      clients={clients}
      baseCurrency={baseCurrency}
      initialExchangeRates={initialExchangeRates}
      initialClientId={initialClientId}
      onSuccess={onSuccess}
    />
  );
}
