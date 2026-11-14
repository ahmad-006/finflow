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
          "w-full h-[38px] px-3 rounded-md bg-white border border-zinc-300 text-sm text-gray-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors",
          "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 disabled:opacity-60",
          isInvalid && "border-red-700 text-red-700 focus:border-red-700",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
