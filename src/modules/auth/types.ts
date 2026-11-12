export type UserRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface SessionPayload {
  userId: string;
  companyId: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

export interface RegisterInput {
  companyName: string;
  fullName: string;
  email: string;
  password: string;
  baseCurrency?: string;
  liquidReserve?: number | string;
  safetyBuffer?: number | string;
  noRedirect?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  noRedirect?: boolean;
}

export interface AuthActionResult<T = unknown> {
  success: boolean;
  error?: string;
  errors?: Record<string, string[]>;
  data?: T;
  redirectUrl?: string;
}

export interface SafeUser {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeCompany {
  id: string;
  name: string;
  baseCurrency: string;
  liquidReserve: string;
  safetyBuffer: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSessionData {
  user: SafeUser;
  company: SafeCompany;
  token: string;
}
