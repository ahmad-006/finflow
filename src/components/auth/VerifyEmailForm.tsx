"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { verifyEmailAction, resendOtpAction, logoutAction } from "@/modules/auth/actions";
import { formatUserError } from "@/lib/errors";

export interface VerifyEmailFormProps {
  initialEmail?: string;
}

export function VerifyEmailForm({ initialEmail }: VerifyEmailFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || initialEmail || "";

  const [digits, setDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [countdown, setCountdown] = React.useState(60);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // 60-second countdown timer for resend
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    // If value has non-digits, filter them
    const cleanVal = value.replace(/\D/g, "");

    // If pasted or entered multiple digits
    if (cleanVal.length > 1) {
      handlePastedCode(cleanVal, index);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = cleanVal;
    setDigits(nextDigits);
    setError(null);

    // Auto-advance to next input if single digit typed
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePastedCode = (pasted: string, startIndex: number = 0) => {
    const clean = pasted.replace(/\D/g, "").slice(0, 6);
    if (!clean) return;

    const nextDigits = [...digits];
    for (let i = 0; i < clean.length; i++) {
      if (startIndex + i < 6) {
        nextDigits[startIndex + i] = clean[i];
      }
    }
    setDigits(nextDigits);
    setError(null);

    const nextFocusIndex = Math.min(startIndex + clean.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const nextDigits = [...digits];
        nextDigits[index - 1] = "";
        setDigits(nextDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    handlePastedCode(pasted, 0);
  };

  const code = digits.join("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError(null);
    setInfo(null);
    setIsPending(true);

    try {
      const formData = new FormData();
      formData.set("code", code);
      if (email) {
        formData.set("email", email);
      }

      const res = await verifyEmailAction(formData);

      if (res && typeof res === "object" && !res.success && res.error) {
        setError(res.error);
        setIsPending(false);
      } else {
        const destination = (res && typeof res === "object" && res.redirectUrl) || "/onboarding";
        router.push(destination);
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
      setError(formatUserError(err, "Verification failed. Please check the code."));
      setIsPending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    setError(null);
    setInfo(null);

    try {
      const formData = new FormData();
      if (email) {
        formData.set("email", email);
      }

      const res = await resendOtpAction(formData);

      if (res && typeof res === "object" && !res.success && res.error) {
        setError(res.error);
      } else {
        setInfo("A new 6-digit code has been sent to your email.");
        setCountdown(60);
      }
    } catch (err: unknown) {
      setError(formatUserError(err, "Failed to resend code. Please try again."));
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutAction();
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <input type="hidden" name="code" value={code} />
        {email && <input type="hidden" name="email" value={email} />}

        {info && (
          <InlineAlert
            variant="positive"
            message={info}
          />
        )}

        {error && (
          <InlineAlert
            variant="negative"
            message={error}
          />
        )}

        {/* 6 single-digit inputs */}
        <div className="flex items-center justify-between gap-2 sm:gap-2.5">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              autoFocus={index === 0}
              className="w-11 sm:w-12 h-14 text-center text-2xl font-semibold num rounded-[14px] bg-fog border border-[#E5E7EB] text-ink focus:bg-white focus:outline-2 focus:outline-ink focus:outline-offset-2 transition-colors"
              aria-label={`Digit ${index + 1} of 6-digit verification code`}
            />
          ))}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="default"
          className="w-full min-h-[44px] h-12 rounded-full text-[17px] font-medium"
          disabled={code.length !== 6 || isPending}
          isLoading={isPending}
        >
          Verify email
        </Button>

        {/* Resend button with 60-second timer */}
        <div className="flex flex-col items-center gap-2">
          {countdown > 0 ? (
            <p className="min-h-[44px] inline-flex items-center text-[14px] text-ink-3 num">
              Resend code in {countdown}s
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={handleResend}
              disabled={isResending}
              isLoading={isResending}
              className="min-h-[44px] text-[15px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink"
            >
              Resend code
            </Button>
          )}

          {/* Sign out button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-[44px] inline-flex items-center justify-center text-[14px] text-ink-3 hover:text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </form>
    </div>
  );
}
