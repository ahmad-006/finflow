"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-[460px]",
  md: "max-w-[540px]",
  lg: "max-w-[740px]",
  xl: "max-w-[920px]",
};

const EMPTY_STACK: readonly string[] = [];
const emptySubscribe = () => () => {};

const openModalStack: string[] = [];
let modalStackSnapshot: readonly string[] = EMPTY_STACK;
const stackListeners = new Set<() => void>();

let bodyScrollLockCount = 0;
let previousBodyOverflow: string | null = null;

function notifyStackListeners() {
  for (const listener of stackListeners) {
    listener();
  }
}

function subscribeModalStack(listener: () => void) {
  stackListeners.add(listener);
  return () => {
    stackListeners.delete(listener);
  };
}

function getModalStackSnapshot(): readonly string[] {
  return modalStackSnapshot;
}

function getServerModalStackSnapshot(): readonly string[] {
  return EMPTY_STACK;
}

function pushModalToStack(id: string) {
  if (!openModalStack.includes(id)) {
    openModalStack.push(id);
    modalStackSnapshot = [...openModalStack];
    notifyStackListeners();
  }
}

function removeModalFromStack(id: string) {
  const index = openModalStack.indexOf(id);
  if (index !== -1) {
    openModalStack.splice(index, 1);
    modalStackSnapshot = [...openModalStack];
    notifyStackListeners();
  }
}

export function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyScrollLockCount += 1;
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow ?? "";
    previousBodyOverflow = null;
  }
}

export interface ModalBackdropProps
  extends React.HTMLAttributes<HTMLDivElement> {
  onClick?: () => void;
}

export function ModalBackdrop({
  className,
  ...props
}: ModalBackdropProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 bg-ink/30 backdrop-blur-md transition-opacity",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  description,
  size = "md",
  footer,
  closeOnBackdrop = true,
  closeOnEscape = true,
  preventClose = false,
  className,
  bodyClassName,
  children,
}: ModalProps) {
  const modalId = React.useId();
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-description`;

  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const stack = React.useSyncExternalStore(
    subscribeModalStack,
    getModalStackSnapshot,
    getServerModalStackSnapshot
  );

  React.useEffect(() => {
    if (!isOpen) return;

    pushModalToStack(modalId);
    lockBodyScroll();

    return () => {
      unlockBodyScroll();
      removeModalFromStack(modalId);
    };
  }, [isOpen, modalId]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const topId = openModalStack[openModalStack.length - 1];
      if (topId !== modalId) return;
      if (closeOnEscape && !preventClose) {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, modalId, closeOnEscape, preventClose, onClose]);

  if (!isOpen || !isClient) {
    return null;
  }

  const stackIndex = stack.indexOf(modalId);
  const effectiveIndex = stackIndex >= 0 ? stackIndex : stack.length;
  const zIndex = 50 + effectiveIndex * 10;

  const handleBackdropClick = () => {
    if (closeOnBackdrop && !preventClose) {
      onClose();
    }
  };

  const handleCloseClick = () => {
    if (!preventClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <ModalBackdrop onClick={handleBackdropClick} />

      <div
        className={cn(
          "relative z-10 w-full rounded-[18px] bg-white border border-line max-h-[90vh] flex flex-col overflow-hidden shadow-none",
          SIZE_CLASSES[size],
          className
        )}
      >
        <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-line flex items-start justify-between gap-4 shrink-0 bg-white">
          <div className="min-w-0">
            {eyebrow && (
              <span className="block text-[11px] font-medium tracking-[0.08em] uppercase text-ink-3 mb-0.5">
                {eyebrow}
              </span>
            )}
            <h2
              id={titleId}
              className="text-lg sm:text-xl font-sans font-semibold tracking-[-0.01em] text-ink"
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-xs sm:text-sm text-ink-2 mt-1">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleCloseClick}
            disabled={preventClose}
            aria-label="Close dialog"
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-fog transition-colors shrink-0 -mr-2 -mt-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={cn("flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-5", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="px-5 sm:px-7 py-4 border-t border-line bg-white flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  variant?: "danger" | "default";
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  errorMessage?: string | null;
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  eyebrow,
  description,
  variant = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isPending = false,
  errorMessage,
  children,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      eyebrow={eyebrow}
      size="sm"
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
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : "primary"}
            onClick={onConfirm}
            isLoading={isPending}
            className="min-h-[44px] h-11 px-6 rounded-full text-sm font-medium"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {description && (
          <p className="text-sm text-ink-2 leading-relaxed">{description}</p>
        )}
        {children}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-[10px] border border-ember/30 bg-ember-tint px-3.5 py-2.5 text-xs text-ember-ink">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
