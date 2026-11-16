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
          "w-full h-[52px] px-[18px] rounded-[14px] bg-fog border-0 text-[17px] text-ink placeholder:text-ink-3 transition-colors outline-none",
          "focus:bg-white focus:outline-2 focus:outline-ink focus:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isInvalid && "bg-ember-tint text-ember-ink focus:outline-ember-ink",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
