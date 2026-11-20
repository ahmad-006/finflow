import crypto from "node:crypto";

const TOKEN_PEPPER = process.env.SESSION_SECRET || "finflow-otp-token-secret-salt-2026";

/**
 * Computes a secure SHA-256 HMAC hash of a plaintext token or 6-digit OTP.
 * Plaintext codes are never stored in the database.
 */
export function hashToken(plainToken: string): string {
  return crypto
    .createHmac("sha256", TOKEN_PEPPER)
    .update(plainToken.trim())
    .digest("hex");
}

/**
 * Validates a candidate plaintext code against a stored cryptographic hash.
 * Uses timingSafeEqual to prevent side-channel timing attacks.
 */
export function verifyTokenHash(candidate: string, storedHash: string): boolean {
  try {
    const candidateHash = hashToken(candidate);
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");

    if (candidateBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP (100000 - 999999).
 */
export function generateNumericOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generates a cryptographically secure random url-safe token (e.g. for reset links).
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}
