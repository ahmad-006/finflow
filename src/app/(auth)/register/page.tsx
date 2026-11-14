"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { registerAction } from "@/modules/auth/actions";

export default function RegisterPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [baseCurrency, setBaseCurrency] = React.useState("PKR");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Live password checklist validation
  const hasMinLength = password.length >= 8;
  const hasUpperAndLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasNumberAndSpecial = /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsPending(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // Ensure fullName meets server schema requirement if omitted
      if (!formData.get("fullName")) {
        const company = formData.get("companyName")?.toString().trim() || "Workspace";
        formData.set("fullName", `${company} Admin`);
      }

      const res = await registerAction(formData);

      if (res && typeof res === "object" && !res.success && res.error) {
        setError(res.error);
        setIsPending(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string; digest?: string };
      if (
        errObj?.message === "NEXT_REDIRECT" ||
        (typeof errObj?.digest === "string" && errObj.digest.startsWith("NEXT_REDIRECT"))
      ) {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please check the details provided."
      );
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* 1. Left Form Column */}
      <div className="p-8 md:p-16 flex flex-col justify-between">
        {/* Top: FinFlow logo lockup linking to / */}
        <div>
          <Link href="/" className="inline-block focus:outline-none">
            <Image
              src="/finflow-logo.png"
              alt="FinFlow"
              width={130}
              height={30}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center: Serif Headline & Vertical Form */}
        <div className="w-full max-w-[360px] mx-auto my-8">
          <h1 className="font-serif text-3xl text-gray-900 tracking-tight">
            Initialize your workspace
          </h1>
          <p className="text-xs text-zinc-500 mt-2">
            Configure your corporate ledger and opening liquidity.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 mt-8">
            <div>
              <label
                htmlFor="companyName"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Business Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="e.g. Indus Manufacturing"
                required
                className="w-full h-[42px] px-3 rounded-md bg-white border border-zinc-300 text-sm text-gray-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="finance@indusmfg.com"
                required
                autoComplete="email"
                className="w-full h-[42px] px-3 rounded-md bg-white border border-zinc-300 text-sm text-gray-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="new-password"
                className="w-full h-[42px] px-3 rounded-md bg-white border border-zinc-300 text-sm text-gray-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
              />
              {password.length > 0 && (
                <div className="space-y-1 mt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasMinLength ? "bg-emerald-700" : "bg-zinc-300"
                      }`}
                    />
                    <span
                      className={
                        hasMinLength ? "text-gray-900 font-medium" : "text-zinc-500"
                      }
                    >
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasUpperAndLower ? "bg-emerald-700" : "bg-zinc-300"
                      }`}
                    />
                    <span
                      className={
                        hasUpperAndLower ? "text-gray-900 font-medium" : "text-zinc-500"
                      }
                    >
                      Uppercase and lowercase letters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasNumberAndSpecial ? "bg-emerald-700" : "bg-zinc-300"
                      }`}
                    />
                    <span
                      className={
                        hasNumberAndSpecial ? "text-gray-900 font-medium" : "text-zinc-500"
                      }
                    >
                      Number and special character
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="baseCurrency"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Base Currency
              </label>
              <div className="relative">
                <select
                  id="baseCurrency"
                  name="baseCurrency"
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="w-full h-[42px] px-3 pr-8 rounded-md bg-white border border-zinc-300 text-sm text-gray-900 focus:outline-none focus:border-zinc-900 transition-colors appearance-none cursor-pointer"
                >
                  <option value="PKR">PKR — Pakistani Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                  <ChevronDown className="h-4 w-4 stroke-[1.5]" />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="liquidReserve"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Opening Cash Balance
              </label>
              <div className="flex items-center h-[42px] rounded-md border border-zinc-300 bg-white focus-within:border-zinc-900 overflow-hidden transition-colors">
                <span className="px-3 h-full flex items-center bg-[#FAFAFA] border-r border-zinc-200 font-mono text-xs text-zinc-600 select-none">
                  {baseCurrency}
                </span>
                <input
                  id="liquidReserve"
                  name="liquidReserve"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  defaultValue="0"
                  className="flex-1 h-full px-3 text-sm text-right tabular-nums text-gray-900 placeholder:text-zinc-400 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-700 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? "Initializing..." : "Initialize Workspace"}
            </button>
          </form>

          {/* Bottom: Link toggle */}
          <div className="mt-8 text-center text-xs text-zinc-600">
            <span>Already have an account?</span>{" "}
            <Link
              href="/login"
              className="font-medium text-gray-900 underline underline-offset-4 hover:text-black"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Subtle left column balance spacer */}
        <div aria-hidden="true" className="h-6" />
      </div>

      {/* 2. Right Editorial Column */}
      <div className="hidden lg:flex bg-[#FAFAFA] border-l border-zinc-200 p-16 flex-col justify-between">
        {/* Top eyebrow */}
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-[#0F3D2E] uppercase">
            TREASURY DISCIPLINE
          </p>
        </div>

        {/* Center: Quote + 4-column KPI strip */}
        <div className="max-w-[480px]">
          <blockquote className="font-serif text-3xl leading-snug text-gray-900">
            &ldquo;Cash runway is the only metric that cannot be faked.&rdquo;
          </blockquote>

          {/* Static miniature preview of the 4-column KPI strip */}
          <div className="mt-10 border border-zinc-200 bg-white grid grid-cols-2 divide-x divide-y divide-zinc-200">
            <div className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                Live Cash Position
              </p>
              <p className="text-xl font-semibold tracking-tight tabular-nums text-gray-900 mt-1">
                PKR 6,420,500
              </p>
              <p className="text-[11px] text-emerald-700 tabular-nums mt-0.5">
                +PKR 480k this week
              </p>
            </div>

            <div className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                30D Velocity
              </p>
              <p className="text-xl font-semibold tracking-tight tabular-nums text-gray-900 mt-1">
                +PKR 1,850,000
              </p>
              <p className="text-[11px] text-zinc-500 tabular-nums mt-0.5">
                Inflow 3.2M · Out 1.35M
              </p>
            </div>

            <div className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                Unpaid Receivables
              </p>
              <p className="text-xl font-semibold tracking-tight tabular-nums text-gray-900 mt-1">
                PKR 2,940,000
              </p>
              <p className="text-[11px] text-zinc-500 tabular-nums mt-0.5">
                11 open invoices
              </p>
            </div>

            <div className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">
                Overdue Exposure
              </p>
              <p className="text-xl font-semibold tracking-tight tabular-nums text-red-700 mt-1">
                3 Invoices
              </p>
              <p className="text-[11px] text-red-700/80 tabular-nums mt-0.5">
                PKR 615,000 past due
              </p>
            </div>
          </div>
        </div>

        {/* Bottom footnote */}
        <div>
          <p className="text-xs text-zinc-500 font-sans">
            FinFlow Treasury Intelligence · Built for SME Cash Clarity
          </p>
        </div>
      </div>
    </div>
  );
}
