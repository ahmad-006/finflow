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
            "flex h-[38px] w-full appearance-none rounded-md bg-white border border-zinc-300 px-3 pr-9 text-sm text-gray-900 transition-colors cursor-pointer",
            "focus:outline-none focus:border-zinc-900",
            "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 disabled:opacity-60",
            isInvalid && "border-red-700 text-red-700 focus:border-red-700",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = "Select";
