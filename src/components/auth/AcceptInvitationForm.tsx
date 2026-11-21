"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import { acceptInvitationAction, getInvitationByTokenAction } from "@/modules/auth/actions";

interface InvitationData {
  id: string;
  companyId: string;
  companyName: string;
  email: string;
  role: string;
  expiresAt: string | Date;
  isExpired: boolean;
}

interface AcceptInvitationFormProps {
  token?: string;
  invitation?: InvitationData | null;
  currentUserEmail?: string | null;
}

export function AcceptInvitationForm({
  token: initialToken,
  invitation: initialInvitation,
  currentUserEmail: initialUserEmail,
}: AcceptInvitationFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = initialToken || searchParams.get("token") || "";

  const [invitation, setInvitation] = React.useState<InvitationData | null>(initialInvitation || null);
  const [isLoadingInvite, setIsLoadingInvite] = React.useState(!initialInvitation);
  const [currentUserEmail] = React.useState<string | null>(initialUserEmail || null);
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => {
    if (initialInvitation || !token) {
      setIsLoadingInvite(false);
      return;
    }

    let isMounted = true;
    getInvitationByTokenAction(token).then((res) => {
      if (!isMounted) return;
      if (res.success && res.data) {
        setInvitation(res.data);
      } else {
        setInvitation(null);
      }
      setIsLoadingInvite(false);
    });

    return () => {
      isMounted = false;
    };
  }, [token, initialInvitation]);

  if (isLoadingInvite) {
    return (
      <div className="flex flex-col gap-4 p-6 rounded-[16px] border border-line bg-white animate-pulse">
        <div className="h-6 w-3/4 bg-fog rounded" />
        <div className="h-4 w-1/2 bg-fog rounded" />
        <div className="h-12 w-full bg-fog rounded-full mt-4" />
      </div>
    );
  }

  // If no invitation found or already expired
  if (!invitation) {
    return (
      <div className="flex flex-col gap-6 p-6 rounded-[16px] border border-line bg-white text-center">
        <InlineAlert
          variant="negative"
          message="This invitation link is invalid or has already been used."
        />
        <p className="text-sm text-ink-2">
          Please ask your workspace administrator to issue a new team invitation.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/90 transition-colors"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  if (invitation.isExpired) {
    return (
      <div className="flex flex-col gap-6 p-6 rounded-[16px] border border-line bg-white text-center">
        <InlineAlert
          variant="negative"
          message="This invitation has expired. Invitations are valid for 7 days."
        />
        <p className="text-sm text-ink-2">
          Please contact {invitation.companyName} to send an updated invitation.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/90 transition-colors"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  const isAlreadyLoggedInAsInvitee =
    Boolean(currentUserEmail) &&
    currentUserEmail?.toLowerCase() === invitation.email.toLowerCase();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData();
      formData.append("token", token);
      if (fullName.trim()) formData.append("fullName", fullName.trim());
      if (password) formData.append("password", password);

      const res = await acceptInvitationAction(null, formData);

      if (res && !res.success && res.error) {
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
      setError(err instanceof Error ? err.message : "Failed to accept invitation.");
      setIsPending(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Workspace Invitation Metadata Card */}
      <div className="p-5 rounded-[16px] border border-line bg-fog/20 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-ink text-white flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs uppercase tracking-wider text-ink-3 font-mono">Workspace</span>
              <h2 className="text-base font-semibold text-ink truncate">{invitation.companyName}</h2>
            </div>
          </div>
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-white border border-line text-ink">
            {invitation.role}
          </span>
        </div>

        <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs text-ink-2">
          <span>Invited email:</span>
          <span className="font-mono font-medium text-ink">{invitation.email}</span>
        </div>
      </div>

      {error && <InlineAlert variant="negative" message={error} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {isAlreadyLoggedInAsInvitee ? (
          <div className="p-4 rounded-[12px] bg-fog/40 border border-line flex items-center gap-3 text-sm text-ink-2">
            <CheckCircle2 className="w-5 h-5 text-moss shrink-0" />
            <span>You are currently signed in as <strong>{invitation.email}</strong>. Click below to join.</span>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="fullName">Your full name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Ahmad Aamir"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <div>
              <Label htmlFor="password">Set account password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12 min-h-[44px]"
                  minLength={8}
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
            </div>
          </>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="default"
            className="w-full min-h-[44px] h-12 rounded-full text-[15px] font-medium flex items-center justify-center gap-2"
            isLoading={isPending}
          >
            <span>Accept invitation & join workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
