"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { loginAction } from "@/modules/auth/actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

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
      setError(
        err instanceof Error
          ? err.message
          : "The email or password is incorrect."
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
          className="inline-flex items-center gap-2 text-ink hover:opacity-80 transition-opacity"
        >
          <Image
            src="/finflow-icon.png"
            alt="FinFlow"
            width={24}
            height={24}
            className="h-6 w-6 rounded-md object-contain"
            priority
          />
          <span className="font-semibold text-lg tracking-tight">FinFlow</span>
        </Link>
      </div>

      {/* Centered Single Column Auth Form (Template E: 360px wide) */}
      <div className="w-full max-w-[360px] mx-auto my-auto py-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-ink text-center leading-tight">
          Sign in
        </h1>
        <p className="text-[17px] text-ink-2 text-center mt-2 mb-8">
          Use your workspace email.
        </p>

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
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
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
            className="w-full h-12 rounded-full text-[17px] font-medium"
            isLoading={isPending}
          >
            Sign in
          </Button>

          <div className="text-center mt-3">
            <span className="text-[15px] text-ink-2">New to FinFlow? </span>
            <Link
              href="/register"
              className="text-[15px] font-medium text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
            >
              Create a workspace
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
