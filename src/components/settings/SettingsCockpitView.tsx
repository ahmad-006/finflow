"use client";

import * as React from "react";
import { useActionState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/feedback/InlineAlert";
import {
  updateCompanySettingsAction,
  updateUserProfileAction,
  changePasswordAction,
} from "@/modules/settings/actions";
import type {
  CompanySettingsRecord,
  UserProfileRecord,
  ActionState,
} from "@/modules/settings/types";
import { Building2, User, Shield, CheckCircle2, Lock } from "lucide-react";

interface SettingsCockpitViewProps {
  initialCompany: CompanySettingsRecord;
  initialProfile: UserProfileRecord;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "₨",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED",
  SAR: "SAR",
  CAD: "CA$",
};

type SettingsTab = "company" | "profile" | "security";

export function SettingsCockpitView({
  initialCompany,
  initialProfile,
}: SettingsCockpitViewProps) {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("company");

  // Company settings action
  const [companyState, companyAction, isCompanyPending] = useActionState(
    updateCompanySettingsAction,
    { success: false } as ActionState<CompanySettingsRecord>
  );

  // User profile action
  const [profileState, profileAction, isProfilePending] = useActionState(
    updateUserProfileAction,
    { success: false } as ActionState<UserProfileRecord>
  );

  // Change password action
  const [securityState, securityAction, isSecurityPending] = useActionState(
    changePasswordAction,
    { success: false } as ActionState
  );

  const currentCompany = companyState.data || initialCompany;
  const currentProfile = profileState.data || initialProfile;
  const currencySymbol =
    CURRENCY_SYMBOLS[currentCompany.baseCurrency] ?? currentCompany.baseCurrency;

  const isOAuthUser =
    currentProfile.authProvider === "GOOGLE" ||
    currentProfile.authProvider.toUpperCase() === "GOOGLE";

  return (
    <div className="w-full text-ink pb-12 font-sans">
      <PageHeader
        title="Settings"
        description="Manage company parameters, profile details, and account security."
      />

      {/* Tab Navigation Strip */}
      <div
        className="flex items-center gap-2 border-b border-line pb-4 mb-8 overflow-x-auto no-scrollbar"
        role="tablist"
        aria-label="Settings sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "company"}
          aria-controls="panel-company"
          id="tab-company"
          onClick={() => setActiveTab("company")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
            activeTab === "company"
              ? "bg-ink text-white"
              : "bg-fog text-ink-2 hover:text-ink hover:bg-fog/80"
          }`}
        >
          <Building2 className="w-4 h-4 stroke-[1.5]" />
          <span>Workspace</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "profile"}
          aria-controls="panel-profile"
          id="tab-profile"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
            activeTab === "profile"
              ? "bg-ink text-white"
              : "bg-fog text-ink-2 hover:text-ink hover:bg-fog/80"
          }`}
        >
          <User className="w-4 h-4 stroke-[1.5]" />
          <span>Profile</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "security"}
          aria-controls="panel-security"
          id="tab-security"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
            activeTab === "security"
              ? "bg-ink text-white"
              : "bg-fog text-ink-2 hover:text-ink hover:bg-fog/80"
          }`}
        >
          <Shield className="w-4 h-4 stroke-[1.5]" />
          <span>Security</span>
        </button>
      </div>

      {/* Tab 1: Company / Workspace Settings */}
      {activeTab === "company" && (
        <div
          role="tabpanel"
          id="panel-company"
          aria-labelledby="tab-company"
          className="rounded-[14px] border border-line bg-white p-6 sm:p-8 max-w-3xl"
        >
          <div className="mb-6 pb-4 border-b border-line">
            <h2 className="text-xl font-semibold text-ink">Company workspace</h2>
            <p className="text-[14px] text-ink-2 mt-1">
              Configure baseline reserves, safety buffer, and corporate parameters.
            </p>
          </div>

          <form action={companyAction} className="flex flex-col gap-6">
            {companyState?.success && companyState?.message && (
              <InlineAlert
                variant="positive"
                message={companyState.message}
              />
            )}

            {companyState?.error && (
              <InlineAlert
                variant="negative"
                message={companyState.error}
              />
            )}

            <div>
              <Label htmlFor="name">Company name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                defaultValue={currentCompany.name}
                isInvalid={Boolean(companyState?.errors?.name)}
                className="min-h-[44px]"
              />
              {companyState?.errors?.name && (
                <p className="mt-1.5 text-[13px] text-ember-ink">
                  {companyState.errors.name[0]}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="baseCurrency">Base currency</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] bg-fog border border-line text-[14px] font-semibold text-ink min-h-[44px]">
                  <span>{currentCompany.baseCurrency}</span>
                  <span className="text-ink-3">({currencySymbol})</span>
                </div>
                <span className="text-[13px] text-ink-3">
                  Base currency is locked to maintain audit integrity across ledger entries.
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="liquidReserve">Liquid reserve</Label>
              <div className="relative flex items-center">
                <span
                  className="absolute left-[18px] z-10 font-mono text-[15px] font-medium text-ink-3 pointer-events-none select-none"
                  aria-hidden="true"
                >
                  {currencySymbol}
                </span>
                <Input
                  id="liquidReserve"
                  name="liquidReserve"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={currentCompany.liquidReserve}
                  required
                  isInvalid={Boolean(companyState?.errors?.liquidReserve)}
                  className="pl-16 pr-[18px] tabular-nums min-h-[44px]"
                />
              </div>
              {companyState?.errors?.liquidReserve ? (
                <p className="mt-1.5 text-[13px] text-ember-ink">
                  {companyState.errors.liquidReserve[0]}
                </p>
              ) : (
                <p className="mt-1.5 text-[13px] text-ink-3">
                  Starting liquid cash reserve powering the 30-day cockpit runway projection.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="safetyBuffer">Safety buffer threshold</Label>
              <div className="relative flex items-center">
                <span
                  className="absolute left-[18px] z-10 font-mono text-[15px] font-medium text-ink-3 pointer-events-none select-none"
                  aria-hidden="true"
                >
                  {currencySymbol}
                </span>
                <Input
                  id="safetyBuffer"
                  name="safetyBuffer"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={currentCompany.safetyBuffer}
                  required
                  isInvalid={Boolean(companyState?.errors?.safetyBuffer)}
                  className="pl-16 pr-[18px] tabular-nums min-h-[44px]"
                />
              </div>
              {companyState?.errors?.safetyBuffer ? (
                <p className="mt-1.5 text-[13px] text-ember-ink">
                  {companyState.errors.safetyBuffer[0]}
                </p>
              ) : (
                <p className="mt-1.5 text-[13px] text-ink-3">
                  Minimum cash threshold before the cockpit triggers liquidity warnings.
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="default"
                className="min-h-[44px] h-12 px-6 rounded-full text-[15px] font-medium"
                isLoading={isCompanyPending}
                disabled={isCompanyPending}
              >
                Save workspace changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: User Profile Settings */}
      {activeTab === "profile" && (
        <div
          role="tabpanel"
          id="panel-profile"
          aria-labelledby="tab-profile"
          className="rounded-[14px] border border-line bg-white p-6 sm:p-8 max-w-3xl"
        >
          <div className="mb-6 pb-4 border-b border-line">
            <h2 className="text-xl font-semibold text-ink">User profile</h2>
            <p className="text-[14px] text-ink-2 mt-1">
              Personal identity and team role within this FinFlow organization.
            </p>
          </div>

          <form action={profileAction} className="flex flex-col gap-6">
            {profileState?.success && profileState?.message && (
              <InlineAlert
                variant="positive"
                message={profileState.message}
              />
            )}

            {profileState?.error && (
              <InlineAlert
                variant="negative"
                message={profileState.error}
              />
            )}

            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                minLength={2}
                defaultValue={currentProfile.fullName}
                isInvalid={Boolean(profileState?.errors?.fullName)}
                className="min-h-[44px]"
              />
              {profileState?.errors?.fullName && (
                <p className="mt-1.5 text-[13px] text-ember-ink">
                  {profileState.errors.fullName[0]}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="email"
                  type="email"
                  disabled
                  value={currentProfile.email}
                  className="bg-fog/50 text-ink-2 min-h-[44px] cursor-not-allowed"
                />
                <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-moss-tint text-moss text-[12px] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" />
                  Verified
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-ink-3">
                Email address is tied to your primary identity provider.
              </p>
            </div>

            <div>
              <Label htmlFor="role">Organization role</Label>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-fog border border-line text-[13px] font-semibold text-ink">
                  {currentProfile.role}
                </span>
                <span className="text-[13px] text-ink-3">
                  Full administrative permissions over treasury, invoices, and members.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="default"
                className="min-h-[44px] h-12 px-6 rounded-full text-[15px] font-medium"
                isLoading={isProfilePending}
                disabled={isProfilePending}
              >
                Save profile changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Security & Credentials */}
      {activeTab === "security" && (
        <div
          role="tabpanel"
          id="panel-security"
          aria-labelledby="tab-security"
          className="rounded-[14px] border border-line bg-white p-6 sm:p-8 max-w-3xl"
        >
          <div className="mb-6 pb-4 border-b border-line">
            <h2 className="text-xl font-semibold text-ink">Security and credentials</h2>
            <p className="text-[14px] text-ink-2 mt-1">
              Manage authentication credentials and account access protection.
            </p>
          </div>

          {isOAuthUser ? (
            <div className="rounded-[14px] border border-line bg-fog/30 p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-fog border border-line flex items-center justify-center text-ink shrink-0">
                  <Lock className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">
                    Managed through Google OAuth
                  </h3>
                  <p className="text-[14px] text-ink-2 mt-0.5">
                    Your account signs in securely using your Google identity.
                  </p>
                </div>
              </div>

              <div className="text-[13px] text-ink-3 border-t border-line/60 pt-4 leading-relaxed">
                Password authentication, two-factor verification, and recovery options for this
                account are managed directly in your Google Account security settings.
              </div>
            </div>
          ) : (
            <form action={securityAction} className="flex flex-col gap-6">
              {securityState?.success && securityState?.message && (
                <InlineAlert
                  variant="positive"
                  message={securityState.message}
                />
              )}

              {securityState?.error && (
                <InlineAlert
                  variant="negative"
                  message={securityState.error}
                />
              )}

              <div>
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  isInvalid={Boolean(securityState?.errors?.currentPassword)}
                  className="min-h-[44px]"
                />
                {securityState?.errors?.currentPassword && (
                  <p className="mt-1.5 text-[13px] text-ember-ink">
                    {securityState.errors.currentPassword[0]}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  isInvalid={Boolean(securityState?.errors?.newPassword)}
                  className="min-h-[44px]"
                />
                {securityState?.errors?.newPassword ? (
                  <p className="mt-1.5 text-[13px] text-ember-ink">
                    {securityState.errors.newPassword[0]}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[13px] text-ink-3">
                    Must be at least 8 characters long.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  isInvalid={Boolean(securityState?.errors?.confirmPassword)}
                  className="min-h-[44px]"
                />
                {securityState?.errors?.confirmPassword && (
                  <p className="mt-1.5 text-[13px] text-ember-ink">
                    {securityState.errors.confirmPassword[0]}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="default"
                  className="min-h-[44px] h-12 px-6 rounded-full text-[15px] font-medium"
                  isLoading={isSecurityPending}
                  disabled={isSecurityPending}
                >
                  Update password
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
