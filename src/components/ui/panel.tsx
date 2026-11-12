import * as React from "react";
import { cn } from "@/lib/utils";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

export function Panel({
  as: Component = "div",
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <Component
      className={cn(
        "bg-surface border border-line rounded-[8px] p-6 max-sm:p-4 text-ink overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
