import * as React from "react";

export function CalendarSkeleton() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Header & Controls Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-fog rounded" />
          <div className="h-4 w-72 bg-fog-2 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-fog rounded-full" />
          <div className="h-9 w-44 bg-fog rounded-full" />
        </div>
      </div>

      {/* 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Left Sidebar Skeleton */}
        <aside className="space-y-6 hidden lg:block">
          <div className="grid grid-cols-2 gap-2">
            <div className="h-9 bg-fog rounded-full" />
            <div className="h-9 bg-fog rounded-full" />
          </div>

          <div className="p-4 border border-line rounded bg-white space-y-3">
            <div className="h-4 w-24 bg-fog rounded" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-7 w-full bg-fog rounded" />
              ))}
            </div>
          </div>

          <div className="p-4 border border-line rounded bg-white space-y-3">
            <div className="h-4 w-32 bg-fog rounded" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 w-full bg-fog rounded" />
              ))}
            </div>
          </div>
        </aside>

        {/* Right Main Grid Skeleton */}
        <div className="space-y-6 min-w-0">
          {/* KPI Strip Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-fog/40 rounded border border-line">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 bg-fog-2 rounded" />
                <div className="h-6 w-28 bg-fog rounded" />
              </div>
            ))}
          </div>

          {/* 7-Day Header Skeleton */}
          <div className="grid grid-cols-7 border border-line bg-fog/20 divide-x divide-line text-center py-2.5">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="h-4 w-10 mx-auto bg-fog rounded" />
            ))}
          </div>

          {/* Month Grid Skeleton (5 rows x 7 cols) */}
          <div className="border border-line divide-y divide-line">
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="grid grid-cols-7 divide-x divide-line min-h-[125px]"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                  <div key={col} className="p-2 space-y-2">
                    <div className="h-4 w-5 bg-fog rounded" />
                    <div className="h-3 w-16 bg-fog-2 rounded" />
                    <div className="h-5 w-full bg-fog/60 rounded" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
