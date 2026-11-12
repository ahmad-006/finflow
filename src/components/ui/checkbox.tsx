import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onChange, id, label, disabled, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);
    const resolvedChecked = checked !== undefined ? checked : isChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) {
        setIsChecked(e.target.checked);
      }
      onChange?.(e);
    };

    return (
      <label
        htmlFor={id}
        className={cn(
          "inline-flex items-center gap-2 select-none cursor-pointer text-[14px] text-ink-2",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
      >
        <span className="relative flex items-center justify-center">
          <input
            type="checkbox"
            id={id}
            ref={ref}
            checked={resolvedChecked}
            disabled={disabled}
            onChange={handleChange}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-[3px] border border-line-strong bg-surface transition-colors",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-brand",
              resolvedChecked && "border-brand bg-brand text-white"
            )}
          >
            {resolvedChecked && (
              <Check className="h-3 w-3 text-white" strokeWidth={2} />
            )}
          </span>
        </span>
        {label && <span>{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
