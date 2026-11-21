import { db } from "@/lib/db";
import type { User, Company } from "@prisma/client";

export type UserWithCompany = User & { company: Company };

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
  [key: string]: unknown;
}

export interface GoogleTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
}

export const OAUTH_STATE_COOKIE_NAME = "finflow_oauth_state";
export const OAUTH_STATE_MAX_AGE_SECONDS = 600;

/**
 * Resolves the absolute OAuth callback redirect URI using the host header.
 */
export function getOAuthRedirectUri(host: string): string {
  if (!host) {
    const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${defaultAppUrl.replace(/\/$/, "")}/api/auth/callback/google`;
  }

  if (host.startsWith("http://") || host.startsWith("https://")) {
    return `${host.replace(/\/$/, "")}/api/auth/callback/google`;
  }

  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const protocol = isLocal ? "http" : "https";
  return `${protocol}://${host}/api/auth/callback/google`;
}

/**
 * Builds Google OAuth 2.0 consent URL.
 */
export function getGoogleOAuthUrl(host: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID environment variable.");
  }

  const redirectUri = getOAuthRedirectUri(host);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: state,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges authorization code for Google access and refresh tokens.
 */
export async function exchangeGoogleCode(code: string, host: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET).");
  }

  const redirectUri = getOAuthRedirectUri(host);

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google code exchange failed (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as GoogleTokens;
}

/**
 * Fetches user profile data from Google UserInfo endpoint.
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserProfile> {
  if (!accessToken) {
    throw new Error("Missing access token for fetching Google user profile.");
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google userinfo fetch failed (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as GoogleUserProfile;
}

/**
 * Handles Google OAuth login or signup:
 * 1. If user exists by googleId: return user.
 * 2. If user exists by email without googleId: link user.googleId = profile.sub, set emailVerified = true, update user, return user.
 * 3. If user does not exist: atomically create Company and User with emailVerified = true, return user.
 */
export async function handleGoogleLoginOrSignup(profile: {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<UserWithCompany> {
  const normalizedEmail = profile.email.toLowerCase().trim();

  // 1. If user exists by googleId: return user
  const userByGoogleId = await db.user.findUnique({
    where: { googleId: profile.sub },
    include: { company: true },
  });

  if (userByGoogleId) {
    return userByGoogleId as UserWithCompany;
  }

  // 2. If user exists by email without googleId: link user.googleId = profile.sub, set emailVerified = true, update user, return user
  const userByEmail = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { company: true },
  });

  if (userByEmail) {
    const updatedUser = await db.user.update({
      where: { id: userByEmail.id },
      data: {
        googleId: profile.sub,
        emailVerified: true,
        ...(profile.picture && !userByEmail.avatarUrl ? { avatarUrl: profile.picture } : {}),
      },
      include: { company: true },
    });
    return updatedUser as UserWithCompany;
  }

  // 3. If user does not exist: atomically create Company and User
  const companyName = profile.name?.trim() ? `${profile.name.trim()}'s Company` : "FinFlow Company";
  const fullName = profile.name?.trim() || normalizedEmail.split("@")[0] || "User";

  const newUser = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        baseCurrency: "PKR",
      },
    });

    const user = await tx.user.create({
      data: {
        companyId: company.id,
        email: normalizedEmail,
        fullName,
        role: "OWNER",
        authProvider: "GOOGLE",
        googleId: profile.sub,
        avatarUrl: profile.picture || null,
        emailVerified: true,
        onboardingCompleted: false,
        passwordHash: null,
      },
      include: { company: true },
    });

    return user;
  }, { timeout: 30000, maxWait: 20000 });

  return newUser as UserWithCompany;
}
