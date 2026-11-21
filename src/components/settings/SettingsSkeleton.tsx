import * as React from "react";
import { PageHeader } from "@/components/shell/PageHeader";

export function SettingsSkeleton() {
  return (
    <div
      className="w-full text-ink select-none"
      aria-busy="true"
      aria-label="Loading settings"
    >
      {/* 1. Header with exact dimensions */}
      <PageHeader
        title="Settings"
        description="Manage company parameters, profile details, and account security."
      />

      {/* 2. Tab Navigation Strip */}
      <div className="flex items-center gap-2 border-b border-line pb-4 mb-8 overflow-x-auto no-scrollbar">
        <div className="h-11 w-28 rounded-full bg-fog min-h-[44px] animate-pulse" />
        <div className="h-11 w-28 rounded-full bg-fog min-h-[44px] animate-pulse" />
        <div className="h-11 w-28 rounded-full bg-fog min-h-[44px] animate-pulse" />
      </div>

      {/* 3. Settings Form Panel Skeleton */}
      <div className="rounded-[14px] border border-line bg-white p-6 sm:p-8 max-w-3xl animate-pulse">
        <div className="flex flex-col gap-6">
          {/* Field 1 */}
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 bg-fog rounded-full" />
            <div className="h-[52px] w-full bg-fog rounded-[14px]" />
          </div>

          {/* Field 2 */}
          <div className="flex flex-col gap-2">
            <div className="h-4 w-28 bg-fog rounded-full" />
            <div className="h-[52px] w-full bg-fog/70 rounded-[14px]" />
            <div className="h-3.5 w-80 max-w-full bg-fog rounded-full mt-1" />
          </div>

          {/* Field 3 */}
          <div className="flex flex-col gap-2">
            <div className="h-4 w-36 bg-fog rounded-full" />
            <div className="h-[52px] w-full bg-fog rounded-[14px]" />
          </div>

          {/* Field 4 */}
          <div className="flex flex-col gap-2">
            <div className="h-4 w-40 bg-fog rounded-full" />
            <div className="h-[52px] w-full bg-fog rounded-[14px]" />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <div className="h-12 w-52 bg-fog rounded-full min-h-[44px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
