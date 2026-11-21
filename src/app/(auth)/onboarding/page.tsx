import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { OnboardingCompanyForm } from "@/components/auth/OnboardingCompanyForm";

export const metadata = {
  title: "Company Setup — FinFlow",
  description: "Initialize your company workspace to unlock cash flow intelligence.",
};

export default function OnboardingPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-white px-6 py-10 overflow-hidden font-sans">
      {/* Top Wordmark Header */}
      <div className="w-full max-w-[1200px] mx-auto">
        <Link
          href="/"
          className="inline-flex items-center hover:opacity-80 transition-opacity min-h-[44px]"
          aria-label="FinFlow home"
        >
          <Image
            src="/finflow-logo-on-white.png"
            alt="FinFlow"
            width={131}
            height={30}
            className="h-7 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      {/* Centered Single Column Layout */}
      <div className="w-full max-w-[440px] mx-auto my-auto py-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-ink text-center leading-tight">
          Company setup
        </h1>
        <p className="text-[17px] text-ink-2 text-center mt-2 mb-8">
          Initialize your company workspace to unlock cash flow intelligence.
        </p>

        <Suspense
          fallback={
            <div className="flex flex-col gap-6 animate-pulse">
              <div className="h-10 bg-fog rounded-[14px]" />
              <div className="h-14 bg-fog rounded-[14px]" />
              <div className="h-14 bg-fog rounded-[14px]" />
              <div className="h-14 bg-fog rounded-[14px]" />
              <div className="h-12 bg-fog rounded-full" />
            </div>
          }
        >
          <OnboardingCompanyForm />
        </Suspense>
      </div>

      {/* Static line along the bottom 26vh, aria-hidden, no ruler, no buffer */}
      <div
        className="w-full max-w-4xl mx-auto h-[26vh] max-h-48 opacity-30 pointer-events-none select-none"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1000 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0 90 C150 90 200 40 350 40 C500 40 550 95 700 95 C800 95 850 50 1000 45"
            stroke="var(--ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
