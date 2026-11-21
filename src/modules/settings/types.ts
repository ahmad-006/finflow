export interface CompanySettingsInput {
  name: string;
  liquidReserve: number;
  safetyBuffer: number;
}

export interface UserProfileInput {
  fullName: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SettingsActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  data?: T;
}

export type ActionState<T = unknown> = SettingsActionResult<T>;

export interface CompanySettingsRecord {
  id: string;
  name: string;
  baseCurrency: string;
  liquidReserve: number;
  safetyBuffer: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileRecord {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: string;
  emailVerified: boolean;
  authProvider: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InviteMemberInput {
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
}

export interface InvitationRecord {
  id: string;
  companyId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
  invitedByUserId: string;
  createdAt: Date;
}

export interface MemberRecord {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface CompanyMembersAndInvitesResult {
  members: MemberRecord[];
  invitations: InvitationRecord[];
}
