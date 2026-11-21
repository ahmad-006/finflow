"use client";

import * as React from "react";
import { useActionState, useState } from "react";
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
import {
  Building2,
  User,
  Shield,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Coins,
  ShieldCheck,
  Info,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");

  // Password visibility states for security tab
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        eyebrow="Configuration & Preferences"
        title="Settings"
        description="Manage workspace parameters, personal profile, and authentication credentials."
      />

      {/* Main Two-Column Layout on Desktop, Vertical Flow on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Column */}
        <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          {/* Tabs Container */}
          <nav
            role="tablist"
            aria-label="Settings navigation"
            className="flex lg:flex-col gap-1.5 p-1.5 bg-fog rounded-[16px] border border-line overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "company"}
              aria-controls="panel-company"
              id="tab-company"
              onClick={() => setActiveTab("company")}
              className={`flex items-center gap-3 px-4 py-3 rounded-[12px] text-left transition-all min-h-[44px] shrink-0 lg:w-full ${
                activeTab === "company"
                  ? "bg-white text-ink font-semibold shadow-none border border-line/60"
                  : "text-ink-2 hover:text-ink hover:bg-white/60 font-medium"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${
                  activeTab === "company" ? "bg-ink text-white" : "bg-fog text-ink-2"
                }`}
              >
                <Building2 className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] leading-tight">Workspace</span>
                <span className="text-[12px] text-ink-3 font-normal hidden lg:inline">
                  Reserves and parameters
                </span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "profile"}
              aria-controls="panel-profile"
              id="tab-profile"
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3 rounded-[12px] text-left transition-all min-h-[44px] shrink-0 lg:w-full ${
                activeTab === "profile"
                  ? "bg-white text-ink font-semibold shadow-none border border-line/60"
                  : "text-ink-2 hover:text-ink hover:bg-white/60 font-medium"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${
                  activeTab === "profile" ? "bg-ink text-white" : "bg-fog text-ink-2"
                }`}
              >
                <User className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] leading-tight">Profile</span>
                <span className="text-[12px] text-ink-3 font-normal hidden lg:inline">
                  Personal identity
                </span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "security"}
              aria-controls="panel-security"
              id="tab-security"
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-3 px-4 py-3 rounded-[12px] text-left transition-all min-h-[44px] shrink-0 lg:w-full ${
                activeTab === "security"
                  ? "bg-white text-ink font-semibold shadow-none border border-line/60"
                  : "text-ink-2 hover:text-ink hover:bg-white/60 font-medium"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${
                  activeTab === "security" ? "bg-ink text-white" : "bg-fog text-ink-2"
                }`}
              >
                <Shield className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] leading-tight">Security</span>
                <span className="text-[12px] text-ink-3 font-normal hidden lg:inline">
                  Credentials and access
                </span>
              </div>
            </button>
          </nav>

          {/* Contextual Workspace Card on Desktop */}
          <div className="hidden lg:flex flex-col gap-4 p-5 rounded-[16px] border border-line bg-fog/20 text-ink">
            <div className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              <Info className="w-3.5 h-3.5" />
              <span>Workspace status</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink-2">Organization</span>
                <span className="font-medium text-ink truncate max-w-[150px]">
                  {currentCompany.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink-2">Currency</span>
                <span className="font-mono font-medium text-ink">
                  {currentCompany.baseCurrency} ({currencySymbol})
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink-2">User role</span>
                <span className="px-2 py-0.5 rounded-full bg-fog border border-line text-[11px] font-semibold">
                  {currentProfile.role}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink-2">Sign-in method</span>
                <span className="text-ink font-medium">
                  {isOAuthUser ? "Google OAuth" : "Email & password"}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Column */}
        <main className="lg:col-span-8 xl:col-span-9 w-full">
          {/* Tab 1: Workspace Settings */}
          {activeTab === "company" && (
            <div
              role="tabpanel"
              id="panel-company"
              aria-labelledby="tab-company"
              className="rounded-[16px] border border-line bg-white p-6 sm:p-8"
            >
              <div className="mb-8 pb-5 border-b border-line">
                <h2 className="text-xl font-semibold text-ink">Company workspace</h2>
                <p className="text-[14px] text-ink-2 mt-1">
                  Configure company identity, baseline liquid reserves, and cash runway thresholds.
                </p>
              </div>

              <form action={companyAction} className="flex flex-col gap-8">
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

                {/* Section 1: Business Identity */}
                <div className="flex flex-col gap-5">
                  <h3 className="text-[15px] font-semibold text-ink uppercase tracking-wider text-ink-3">
                    Corporate identity
                  </h3>

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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-[12px] bg-fog/40 border border-line">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-white border border-line text-[14px] font-semibold text-ink shrink-0 w-fit">
                        <Coins className="w-4 h-4 text-ink-2" />
                        <span>{currentCompany.baseCurrency}</span>
                        <span className="text-ink-3">({currencySymbol})</span>
                      </div>
                      <span className="text-[13px] text-ink-2">
                        Locked to preserve audit consistency across accounting records and invoice ledgers.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Cash Flow & Runway Parameters */}
                <div className="flex flex-col gap-5 pt-6 border-t border-line">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[15px] font-semibold text-ink uppercase tracking-wider text-ink-3">
                      Runway parameters
                    </h3>
                    <p className="text-[13px] text-ink-2">
                      These values initialize the Day 0 balance and safety line across your 30-day forecast.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="liquidReserve">Opening liquid cash reserve</Label>
                    <div className="relative flex items-center">
                      <span
                        className="absolute left-3.5 z-10 font-mono text-[14px] font-medium text-ink-3 pointer-events-none select-none"
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
                        className="pl-12 pr-4 tabular-nums min-h-[44px]"
                      />
                    </div>
                    {companyState?.errors?.liquidReserve ? (
                      <p className="mt-1.5 text-[13px] text-ember-ink">
                        {companyState.errors.liquidReserve[0]}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[13px] text-ink-3">
                        Total unencumbered cash balance across company operating accounts.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="safetyBuffer">Safety buffer threshold</Label>
                    <div className="relative flex items-center">
                      <span
                        className="absolute left-3.5 z-10 font-mono text-[14px] font-medium text-ink-3 pointer-events-none select-none"
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
                        className="pl-12 pr-4 tabular-nums min-h-[44px]"
                      />
                    </div>
                    {companyState?.errors?.safetyBuffer ? (
                      <p className="mt-1.5 text-[13px] text-ember-ink">
                        {companyState.errors.safetyBuffer[0]}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[13px] text-ink-3">
                        The redline threshold. Projected balance dipping below this number triggers deficit warnings.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[13px] text-ink-3 order-2 sm:order-1">
                    Updates reflect immediately across treasury calculations.
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="default"
                    className="min-h-[44px] h-11 px-7 rounded-full text-[14px] font-medium w-full sm:w-auto order-1 sm:order-2"
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
              className="rounded-[16px] border border-line bg-white p-6 sm:p-8"
            >
              <div className="mb-8 pb-5 border-b border-line">
                <h2 className="text-xl font-semibold text-ink">User profile</h2>
                <p className="text-[14px] text-ink-2 mt-1">
                  Manage personal identity and contact information for your FinFlow account.
                </p>
              </div>

              <form action={profileAction} className="flex flex-col gap-8">
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

                <div className="flex flex-col gap-5">
                  <h3 className="text-[15px] font-semibold text-ink uppercase tracking-wider text-ink-3">
                    Personal identity
                  </h3>

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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Input
                        id="email"
                        type="email"
                        disabled
                        value={currentProfile.email}
                        className="bg-fog/50 text-ink-2 min-h-[44px] cursor-not-allowed"
                      />
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-moss-tint text-moss text-[12px] font-semibold w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        Verified
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-ink-3">
                      Email address is tied to your primary authentication credential.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-6 border-t border-line">
                  <h3 className="text-[15px] font-semibold text-ink uppercase tracking-wider text-ink-3">
                    Access privileges
                  </h3>

                  <div className="p-4 rounded-[12px] bg-fog/30 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-moss shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[14px] font-semibold text-ink">
                          Organization role: {currentProfile.role}
                        </span>
                        <span className="text-[12px] text-ink-2">
                          Unrestricted authority over treasury, invoices, expenses, and settings.
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-white border border-line text-[12px] font-medium text-ink w-fit">
                      Primary administrator
                    </span>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[13px] text-ink-3 order-2 sm:order-1">
                    Name appears on issued PDF invoices and audit trails.
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="default"
                    className="min-h-[44px] h-11 px-7 rounded-full text-[14px] font-medium w-full sm:w-auto order-1 sm:order-2"
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
              className="rounded-[16px] border border-line bg-white p-6 sm:p-8"
            >
              <div className="mb-8 pb-5 border-b border-line">
                <h2 className="text-xl font-semibold text-ink">Security and credentials</h2>
                <p className="text-[14px] text-ink-2 mt-1">
                  Manage authentication credentials, password requirements, and session protection.
                </p>
              </div>

              {isOAuthUser ? (
                <div className="rounded-[16px] border border-line bg-fog/30 p-6 sm:p-8 flex flex-col gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white border border-line flex items-center justify-center text-ink shrink-0">
                      <Lock className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-[16px] font-semibold text-ink">
                        Managed through Google OAuth
                      </h3>
                      <p className="text-[14px] text-ink-2 leading-relaxed">
                        Your account authenticates directly through Google. Two-factor authentication, session revocations, and account recovery are managed via Google Account settings.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-line pt-4 text-[13px] text-ink-3 leading-relaxed">
                    FinFlow does not store a local password for this account. To change your primary email or login credentials, update your linked Google identity.
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
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        isInvalid={Boolean(securityState?.errors?.currentPassword)}
                        className="pr-12 min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors w-11 h-11 flex items-center justify-center rounded-lg"
                        aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {securityState?.errors?.currentPassword && (
                      <p className="mt-1.5 text-[13px] text-ember-ink">
                        {securityState.errors.currentPassword[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="newPassword">New password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        isInvalid={Boolean(securityState?.errors?.newPassword)}
                        className="pr-12 min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors w-11 h-11 flex items-center justify-center rounded-lg"
                        aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {securityState?.errors?.newPassword ? (
                      <p className="mt-1.5 text-[13px] text-ember-ink">
                        {securityState.errors.newPassword[0]}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[13px] text-ink-3">
                        Must contain at least 8 characters with a mix of letters, numbers, and symbols.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        isInvalid={Boolean(securityState?.errors?.confirmPassword)}
                        className="pr-12 min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors w-11 h-11 flex items-center justify-center rounded-lg"
                        aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {securityState?.errors?.confirmPassword && (
                      <p className="mt-1.5 text-[13px] text-ember-ink">
                        {securityState.errors.confirmPassword[0]}
                      </p>
                    )}
                  </div>

                  {/* Footer Action Bar */}
                  <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-[13px] text-ink-3 order-2 sm:order-1">
                      Updating password terminates other active web sessions.
                    </span>
                    <Button
                      type="submit"
                      variant="primary"
                      size="default"
                      className="min-h-[44px] h-11 px-7 rounded-full text-[14px] font-medium w-full sm:w-auto order-1 sm:order-2"
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
        </main>
      </div>
    </div>
  );
}
