"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { registerAction } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Live password checklist validation (Section 9.1)
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
          : "Unable to create workspace. Please check your connection."
      );
      setIsPending(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-white px-6 py-10 overflow-hidden font-sans">
      {/* Top Left Wordmark */}
      <div className="w-full max-w-[1200px] mx-auto">
        <Link
          href="/"
          className="inline-flex items-center hover:opacity-80 transition-opacity"
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
          Create workspace
        </h1>
        <p className="text-[17px] text-ink-2 text-center mt-2 mb-8">
          Start forecasting your cash 30 days ahead.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Section: Business */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink tracking-tight pb-1 border-b border-line">
              Business
            </h2>

            <div>
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Rehman and Sons Trading"
                required
                autoComplete="organization"
              />
            </div>

            <div>
              <Label htmlFor="baseCurrency">Base currency</Label>
              <Select id="baseCurrency" name="baseCurrency" defaultValue="PKR">
                <option value="PKR">PKR — Pakistani Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </Select>
            </div>
          </div>

          {/* Section: Account */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink tracking-tight pb-1 border-b border-line">
              Account
            </h2>

            <div>
              <Label htmlFor="fullName" optional>Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Tariq Rehman"
                autoComplete="name"
              />
            </div>

            <div>
              <Label htmlFor="email">Business email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="finance@rehmansons.pk"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors p-1 rounded-full focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-5 w-5" strokeWidth={1.5} />
                  )}
                </button>
              </div>

              {/* Password checklist beneath the field turning --moss as each is met */}
              <div className="mt-3 flex flex-col gap-1 text-[13px] text-ink-3">
                <p className={cn("transition-colors", hasMinLength && "text-moss font-medium")}>
                  • At least 8 characters
                </p>
                <p className={cn("transition-colors", hasUpperAndLower && "text-moss font-medium")}>
                  • Both uppercase and lowercase letters
                </p>
                <p className={cn("transition-colors", hasNumberAndSpecial && "text-moss font-medium")}>
                  • At least one number and special symbol
                </p>
              </div>
            </div>
          </div>

          {/* Section: Opening position */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[20px] font-semibold text-ink tracking-tight pb-1 border-b border-line">
              Opening position
            </h2>

            <div>
              <Label htmlFor="liquidReserve">Opening liquid cash</Label>
              <Input
                id="liquidReserve"
                name="liquidReserve"
                type="number"
                step="0.01"
                min="0"
                placeholder="4380250.00"
                defaultValue="4380250.00"
                required
              />
              <p className="mt-1 text-[13px] text-ink-3">
                Total available cash in your bank accounts today.
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
                placeholder="1200000.00"
                defaultValue="1200000.00"
              />
              <p className="mt-1 text-[13px] text-ink-3">
                The minimum cash buffer to maintain before warning of a breach.
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
            size="default"
            className="w-full h-12 rounded-full text-[17px] font-medium"
            isLoading={isPending}
          >
            Create workspace
          </Button>

          <div className="text-center">
            <span className="text-[15px] text-ink-2">Already have a workspace? </span>
            <Link
              href="/login"
              className="text-[15px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
            >
              Sign in
            </Link>
          </div>
        </form>
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
