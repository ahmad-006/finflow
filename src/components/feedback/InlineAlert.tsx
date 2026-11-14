import * as React from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InlineAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "negative" | "caution" | "brand" | "positive";
  title?: string;
  message?: React.ReactNode;
}

const variantStyles = {
  negative: "bg-ember-tint text-ink",
  caution: "bg-amber-tint text-ink",
  brand: "bg-fog text-ink",
  positive: "bg-moss-tint text-ink",
};

const iconMap = {
  negative: AlertCircle,
  caution: AlertTriangle,
  brand: Info,
  positive: CheckCircle2,
};

const iconColors = {
  negative: "text-ember-ink",
  caution: "text-amber",
  brand: "text-ink",
  positive: "text-moss",
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
        "flex items-start gap-3 rounded-[14px] px-5 py-4 text-[15px] leading-[22px]",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <IconComponent
        className={cn("h-5 w-5 shrink-0 mt-0.5", iconColors[variant])}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="flex-1">
        {title && <span className="font-semibold text-ink mr-2">{title}</span>}
        <span className="text-ink-2">{message || children}</span>
      </div>
    </div>
  );
}
