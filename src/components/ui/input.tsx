import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, isInvalid, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-[6px] border bg-surface px-3 py-2 text-[14px] text-ink placeholder:text-ink-3 transition-colors",
          "border-line-strong focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
          "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3",
          isInvalid && "border-negative focus-visible:outline-negative",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
