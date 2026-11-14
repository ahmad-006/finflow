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
        "bg-white border border-zinc-200 rounded-md p-6 sm:p-8 text-gray-900 overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
