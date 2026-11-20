"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { formatUserError } from "@/lib/errors";
import { loginAction } from "@/modules/auth/actions";
import { GoogleAuthButton } from "./GoogleAuthButton";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const oauthError = searchParams.get("error");

  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const res = await loginAction(formData);

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
      setError(formatUserError(err, "The email or password is incorrect."));
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
        {resetSuccess && (
          <InlineAlert
            variant="positive"
            message="Your password has been reset successfully. Please sign in."
          />
        )}

        {oauthError && (
          <InlineAlert
            variant="negative"
            message="Google sign-in was not completed. Please try again."
          />
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="finance@rehmansons.com"
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
              autoComplete="current-password"
              className="pr-12"
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
          <div className="flex justify-end mt-1">
            <Link
              href="/forgot-password"
              className="inline-flex items-center min-h-[44px] text-[14px] text-ink-2 hover:text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Checkbox
            id="remember"
            name="remember"
            label="Keep me signed in"
            defaultChecked
          />
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
          Sign in
        </Button>

        <div className="text-center mt-3">
          <span className="text-[15px] text-ink-2">New to FinFlow? </span>
          <Link
            href="/register"
            className="inline-flex items-center min-h-[44px] text-[15px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
          >
            Create a workspace
          </Link>
        </div>
      </form>
    </div>
  );
}
