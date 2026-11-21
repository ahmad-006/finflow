import * as React from "react";
import { PageHeader } from "@/components/shell/PageHeader";

export function SettingsSkeleton() {
  return (
    <div
      className="w-full text-ink select-none font-sans"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <PageHeader
        eyebrow="Configuration & Preferences"
        title="Settings"
        description="Manage workspace parameters, personal profile, and authentication credentials."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Column Skeleton */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          <div className="flex lg:flex-col gap-1.5 p-1.5 bg-fog rounded-[16px] border border-line">
            <div className="h-14 w-full bg-white rounded-[12px] animate-pulse" />
            <div className="h-14 w-full bg-fog rounded-[12px] animate-pulse" />
            <div className="h-14 w-full bg-fog rounded-[12px] animate-pulse" />
          </div>

          <div className="hidden lg:flex flex-col gap-4 p-5 rounded-[16px] border border-line bg-fog/20 animate-pulse">
            <div className="h-4 w-28 bg-fog rounded-full" />
            <div className="h-4 w-full bg-fog rounded-full" />
            <div className="h-4 w-3/4 bg-fog rounded-full" />
            <div className="h-4 w-1/2 bg-fog rounded-full" />
          </div>
        </aside>

        {/* Content Column Skeleton */}
        <main className="lg:col-span-8 xl:col-span-9 w-full">
          <div className="rounded-[16px] border border-line bg-white p-6 sm:p-8 animate-pulse">
            <div className="mb-8 pb-5 border-b border-line">
              <div className="h-6 w-44 bg-fog rounded-full mb-2" />
              <div className="h-4 w-80 max-w-full bg-fog rounded-full" />
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-32 bg-fog rounded-full" />
                <div className="h-[44px] w-full bg-fog rounded-[12px]" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-4 w-28 bg-fog rounded-full" />
                <div className="h-[52px] w-full bg-fog/50 rounded-[12px]" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-4 w-36 bg-fog rounded-full" />
                <div className="h-[44px] w-full bg-fog rounded-[12px]" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="h-4 w-40 bg-fog rounded-full" />
                <div className="h-[44px] w-full bg-fog rounded-[12px]" />
              </div>

              <div className="pt-6 border-t border-line flex justify-end">
                <div className="h-11 w-48 bg-fog rounded-full" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
