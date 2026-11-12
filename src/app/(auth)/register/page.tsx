"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { FinFlowMark } from "@/components/shell/TopNav";
import { registerAction } from "@/modules/auth/actions";

export default function RegisterPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Live password checklist rules
  const hasMinLength = password.length >= 12;
  const hasNumber = /[0-9]/.test(password);
  const hasMixedCase = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

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
    <div className="relative min-h-screen flex flex-col justify-between bg-canvas px-6 py-12 overflow-hidden">
      {/* Top Header Wordmark */}
      <div className="w-full max-w-[520px] mx-auto pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans font-medium text-[20px] tracking-[-0.02em] text-ink select-none"
        >
          <span>finflow</span>
          <FinFlowMark />
        </Link>
      </div>

      {/* Form Column (520px wide, unboxed on canvas per Section 14.1) */}
      <div className="w-full max-w-[520px] mx-auto my-auto py-8">
        <h1 className="text-[32px] font-light tracking-[-0.03em] text-ink leading-tight">
          Create workspace
        </h1>
        <p className="text-[16px] text-ink-2 mt-2 mb-8">
          Set up your company, currency, and opening cash position.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Section 1: Business */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-ink border-b border-line pb-2">
              Business
            </h2>

            <div>
              <Label htmlFor="companyName" className="text-[13px] font-medium text-ink-2 mb-1.5 block">
                Company name
              </Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="e.g. Rehman and Sons Trading"
                required
              />
            </div>

            <div>
              <Label htmlFor="baseCurrency" className="text-[13px] font-medium text-ink-2 mb-1.5 block">
                Base currency
              </Label>
              <Select id="baseCurrency" name="baseCurrency" defaultValue="PKR">
                <option value="PKR">PKR — Pakistani Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SAR">SAR — Saudi Riyal</option>
              </Select>
            </div>
          </div>

          {/* Section 2: Account */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-ink border-b border-line pb-2">
              Account
            </h2>

            <div>
              <Label htmlFor="fullName" className="text-[13px] font-medium text-ink-2 mb-1.5 block">
                Full name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="e.g. Tariq Rehman"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-[13px] font-medium text-ink-2 mb-1.5 block">
                Business email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tariq@rehmansons.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-[13px] font-medium text-ink-2 mb-1.5 block">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {/* Live plain text password checklist turning lagoon-ink when met */}
              <div className="mt-2.5 flex flex-col gap-1 text-[13px] leading-[18px]">
                <span
                  className={
                    hasMinLength ? "text-lagoon-ink font-medium" : "text-ink-3"
                  }
                >
                  • At least 12 characters
                </span>
                <span
                  className={
                    hasNumber ? "text-lagoon-ink font-medium" : "text-ink-3"
                  }
                >
                  • Contains a number
                </span>
                <span
                  className={
                    hasMixedCase ? "text-lagoon-ink font-medium" : "text-ink-3"
                  }
                >
                  • Contains capital and lowercase letters
                </span>
                <span
                  className={
                    hasSpecial ? "text-lagoon-ink font-medium" : "text-ink-3"
                  }
                >
                  • Contains a special character
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Opening position */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-ink border-b border-line pb-2">
              Opening position
            </h2>

            <div>
              <Label htmlFor="liquidReserve" optional className="text-[13px] font-medium text-ink-2 mb-1.5 block">
                Opening liquid cash
              </Label>
              <Input
                id="liquidReserve"
                name="liquidReserve"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                defaultValue="0"
              />
              <p className="mt-1 text-[12px] leading-[16px] text-ink-3">
                Current available cash balance across operational accounts.
              </p>
            </div>

            <div>
              <Label htmlFor="safetyBuffer" optional className="text-[13px] font-medium text-ink-2 mb-1.5 block">
                Safety buffer
              </Label>
              <Input
                id="safetyBuffer"
                name="safetyBuffer"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                defaultValue="0"
              />
              <p className="mt-1 text-[12px] leading-[16px] text-ink-3">
                Minimum cash threshold that triggers liquidity alerts.
              </p>
            </div>
          </div>

          {error && (
            <InlineAlert
              variant="negative"
              message={error}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 rounded-[10px]"
            isLoading={isPending}
          >
            Create workspace
          </Button>
        </form>

        <div className="mt-8 text-[14px] text-ink-2">
          <span>Already have a workspace?</span>{" "}
          <Link
            href="/login"
            className="text-ink font-medium underline underline-offset-4 decoration-line-strong hover:decoration-lagoon"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Static Tideline curve along bottom of viewport */}
      <div className="w-full max-w-5xl mx-auto h-20 opacity-40 pointer-events-none select-none" aria-hidden="true">
        <svg
          viewBox="0 0 1000 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0 60 C150 60 200 20 350 20 C500 20 550 70 700 70 C800 70 850 30 1000 25"
            stroke="var(--lagoon)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
