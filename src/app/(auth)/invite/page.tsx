import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { AcceptInvitationForm } from "@/components/auth/AcceptInvitationForm";

export default function InvitePage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-white px-6 py-10 overflow-hidden font-sans">
      {/* Top Left Wordmark */}
      <div className="w-full max-w-[1200px] mx-auto">
        <Link
          href="/"
          className="inline-flex items-center hover:opacity-80 transition-opacity min-h-[44px]"
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

      {/* Centered Single Column Auth Form (Template E: 440px wide) */}
      <div className="w-full max-w-[440px] mx-auto my-auto py-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-ink text-center leading-tight">
          Join workspace
        </h1>
        <p className="text-[17px] text-ink-2 text-center mt-2 mb-8">
          Accept your team invitation to collaborate on FinFlow.
        </p>

        <Suspense fallback={<div className="h-48 animate-pulse bg-fog rounded-[14px]" />}>
          <AcceptInvitationForm />
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
