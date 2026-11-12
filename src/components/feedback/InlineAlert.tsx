import * as React from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InlineAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "negative" | "caution" | "brand" | "positive";
  title?: string;
  message?: React.ReactNode;
}

const variantStyles = {
  negative: "bg-negative-tint text-ink",
  caution: "bg-caution-tint text-ink",
  brand: "bg-brand-tint text-ink",
  positive: "bg-positive-tint text-ink",
};

const iconMap = {
  negative: AlertCircle,
  caution: AlertTriangle,
  brand: Info,
  positive: CheckCircle2,
};

const iconColors = {
  negative: "text-negative",
  caution: "text-caution",
  brand: "text-brand",
  positive: "text-positive",
};

export function InlineAlert({
  variant = "negative",
  title,
  message,
  children,
  className,
  ...props
}: InlineAlertProps) {
  const IconComponent = iconMap[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-[6px] px-4 py-3 text-[13px] leading-[18px]",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <IconComponent
        className={cn("h-4 w-4 shrink-0 mt-0.5", iconColors[variant])}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="flex-1">
        {title && <span className="font-semibold text-ink mr-1.5">{title}</span>}
        <span className="text-ink-2">{message || children}</span>
      </div>
    </div>
  );
}
