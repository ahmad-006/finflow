import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "pb-6 mb-8 border-b border-line flex flex-col gap-2 select-none",
        className
      )}
    >
      {breadcrumb && (
        <div className="text-xs text-ink-3 font-sans">{breadcrumb}</div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          {eyebrow && (
            <span className="text-[11px] font-mono tracking-[0.08em] uppercase text-ink-3">
              {eyebrow}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-ink font-sans">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-ink-2 font-sans mt-0.5">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-col max-sm:[&>*]:w-full">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
