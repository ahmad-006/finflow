import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isInvalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, isInvalid, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full appearance-none rounded-[6px] border bg-surface px-3 py-2 pr-9 text-[14px] text-ink transition-colors cursor-pointer",
            "border-line-strong focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
            "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3",
            isInvalid && "border-negative focus-visible:outline-negative",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-ink-3"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = "Select";
