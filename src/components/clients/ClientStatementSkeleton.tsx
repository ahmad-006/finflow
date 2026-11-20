import * as React from "react";

export function ClientStatementSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse select-none">
      {/* 1. Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-28 rounded-full bg-fog" />
        <span className="text-ink-3">/</span>
        <div className="h-3 w-36 rounded-full bg-fog" />
      </div>

      {/* 2. Client Profile Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-line">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-60 rounded-[10px] bg-fog" />
            <div className="h-5 w-20 rounded-full bg-fog" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-3 w-36 rounded-full bg-fog" />
            <div className="h-3 w-28 rounded-full bg-fog" />
            <div className="h-3 w-40 rounded-full bg-fog" />
          </div>
        </div>
        <div className="h-11 w-36 rounded-full bg-fog shrink-0" />
      </div>

      {/* 3. 5 KPI Summary Tiles Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex flex-col gap-2 p-4 rounded-[14px] bg-fog ${
              i === 4 ? "col-span-2 sm:col-span-1 lg:col-span-1" : ""
            }`}
          >
            <div className="h-3 w-20 rounded-full bg-fog-2" />
            <div className="h-6 w-28 rounded-[6px] bg-fog-2" />
            <div className="h-2.5 w-16 rounded-full bg-fog-2" />
          </div>
        ))}
      </div>

      {/* 4. Ledger Table Skeleton */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="h-5 w-52 rounded-[8px] bg-fog" />
            <div className="h-3 w-72 rounded-full bg-fog" />
          </div>
          <div className="h-3 w-16 rounded-full bg-fog" />
        </div>

        {/* Mobile Ledger Cards Skeleton */}
        <div className="lg:hidden divide-y divide-line/60 border-t border-b border-line">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded-full bg-fog" />
                <div className="h-5 w-16 rounded-full bg-fog" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-32 rounded-full bg-fog" />
                <div className="h-4 w-20 rounded-full bg-fog" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table Skeleton */}
        <div className="hidden lg:block overflow-x-auto border-t border-b border-line">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-medium uppercase tracking-[0.06em] text-ink-3">
                <th className="py-3.5 pl-2 pr-4">Invoice</th>
                <th className="py-3.5 px-4">Issued</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 pl-4 pr-2 text-right">Turnaround / Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3.5 pl-2 pr-4">
                    <div className="h-4 w-28 rounded-full bg-fog" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 w-20 rounded-full bg-fog" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-3.5 w-20 rounded-full bg-fog" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-4 w-20 rounded-full bg-fog ml-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-4 w-20 rounded-full bg-fog ml-auto" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="h-5 w-14 rounded-full bg-fog mx-auto" />
                  </td>
                  <td className="py-3.5 pl-4 pr-2 text-right">
                    <div className="h-4 w-24 rounded-full bg-fog ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
