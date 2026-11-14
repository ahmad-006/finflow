import bcrypt from "bcryptjs";

/**
 * Hashes a plain-text password using standard bcrypt with 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  return await bcrypt.hash(password, 10);
}

/**
 * Verifies a plain-text password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash || typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }
  try {
    return await bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}
