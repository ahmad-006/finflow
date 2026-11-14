import * as React from "react";
import { cn } from "@/lib/utils";

export interface BandProps extends React.HTMLAttributes<HTMLElement> {
  tone?: "white" | "fog";
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function Band({
  tone = "white",
  children,
  className = "",
  as: Component = "section",
  ...props
}: BandProps) {
  return (
    <Component
      className={cn(
        tone === "fog" ? "bg-fog" : "bg-white",
        "py-24 max-md:py-16",
        className
      )}
      {...props}
    >
      <div className="mx-auto max-w-[1200px] px-[var(--gutter)]">{children}</div>
    </Component>
  );
}
