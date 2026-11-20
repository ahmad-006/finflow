import * as React from "react";

export function ClientDirectorySkeleton() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-pulse select-none">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-36 rounded-full bg-fog" />
          <div className="h-8 w-44 rounded-[10px] bg-fog" />
          <div className="h-4 w-80 rounded-full bg-fog" />
        </div>
        <div className="h-11 w-32 rounded-full bg-fog self-start sm:self-auto shrink-0" />
      </div>

      {/* 2. Client KPI Strip Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 py-4 border-y border-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-2">
            <div className="h-2.5 w-24 rounded-full bg-fog" />
            <div className="h-7 w-32 rounded-[8px] bg-fog" />
            <div className="h-2.5 w-28 rounded-full bg-fog" />
          </div>
        ))}
      </div>

      {/* 3. A/R Aging Bar Skeleton */}
      <div className="flex flex-col gap-5 py-6 border-b border-line">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-28 rounded-full bg-fog" />
            <div className="h-5 w-48 rounded-[8px] bg-fog" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1">
              <div className="h-2.5 w-24 rounded-full bg-fog" />
              <div className="h-5 w-32 rounded-[8px] bg-fog" />
            </div>
            <div className="h-8 w-[1px] bg-line" />
            <div className="flex flex-col items-end gap-1">
              <div className="h-2.5 w-28 rounded-full bg-fog" />
              <div className="h-5 w-32 rounded-[8px] bg-fog" />
            </div>
          </div>
        </div>

        {/* Track */}
        <div className="h-3 w-full rounded-full bg-fog" />

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-2.5 w-16 rounded-full bg-fog" />
              <div className="h-4 w-24 rounded-full bg-fog" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 shrink-0">
          <div className="h-11 w-24 rounded-full bg-fog shrink-0" />
          <div className="h-11 w-20 rounded-full bg-fog shrink-0" />
          <div className="h-11 w-20 rounded-full bg-fog shrink-0" />
          <div className="h-11 w-20 rounded-full bg-fog shrink-0" />
        </div>
        <div className="h-11 w-full sm:w-72 rounded-[10px] bg-fog" />
      </div>

      {/* 5. Directory Grid Skeleton: 3-column desktop to 1-column mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col justify-between p-4 rounded-[10px] border border-line bg-white gap-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-4 w-36 rounded-full bg-fog" />
                <div className="h-3 w-48 rounded-full bg-fog" />
              </div>
              <div className="h-5 w-16 rounded-full bg-fog" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-line/60">
              <div className="h-4 w-16 rounded-full bg-fog" />
              <div className="h-4 w-20 rounded-full bg-fog" />
            </div>

            <div className="h-12 w-full rounded-[8px] bg-fog/60" />

            <div className="flex items-center gap-2 pt-1 border-t border-line/60">
              <div className="h-11 flex-1 rounded-full bg-fog" />
              <div className="h-11 w-11 rounded-full bg-fog shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
