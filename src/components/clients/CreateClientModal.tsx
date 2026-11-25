"use client";

import * as React from "react";
import { createClientAction } from "@/modules/clients/actions";
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
  onSuccess?: (newClient: ClientRecord) => void;
}

const CREATE_CLIENT_FORM_ID = "create-client-modal-form";

function CreateClientModalContent({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: (newClient: ClientRecord) => void;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const [formData, setFormData] = React.useState({
    clientName: "",
    email: "",
    phone: "",
    address: "",
    paymentTermsDays: "30",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await createClientAction(formData);

        if (!result.success) {
          setErrorMessage(result.error || "Failed to create client.");
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
          formatUserError(err, "Unable to create client. Please check your connection.")
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
      title="Add New Client"
      description="Create a client account to issue multi-currency invoices and track payment latency."
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
            form={CREATE_CLIENT_FORM_ID}
            variant="primary"
            size="default"
            isLoading={isPending}
            className="min-h-[44px] h-11 px-6 rounded-full text-sm"
          >
            Save Client
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

        <form id={CREATE_CLIENT_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
                <option value="7">Net 7 (7 days)</option>
                <option value="15">Net 15 (15 days)</option>
                <option value="30">Net 30 (Standard 30 days)</option>
                <option value="45">Net 45 (45 days)</option>
                <option value="60">Net 60 (60 days)</option>
                <option value="90">Net 90 (90 days)</option>
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
}: CreateClientModalProps) {
  if (!isOpen) return null;
  return <CreateClientModalContent onClose={onClose} onSuccess={onSuccess} />;
}
