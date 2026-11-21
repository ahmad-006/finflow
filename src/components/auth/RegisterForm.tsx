"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { formatUserError } from "@/lib/errors";
import { registerAction } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function RegisterForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

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

      const res = await registerAction(formData);

      if (res && typeof res === "object" && !res.success && res.error) {
        setError(res.error);
        setIsPending(false);
      } else {
        router.push("/verify-email");
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
      setError(formatUserError(err, "Unable to create account. Please check your connection."));
      setIsPending(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <GoogleAuthButton label="Continue with Google" />

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5E7EB]" />
          </div>
          <div className="relative bg-white px-3 text-xs uppercase tracking-wider text-ink-3">
            or
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Tariq Rehman"
            required
            autoComplete="name"
            className="min-h-[44px]"
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
            className="min-h-[44px]"
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
              className="pr-12 min-h-[44px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors p-1 rounded-full focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Password checklist */}
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

        {error && (
          <InlineAlert
            variant="negative"
            message={error}
          />
        )}

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="default"
            className="w-full min-h-[44px] h-12 rounded-full text-[16px] font-medium"
            isLoading={isPending}
          >
            Create account
          </Button>
        </div>

        <div className="text-center pt-2">
          <span className="text-[14px] text-ink-2">Already have an account? </span>
          <Link
            href="/login"
            className="inline-flex items-center min-h-[44px] text-[14px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
          >
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
