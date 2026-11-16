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
            "flex h-[52px] w-full appearance-none rounded-[14px] bg-fog border-0 px-[18px] pr-10 text-[17px] text-ink transition-colors cursor-pointer outline-none",
            "focus:bg-white focus:outline-2 focus:outline-ink focus:outline-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isInvalid && "bg-ember-tint text-ember-ink focus:outline-ember-ink",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = "Select";
