import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink disabled:pointer-events-none disabled:bg-fog disabled:text-ink-3 select-none cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white hover:bg-ink-hover active:scale-[0.98]",
        secondary:
          "bg-fog text-ink hover:bg-fog-2 border-0 active:scale-[0.98]",
        ghost:
          "bg-transparent text-ink-2 hover:bg-fog hover:text-ink active:scale-[0.98]",
        link:
          "bg-transparent text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink p-0 h-auto",
        destructive:
          "bg-ember-ink text-white hover:bg-ember active:scale-[0.98]",
      },
      size: {
        default: "h-12 px-7 text-[17px]",
        compact: "h-9 px-[18px] text-[15px]",
        hero: "h-14 px-8 text-[18px]",
        icon: "h-9 w-9 p-0",
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
