"use client";

import * as React from "react";
import { createClientAction, updateClientAction } from "@/modules/clients/actions";
import { formatUserError } from "@/lib/errors";
import type { ClientRecord } from "@/modules/clients/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (client: ClientRecord) => void;
  clientToEdit?: ClientRecord | null;
}

const CLIENT_MODAL_FORM_ID = "client-modal-form";
const STANDARD_TERMS = [7, 15, 30, 45, 60, 90];

function CreateClientModalContent({
  onClose,
  onSuccess,
  clientToEdit,
}: {
  onClose: () => void;
  onSuccess?: (client: ClientRecord) => void;
  clientToEdit?: ClientRecord | null;
}) {
  const isEditing = Boolean(clientToEdit);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const [formData, setFormData] = React.useState(() => ({
    clientName: clientToEdit?.clientName || "",
    email: clientToEdit?.email || "",
    phone: clientToEdit?.phone || "",
    address: clientToEdit?.address || "",
    paymentTermsDays: String(clientToEdit?.paymentTermsDays ?? 30),
  }));

  const termOptions = React.useMemo(() => {
    const terms = new Set(STANDARD_TERMS);
    if (clientToEdit?.paymentTermsDays && clientToEdit.paymentTermsDays > 0) {
      terms.add(clientToEdit.paymentTermsDays);
    }
    return Array.from(terms).sort((a, b) => a - b);
  }, [clientToEdit]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result =
          isEditing && clientToEdit
            ? await updateClientAction({
                id: clientToEdit.id,
                ...formData,
              })
            : await createClientAction(formData);

        if (!result.success) {
          setErrorMessage(
            result.error || (isEditing ? "Failed to update client." : "Failed to create client.")
          );
          if (result.errors) {
            setFieldErrors(result.errors);
          }
          return;
        }

        if (result.data) {
          onSuccess?.(result.data);
        }
        onClose();
      } catch (err) {
        setErrorMessage(
          formatUserError(
            err,
            isEditing
              ? "Unable to update client. Please check your connection."
              : "Unable to create client. Please check your connection."
          )
        );
      }
    });
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      eyebrow="Accounts Receivable"
      title={isEditing ? "Edit Client Profile" : "Add New Client"}
      description={
        isEditing
          ? "Update billing contact details and default payment terms."
          : "Create a client account to issue multi-currency invoices and track payment latency."
      }
      preventClose={isPending}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={onClose}
            disabled={isPending}
            className="min-h-[44px] h-11 px-5 rounded-full text-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={CLIENT_MODAL_FORM_ID}
            variant="primary"
            size="default"
            isLoading={isPending}
            className="min-h-[44px] h-11 px-6 rounded-full text-sm"
          >
            {isEditing ? "Save Changes" : "Save Client"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {errorMessage && (
          <div className="rounded-[10px] bg-ember-tint px-4 py-2.5 text-xs sm:text-sm text-ember-ink border border-ember-ink/20">
            {errorMessage}
          </div>
        )}

        <form id={CLIENT_MODAL_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="e.g. Crestline Packaging LLC"
              value={formData.clientName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, clientName: e.target.value }))
              }
              isInvalid={Boolean(fieldErrors.clientName)}
              required
              autoFocus
            />
            {fieldErrors.clientName && (
              <p className="mt-1 text-xs text-ember-ink">{fieldErrors.clientName[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Billing Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="billing@crestline.com"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              isInvalid={Boolean(fieldErrors.email)}
              required
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-ember-ink">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label htmlFor="phone" optional>Phone</Label>
              <Input
                id="phone"
                placeholder="+92 300 1234567"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="paymentTermsDays">Payment Terms</Label>
              <Select
                id="paymentTermsDays"
                value={formData.paymentTermsDays}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, paymentTermsDays: e.target.value }))
                }
              >
                {termOptions.map((days) => (
                  <option key={days} value={String(days)}>
                    Net {days} ({days === 30 ? "Standard 30 days" : `${days} days`})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="address" optional>Billing Address</Label>
            <Input
              id="address"
              placeholder="Plot 14, Industrial Area, Sector I-9, Islamabad"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function CreateClientModal({
  isOpen,
  onClose,
  onSuccess,
  clientToEdit,
}: CreateClientModalProps) {
  if (!isOpen) return null;
  return (
    <CreateClientModalContent
      key={clientToEdit?.id || "new-client"}
      onClose={onClose}
      onSuccess={onSuccess}
      clientToEdit={clientToEdit}
    />
  );
}
