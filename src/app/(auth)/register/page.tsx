"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Panel } from "@/components/ui/panel";
import { InlineAlert } from "@/components/feedback/InlineAlert";
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
        // Handled by Next.js redirect
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4 sm:p-6">
      {/* Wordmark above: Source Serif 4, weight 600, 20px, --ink */}
      <div className="mb-8 text-center">
        <span className="font-serif text-[20px] font-semibold text-ink leading-none">
          FinFlow
        </span>
      </div>

      {/* Centered Panel: 480px wide */}
      <div className="w-full max-w-[480px]">
        <Panel className="p-8 max-sm:p-6">
          <h1 className="mb-6 font-serif text-[28px] leading-[36px] font-semibold text-ink">
            Create workspace
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Section 1: Business */}
            <div className="flex flex-col gap-4">
              <h2 className="text-[15px] leading-[22px] font-semibold text-ink border-b border-line pb-2">
                Business
              </h2>

              <div>
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="e.g. Rehman and Sons Trading"
                  required
                />
              </div>

              <div>
                <Label htmlFor="baseCurrency">Base currency</Label>
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
              <h2 className="text-[15px] leading-[22px] font-semibold text-ink border-b border-line pb-2">
                Account
              </h2>

              <div>
                <Label htmlFor="fullName">Full name</Label>
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
                <Label htmlFor="email">Business email</Label>
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {/* Live plain text password checklist */}
                <div className="mt-2.5 flex flex-col gap-1 text-[13px] leading-[18px]">
                  <span
                    className={
                      hasMinLength ? "text-positive font-medium" : "text-ink-3"
                    }
                  >
                    • At least 12 characters
                  </span>
                  <span
                    className={
                      hasNumber ? "text-positive font-medium" : "text-ink-3"
                    }
                  >
                    • Contains a number
                  </span>
                  <span
                    className={
                      hasMixedCase ? "text-positive font-medium" : "text-ink-3"
                    }
                  >
                    • Contains capital and lowercase letters
                  </span>
                  <span
                    className={
                      hasSpecial ? "text-positive font-medium" : "text-ink-3"
                    }
                  >
                    • Contains a special character
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Opening position */}
            <div className="flex flex-col gap-4">
              <h2 className="text-[15px] leading-[22px] font-semibold text-ink border-b border-line pb-2">
                Opening position
              </h2>

              <div>
                <Label htmlFor="liquidReserve" optional>Opening liquid cash</Label>
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
                <Label htmlFor="safetyBuffer" optional>Safety buffer</Label>
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
              className="w-full"
              isLoading={isPending}
            >
              Create workspace
            </Button>
          </form>
        </Panel>

        {/* Link below the panel */}
        <div className="mt-4 text-center text-[14px] leading-[20px] text-ink-2">
          <span>Already have a workspace?</span>{" "}
          <Link
            href="/login"
            className="font-medium text-brand hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
