import * as React from "react";

export function ExpenseDirectorySkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse select-none" aria-busy="true" aria-label="Loading expenses">
      {/* 1. Header & Statement Sentence Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-40 rounded-full bg-fog" />
          <div className="h-8 w-64 rounded-[10px] bg-fog" />
          <div className="h-4 w-96 max-w-full rounded-full bg-fog" />
        </div>
        <div className="h-10 w-36 rounded-full bg-fog self-start sm:self-auto shrink-0" />
      </div>

      {/* 2. 4 KPI Figures Strip Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-y border-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-2">
            <div className="h-3 w-28 rounded-full bg-fog" />
            <div className="h-7 w-36 rounded-[8px] bg-fog" />
            <div className="h-2.5 w-24 rounded-full bg-fog" />
          </div>
        ))}
      </div>

      {/* 3. Filter Toolbar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-fog shrink-0" />
          ))}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="h-9 w-36 rounded-[10px] bg-fog" />
          <div className="h-9 w-36 rounded-[10px] bg-fog" />
          <div className="h-9 w-48 sm:w-60 rounded-[10px] bg-fog" />
        </div>
      </div>

      {/* 4. Table Skeleton */}
      <div className="border border-line rounded-[10px] overflow-hidden bg-white">
        {/* Header row */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-fog/40 border-b border-line text-xs font-mono">
          <div className="col-span-2 h-3 rounded-full bg-fog" />
          <div className="col-span-3 h-3 rounded-full bg-fog" />
          <div className="col-span-2 h-3 rounded-full bg-fog" />
          <div className="col-span-1 h-3 rounded-full bg-fog" />
          <div className="col-span-2 h-3 rounded-full bg-fog" />
          <div className="col-span-1 h-3 rounded-full bg-fog" />
          <div className="col-span-1 h-3 rounded-full bg-fog justify-self-end" />
        </div>

        {/* Row skeletons */}
        <div className="divide-y divide-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-4 flex flex-col lg:grid lg:grid-cols-12 gap-3 items-start lg:items-center"
            >
              <div className="col-span-2 h-4 w-24 rounded-full bg-fog" />
              <div className="col-span-3 h-4 w-40 rounded-full bg-fog" />
              <div className="col-span-2 h-5 w-20 rounded-full bg-fog" />
              <div className="col-span-1 h-4 w-16 rounded-full bg-fog" />
              <div className="col-span-2 h-4 w-24 rounded-full bg-fog" />
              <div className="col-span-1 h-5 w-16 rounded-full bg-fog" />
              <div className="col-span-1 h-7 w-20 rounded-full bg-fog justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
