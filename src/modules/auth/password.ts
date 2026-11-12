import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

/**
 * Hashes a plain-text password using Node.js native crypto scrypt with a random 16-byte salt.
 * Result format: `${saltHex}:${derivedKeyHex}`
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plain-text password against a stored scrypt hash using timingSafeEqual to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash || typeof password !== "string" || typeof storedHash !== "string") {
    return false;
  }

  try {
    const parts = storedHash.split(":");
    if (parts.length !== 2) {
      return false;
    }

    const [salt, key] = parts;
    if (
      !salt ||
      !key ||
      key.length < 32 ||
      salt.length < 16 ||
      !/^[0-9a-fA-F]+$/.test(key) ||
      !/^[0-9a-fA-F]+$/.test(salt)
    ) {
      return false;
    }

    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = (await scryptAsync(password, salt, keyBuffer.length)) as Buffer;

    if (keyBuffer.length !== derivedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}
