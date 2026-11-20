import * as React from "react";
import { cn } from "@/lib/utils";

export interface BandProps extends React.HTMLAttributes<HTMLElement> {
  tone?: "white" | "fog";
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  as?: React.ElementType;
}

export function Band({
  tone = "white",
  children,
  className = "",
  containerClassName = "",
  as: Component = "section",
  style,
  ...props
}: BandProps) {
  return (
    <Component
      className={cn(
        tone === "fog" ? "bg-fog" : "bg-white",
        "w-full py-[clamp(48px,6vw,96px)] max-md:py-12 overflow-x-clip",
        className
      )}
      style={style}
      {...props}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-[1440px] px-[clamp(16px,4vw,48px)] box-border min-w-0",
          containerClassName
        )}
        style={{
          paddingLeft: "clamp(16px, 4vw, 48px)",
          paddingRight: "clamp(16px, 4vw, 48px)",
        }}
      >
        {children}
      </div>
    </Component>
  );
}
