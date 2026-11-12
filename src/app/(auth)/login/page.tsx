"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Panel } from "@/components/ui/panel";
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
        // Handled by Next.js redirect
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4 sm:p-6">
      {/* Wordmark above: Source Serif 4, weight 600, 20px, --ink */}
      <div className="mb-8 text-center">
        <span className="font-serif text-[20px] font-semibold text-ink leading-none">
          FinFlow
        </span>
      </div>

      {/* Centered Panel: 400px wide */}
      <div className="w-full max-w-[400px]">
        <Panel className="p-8 max-sm:p-6">
          <h1 className="mb-6 font-serif text-[28px] leading-[36px] font-semibold text-ink">
            Sign in
          </h1>

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
              className="w-full"
              isLoading={isPending}
            >
              Sign in
            </Button>
          </form>
        </Panel>

        {/* Link below the panel */}
        <div className="mt-4 text-center text-[14px] leading-[20px] text-ink-2">
          <span>New to FinFlow?</span>{" "}
          <Link
            href="/register"
            className="font-medium text-brand hover:underline"
          >
            Create a workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
