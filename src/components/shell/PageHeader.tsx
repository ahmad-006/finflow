import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex flex-col gap-2", className)}>
      {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[28px] leading-[36px] font-semibold text-ink">
            {title}
          </h1>
          {description && (
            <p className="text-[14px] leading-[20px] text-ink-2">
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
