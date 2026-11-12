"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { FinFlowMark } from "@/components/shell/TopNav";
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
    <div className="relative min-h-screen flex flex-col justify-between bg-canvas px-6 py-12 overflow-hidden">
      {/* Top Header Wordmark */}
      <div className="w-full max-w-[440px] mx-auto pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-sans font-medium text-[20px] tracking-[-0.02em] text-ink select-none"
        >
          <span>finflow</span>
          <FinFlowMark />
        </Link>
      </div>

      {/* Centered Auth Form (Unboxed on canvas, 440px wide) */}
      <div className="w-full max-w-[440px] mx-auto my-auto py-8">
        <h1 className="text-[36px] font-light tracking-[-0.03em] text-ink leading-tight">
          Sign in
        </h1>
        <p className="text-[16px] text-ink-2 mt-2 mb-8">
          Use your workspace email.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <Label htmlFor="email" className="text-[13px] font-medium text-ink-2 mb-1.5 block">
              Email
            </Label>
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
            <Label htmlFor="password" className="text-[13px] font-medium text-ink-2 mb-1.5 block">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          <div>
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
            className="w-full h-11 rounded-[10px]"
            isLoading={isPending}
          >
            Sign in
          </Button>
        </form>

        <div className="mt-8 text-[14px] text-ink-2">
          <span>New to FinFlow?</span>{" "}
          <Link
            href="/register"
            className="text-ink font-medium underline underline-offset-4 decoration-line-strong hover:decoration-lagoon"
          >
            Create a workspace
          </Link>
        </div>
      </div>

      {/* Static Tideline curve along bottom of viewport (T3 rule) */}
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
