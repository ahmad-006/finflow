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
        "block text-xs font-medium text-zinc-700 mb-1.5",
        className
      )}
      {...props}
    >
      {children}
      {optional && <span className="ml-1 text-[11px] font-normal text-zinc-400">(optional)</span>}
    </label>
  );
}
