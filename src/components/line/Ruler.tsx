"use client";

import React, { useCallback } from "react";
import { formatDemoDate } from "@/lib/demo-forecast";

export interface RulerProps {
  days?: number;
  activeDay?: number;
  onSelectDay?: (day: number) => void;
  anchorDate?: Date;
  className?: string;
  ariaLabel?: string;
}

export function Ruler({
  days = 31,
  activeDay = 0,
  onSelectDay,
  anchorDate,
  className = "",
  ariaLabel = "30-day forecast timeline",
}: RulerProps) {
  const maxDay = days - 1;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!onSelectDay) return;
      let next = activeDay;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        next = Math.max(0, activeDay - 1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        next = Math.min(maxDay, activeDay + 1);
      } else if (e.key === "PageUp") {
        next = Math.min(maxDay, activeDay + 7);
      } else if (e.key === "PageDown") {
        next = Math.max(0, activeDay - 7);
      } else if (e.key === "Home") {
        next = 0;
      } else if (e.key === "End") {
        next = maxDay;
      } else {
        return;
      }
      e.preventDefault();
      onSelectDay(next);
    },
    [activeDay, maxDay, onSelectDay]
  );

  return (
    <div
      className={`relative w-full select-none pt-2 pb-6 ${className}`}
      role={onSelectDay ? "slider" : undefined}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={maxDay}
      aria-valuenow={activeDay}
      tabIndex={onSelectDay ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Ticks bar */}
      <div className="relative h-10 w-full">
        {Array.from({ length: days }).map((_, d) => {
          const isToday = d === 0;
          const isSeventh = d % 7 === 0;
          const leftPercent = (d / maxDay) * 100;

          // Tick heights per section 5.3:
          // Today: 22px tall, 2px --ink
          // Seventh day: 16px tall, stroke --line-strong
          // Ordinary day: 8px tall, stroke --line-strong
          let tickHeight = 8;
          let tickColor = "bg-[var(--line-strong)]";
          let tickWidth = 1;

          if (isToday) {
            tickHeight = 22;
            tickColor = "bg-[var(--ink)]";
            tickWidth = 2;
          } else if (isSeventh) {
            tickHeight = 16;
            tickColor = "bg-[var(--line-strong)]";
            tickWidth = 1.5;
          }

          return (
            <div
              key={d}
              onClick={() => onSelectDay?.(d)}
              className="group absolute top-0 flex flex-col items-center cursor-pointer"
              style={{ left: `${leftPercent}%`, transform: "translateX(-50%)" }}
            >
              <div
                style={{ height: `${tickHeight}px`, width: `${tickWidth}px` }}
                className={`${tickColor} transition-colors`}
              />

              {/* Labels */}
              {isToday && (
                <span className="absolute top-6 whitespace-nowrap text-[12px] font-medium text-[var(--ink)]">
                  Today
                </span>
              )}
              {!isToday && isSeventh && (
                <span className="absolute top-6 whitespace-nowrap text-[12px] font-normal text-[var(--ink-3)]">
                  {formatDemoDate(d, anchorDate)}
                </span>
              )}
            </div>
          );
        })}

        {/* Active Scrubber Indicator */}
        {onSelectDay && (
          <div
            className="pointer-events-none absolute top-0 flex flex-col items-center"
            style={{
              left: `${(activeDay / maxDay) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="h-6 w-[1.5px] bg-[var(--ink)]" />
            <div className="mt-[-4px] h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--ink)] shadow-[var(--shadow-float)]" />
          </div>
        )}
      </div>
    </div>
  );
}
