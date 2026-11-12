import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-[15px] font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon-ink disabled:pointer-events-none disabled:bg-sunken disabled:text-ink-3 disabled:border-transparent select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white hover:bg-ink-hover active:bg-ink-hover border-transparent",
        secondary:
          "bg-transparent text-ink border border-line-strong hover:bg-sunken active:bg-sunken",
        ghost:
          "bg-transparent text-ink-2 hover:bg-sunken active:bg-sunken border-transparent",
        destructive:
          "bg-ebb text-white hover:opacity-90 active:opacity-90 border-transparent",
        link:
          "bg-transparent text-ink underline underline-offset-4 decoration-line-strong hover:decoration-lagoon p-0 h-auto border-transparent",
      },
      size: {
        default: "h-11 px-5 py-2",
        compact: "h-9 px-3.5 text-[14px]",
        icon: "h-11 w-11 p-0",
      },
    },
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
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
