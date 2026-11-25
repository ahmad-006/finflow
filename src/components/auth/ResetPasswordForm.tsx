"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { formatUserError } from "@/lib/errors";
import { resetPasswordAction } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = React.useState(() => searchParams.get("email") || "");
  const [code, setCode] = React.useState(() => searchParams.get("code") || "");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Live password checklist
  const hasMinLength = password.length >= 8;
  const hasUpperAndLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasNumberAndSpecial = /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Please enter a valid 6-digit reset code.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set("email", email.trim());
      formData.set("code", cleanCode);
      formData.set("newPassword", password);
      formData.set("confirmPassword", confirmPassword);

      const res = await resetPasswordAction(formData);

      if (res && typeof res === "object" && !res.success && res.error) {
        setError(res.error);
        setIsPending(false);
      } else {
        router.push("/login?reset=success");
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
      setError(formatUserError(err, "Failed to reset password. Please check your code."));
      setIsPending(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="finance@rehmansons.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="code">6-digit reset code</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            required
            className="text-center font-semibold text-xl tracking-widest num"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>

        <div>
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              name="newPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              className="pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <div>
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              className="pr-12"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors p-1 rounded-full focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirm ? (
                <EyeOff className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>
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
          className="w-full min-h-[44px] h-12 rounded-full text-[17px] font-medium"
          isLoading={isPending}
        >
          Reset password
        </Button>

        <div className="text-center mt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[44px] text-[15px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
          >
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}
