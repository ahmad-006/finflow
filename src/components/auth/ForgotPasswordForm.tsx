"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { formatUserError } from "@/lib/errors";
import { forgotPasswordAction } from "@/modules/auth/actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const res = await forgotPasswordAction(formData);

      if (res && typeof res === "object" && !res.success && res.error) {
        setError(res.error);
        setIsPending(false);
      } else {
        setIsSubmitted(true);
        setIsPending(false);
      }
    } catch (err: unknown) {
      setError(formatUserError(err, "Unable to send reset code. Please try again."));
      setIsPending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full flex flex-col gap-6 text-center">
        <InlineAlert
          variant="positive"
          message="Check your inbox for your 6-digit reset code"
        />

        <p className="text-[15px] text-ink-2">
          If an account exists for <span className="font-medium text-ink">{email}</span>, you will receive a reset code shortly. Be sure to check your spam or junk folder if it does not arrive within a few minutes.
        </p>

        <Link
          href={`/reset-password?email=${encodeURIComponent(email)}`}
          className="w-full min-h-[44px] h-12 rounded-full bg-ink text-white hover:bg-ink-hover font-medium text-[17px] inline-flex items-center justify-center transition-colors select-none"
        >
          Enter reset code
        </Link>

        <div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center min-h-[44px] text-[15px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

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
          Send reset code
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
