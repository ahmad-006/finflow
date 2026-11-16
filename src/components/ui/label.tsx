import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  optional?: boolean;
}

export function Label({
  className,
  children,
  optional,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        "block text-[14px] font-medium text-ink-2 mb-2",
        className
      )}
      {...props}
    >
      {children}
      {optional && <span className="ml-1 text-[13px] font-normal text-ink-3">(optional)</span>}
    </label>
  );
}
