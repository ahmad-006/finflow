import * as React from "react";

export function ClientDirectorySkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse select-none">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-36 rounded-full bg-fog" />
          <div className="h-8 w-44 rounded-[10px] bg-fog" />
          <div className="h-4 w-80 rounded-full bg-fog" />
        </div>
        <div className="h-12 w-32 rounded-full bg-fog self-start sm:self-auto shrink-0" />
      </div>

      {/* 2. A/R Aging Bar Skeleton */}
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

      {/* 3. Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0 shrink-0">
          <div className="h-7 w-24 rounded-full bg-fog shrink-0" />
          <div className="h-7 w-20 rounded-full bg-fog shrink-0" />
          <div className="h-7 w-20 rounded-full bg-fog shrink-0" />
          <div className="h-7 w-20 rounded-full bg-fog shrink-0" />
        </div>
        <div className="h-10 w-full sm:w-72 rounded-[10px] bg-fog" />
      </div>

      {/* 4. Directory Skeleton: Responsive Mobile Stack + Desktop Table */}
      {/* Mobile Card Skeleton */}
      <div className="lg:hidden divide-y divide-line/60 border-t border-b border-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="py-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-4 w-36 rounded-full bg-fog" />
                <div className="h-3 w-48 rounded-full bg-fog" />
              </div>
              <div className="h-5 w-16 rounded-full bg-fog" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 rounded-full bg-fog" />
                <div className="h-4 w-20 rounded-full bg-fog" />
              </div>
              <div className="h-4 w-24 rounded-full bg-fog" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block overflow-x-auto border-t border-b border-line">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.06em] text-ink-3">
              <th className="py-3.5 pl-2 pr-4">Client Profile</th>
              <th className="py-3.5 px-4">Terms</th>
              <th className="py-3.5 px-4">Payment Latency</th>
              <th className="py-3.5 px-4 text-right">Outstanding</th>
              <th className="py-3.5 px-4 text-right">Overdue</th>
              <th className="py-3.5 px-4 text-center">Credit Risk</th>
              <th className="py-3.5 pl-4 pr-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="py-4 pl-2 pr-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-40 rounded-full bg-fog" />
                    <div className="h-3 w-28 rounded-full bg-fog" />
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 w-12 rounded-full bg-fog" />
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    <div className="h-3.5 w-20 rounded-full bg-fog" />
                    <div className="h-2.5 w-14 rounded-full bg-fog" />
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="h-4 w-24 rounded-full bg-fog ml-auto" />
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="h-4 w-20 rounded-full bg-fog ml-auto" />
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="h-5 w-16 rounded-full bg-fog mx-auto" />
                </td>
                <td className="py-4 pl-4 pr-2 text-right">
                  <div className="h-7 w-20 rounded-full bg-fog ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
