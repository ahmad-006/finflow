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
    <header className={cn("mb-6 flex flex-col gap-2 select-none", className)}>
      {breadcrumb && (
        <div className="text-xs text-zinc-500 font-sans">{breadcrumb}</div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          {eyebrow && (
            <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-zinc-500 font-sans">
              {eyebrow}
            </span>
          )}
          <h1 className="text-lg sm:text-xl font-semibold tracking-[-0.015em] text-gray-900 font-sans">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-zinc-600 font-sans">
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
