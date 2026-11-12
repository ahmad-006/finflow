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
          "flex h-11 w-full rounded-[10px] border bg-sheet px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 transition-colors",
          "border-line-strong focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon-ink",
          "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3",
          isInvalid && "border-ebb focus-visible:outline-ebb",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
