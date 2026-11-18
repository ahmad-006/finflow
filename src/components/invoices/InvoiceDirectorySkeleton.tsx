import * as React from "react";

export function InvoiceDirectorySkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse select-none">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-36 rounded-full bg-fog" />
          <div className="h-8 w-48 rounded-[10px] bg-fog" />
          <div className="h-4 w-72 rounded-full bg-fog" />
        </div>
        <div className="h-11 w-36 rounded-full bg-fog self-start sm:self-auto shrink-0" />
      </div>

      {/* 2. KPI Strip Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-y border-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-2">
            <div className="h-3 w-20 rounded-full bg-fog" />
            <div className="h-7 w-32 rounded-[8px] bg-fog" />
            <div className="h-2.5 w-24 rounded-full bg-fog" />
          </div>
        ))}
      </div>

      {/* 3. Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-16 rounded-full bg-fog shrink-0" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 rounded-[8px] bg-fog" />
          <div className="h-9 w-48 sm:w-64 rounded-[8px] bg-fog" />
        </div>
      </div>

      {/* 4. Table / Card List Skeleton */}
      <div className="border border-line rounded-[10px] overflow-hidden">
        {/* Table header skeleton */}
        <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-3 bg-fog/40 border-b border-line">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 rounded-full bg-fog" />
          ))}
        </div>

        {/* Rows skeleton */}
        <div className="divide-y divide-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex flex-col md:grid md:grid-cols-7 gap-3 items-start md:items-center">
              <div className="h-4 w-24 rounded-full bg-fog" />
              <div className="h-4 w-32 rounded-full bg-fog" />
              <div className="h-3 w-20 rounded-full bg-fog" />
              <div className="h-3 w-20 rounded-full bg-fog" />
              <div className="h-4 w-24 rounded-full bg-fog" />
              <div className="h-5 w-16 rounded-full bg-fog" />
              <div className="h-7 w-16 rounded-full bg-fog justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
