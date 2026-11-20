import * as React from "react";

export function CashFlowSkeleton() {
  return (
    <div className="w-full bg-white text-ink animate-pulse" aria-hidden="true">
      {/* Header with breadcrumb, title, and action pills */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6">
        <div>
          <div className="h-3 w-40 bg-fog rounded-full mb-3" />
          <div className="h-10 w-72 bg-fog rounded-[10px]" />
          <div className="h-5 w-96 max-w-full bg-fog rounded-[6px] mt-4" />
        </div>
        <div className="flex items-center gap-3 self-start md:self-end">
          <div className="h-10 w-44 bg-fog rounded-full" />
          <div className="h-10 w-36 bg-fog rounded-full" />
        </div>
      </div>

      {/* 4-Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 py-8 border-y border-line my-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3.5 w-32 bg-fog rounded-full" />
            <div className="h-9 w-40 bg-fog rounded-[8px]" />
            <div className="h-3 w-28 bg-fog rounded-full" />
          </div>
        ))}
      </div>

      {/* Forecast Curve Card */}
      <div className="rounded-[16px] border border-line bg-white p-6 sm:p-8 my-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
          <div>
            <div className="h-5 w-52 bg-fog rounded-full" />
            <div className="h-3 w-64 bg-fog rounded-full mt-2" />
          </div>
          <div className="h-9 w-56 bg-fog rounded-full" />
        </div>

        {/* InkLine Canvas placeholder */}
        <div className="my-6 h-[250px] w-full bg-fog/60 rounded-[12px] flex items-end px-6 pb-6">
          <div className="w-full h-24 border-b border-line-strong border-dashed" />
        </div>

        {/* Ruler ticks placeholder */}
        <div className="h-10 w-full bg-fog/40 rounded-[8px] flex items-center justify-between px-2">
          {Array.from({ length: 31 }).map((_, i) => (
            <div
              key={i}
              className={`w-0.5 bg-line-strong ${i === 0 ? "h-6" : i % 7 === 0 ? "h-4" : "h-2"}`}
            />
          ))}
        </div>

        {/* Scrub inspection bar placeholder */}
        <div className="mt-6 p-4 rounded-[12px] bg-fog/50 border border-line flex flex-wrap items-center justify-between gap-4">
          <div className="h-4 w-36 bg-fog rounded-full" />
          <div className="h-4 w-48 bg-fog rounded-full" />
          <div className="h-4 w-28 bg-fog rounded-full" />
        </div>
      </div>

      {/* Waterfall & Ledger Table */}
      <div className="my-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="h-6 w-56 bg-fog rounded-[6px]" />
            <div className="h-3.5 w-72 bg-fog rounded-full mt-1.5" />
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-24 bg-fog rounded-full" />
            ))}
          </div>
        </div>

        {/* Table rows placeholder */}
        <div className="divide-y divide-line">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="py-4 flex items-center justify-between gap-4">
              <div className="h-4 w-28 bg-fog rounded-full" />
              <div className="h-4 w-32 bg-fog rounded-full hidden sm:block" />
              <div className="h-4 w-32 bg-fog rounded-full hidden md:block" />
              <div className="h-4 w-24 bg-fog rounded-full" />
              <div className="h-4 w-28 bg-fog rounded-full" />
              <div className="h-6 w-20 bg-fog rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Explanatory footer placeholder */}
      <div className="rounded-[16px] border border-line bg-fog/40 p-6 sm:p-8 mt-12">
        <div className="h-5 w-48 bg-fog rounded-full mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-16 bg-fog/70 rounded-[10px]" />
          <div className="h-16 bg-fog/70 rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}
