import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-zinc-900 text-white tracking-tight hover:bg-zinc-800 active:bg-zinc-950",
        secondary:
          "bg-white border border-zinc-300 text-gray-900 hover:border-zinc-900 hover:bg-zinc-50",
        ghost:
          "bg-white border border-zinc-300 text-gray-900 hover:border-zinc-900 hover:bg-zinc-50",
        action:
          "bg-white border border-zinc-200 text-[11px] text-zinc-700 hover:border-zinc-900 hover:text-gray-900",
        destructive:
          "bg-red-700 text-white hover:bg-red-800 active:bg-red-900",
        link:
          "bg-transparent text-zinc-600 hover:text-gray-900 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-[38px] px-4",
        secondary: "h-[38px] px-3.5",
        compact: "h-8 px-3",
        action: "h-7 px-2.5 text-[11px]",
        hero: "h-11 px-6 text-sm",
        icon: "h-[38px] w-[38px] p-0",
      },
    },
    compoundVariants: [
      {
        variant: "secondary",
        size: "default",
        className: "px-3.5",
      },
      {
        variant: "action",
        size: "default",
        className: "h-7 px-2.5 text-[11px]",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
