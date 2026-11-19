"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { createClientAction } from "@/modules/clients/actions";
import { formatUserError } from "@/lib/errors";
import type { ClientRecord } from "@/modules/clients/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newClient: ClientRecord) => void;
}

export function CreateClientModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateClientModalProps) {
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

  // Reset form when modal closes or opens
  React.useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setFieldErrors({});
      setFormData({
        clientName: "",
        email: "",
        phone: "",
        address: "",
        paymentTermsDays: "30",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        setErrorMessage(formatUserError(err, "Unable to create client. Please check your connection."));
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface: Strict Inkline Style */}
      <div className="relative w-full max-w-[540px] rounded-[18px] bg-white border border-line p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-ink-3">
              Accounts Receivable
            </span>
            <h2 id="modal-title" className="text-xl font-semibold tracking-[-0.01em] text-ink">
              Add New Client
            </h2>
            <p className="text-sm text-ink-2 mt-1">
              Create a client account to issue multi-currency invoices and track payment latency.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-fog transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-[12px] bg-ember-tint px-4 py-3 text-sm text-ember-ink border border-ember-ink/20">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-line">
            <Button
              type="button"
              variant="ghost"
              size="compact"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="compact"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
