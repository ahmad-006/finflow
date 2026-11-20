import * as React from "react";

export function CashFlowDaySkeleton() {
  return (
    <div className="w-full bg-white text-ink animate-pulse" aria-hidden="true">
      {/* Top Breadcrumb and Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
        <div>
          <div className="h-3 w-48 bg-fog rounded-full mb-3" />
          <div className="h-9 w-64 bg-fog rounded-[10px]" />
          <div className="h-4 w-80 bg-fog rounded-[6px] mt-3" />
        </div>
        <div className="flex items-center gap-2 self-start md:self-end">
          <div className="h-9 w-28 bg-fog rounded-full" />
          <div className="h-9 w-28 bg-fog rounded-full" />
          <div className="h-9 w-36 bg-fog rounded-full" />
        </div>
      </div>

      {/* 5-Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 py-6 border-y border-line my-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-28 bg-fog rounded-full" />
            <div className="h-7 w-36 bg-fog rounded-[6px]" />
            <div className="h-3 w-24 bg-fog rounded-full" />
          </div>
        ))}
      </div>

      {/* Inflows Section Placeholder */}
      <div className="my-8">
        <div className="h-6 w-48 bg-fog rounded-full mb-4" />
        <div className="border border-line rounded-[12px] p-4 flex flex-col gap-3">
          <div className="h-8 w-full bg-fog/60 rounded" />
          <div className="h-8 w-full bg-fog/40 rounded" />
          <div className="h-8 w-full bg-fog/20 rounded" />
        </div>
      </div>

      {/* Outflows Section Placeholder */}
      <div className="my-8">
        <div className="h-6 w-48 bg-fog rounded-full mb-4" />
        <div className="border border-line rounded-[12px] p-4 flex flex-col gap-3">
          <div className="h-8 w-full bg-fog/60 rounded" />
          <div className="h-8 w-full bg-fog/40 rounded" />
          <div className="h-8 w-full bg-fog/20 rounded" />
        </div>
      </div>
    </div>
  );
}
