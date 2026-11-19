import { describe, it, expect } from "bun:test";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  categorizeError,
  formatUserError,
  isDatabaseOrNetworkError,
} from "../src/lib/errors";

describe("FinFlow Error Classification & Sanitization System", () => {
  it("sanitizes raw PrismaClientInitializationError (Can't reach database server)", () => {
    const rawError = new Prisma.PrismaClientInitializationError(
      "\nInvalid `prisma.invoice.findFirst()` invocation:\n\nCan't reach database server at `ep-rapid-wind-123456.us-east-2.aws.neon.tech`\n\nPlease check your network connection or verify that the database server is running.",
      "5.22.0",
      "P1001"
    );

    const parsed = categorizeError(rawError);
    expect(parsed.code).toBe("DATABASE_UNAVAILABLE");
    expect(parsed.isNetworkOrDb).toBe(true);
    expect(parsed.userMessage).toContain("Unable to connect to the database");
    expect(parsed.userMessage).not.toContain("ep-rapid-wind");
    expect(parsed.userMessage).not.toContain("neon.tech");

    const formatted = formatUserError(rawError);
    expect(formatted).toBe("Unable to connect to the database. Please check your internet connection and try again.");
    expect(isDatabaseOrNetworkError(rawError)).toBe(true);
  });

  it("sanitizes PrismaClientKnownRequestError P1001 (Connection failure)", () => {
    const p1001 = new Prisma.PrismaClientKnownRequestError(
      "Can't reach database server at ep-rapid-wind-pooler.neon.tech:5432",
      {
        code: "P1001",
        clientVersion: "5.22.0",
      }
    );

    const parsed = categorizeError(p1001);
    expect(parsed.code).toBe("DATABASE_UNAVAILABLE");
    expect(parsed.isNetworkOrDb).toBe(true);
    expect(parsed.userMessage).toContain("Unable to reach the database server");
    expect(parsed.userMessage).not.toContain("5432");
    expect(parsed.userMessage).not.toContain("ep-rapid-wind");
  });

  it("sanitizes Prisma P1017 (Server closed connection) and P2024 (Pool timeout)", () => {
    const p1017 = new Prisma.PrismaClientKnownRequestError("Server has closed the connection.", {
      code: "P1017",
      clientVersion: "5.22.0",
    });
    expect(isDatabaseOrNetworkError(p1017)).toBe(true);
    expect(formatUserError(p1017)).toContain("Unable to reach the database server");

    const p2024 = new Prisma.PrismaClientKnownRequestError(
      "Timed out fetching a new connection from the connection pool.",
      {
        code: "P2024",
        clientVersion: "5.22.0",
      }
    );
    expect(isDatabaseOrNetworkError(p2024)).toBe(true);
    expect(formatUserError(p2024)).toContain("Unable to reach the database server");
  });

  it("sanitizes Prisma P2028 / P1002 (Transaction timeout)", () => {
    const timeoutError = new Prisma.PrismaClientKnownRequestError(
      "Transaction API error: Transaction already closed: Transaction timed out.",
      {
        code: "P2028",
        clientVersion: "5.22.0",
      }
    );

    const parsed = categorizeError(timeoutError);
    expect(parsed.code).toBe("DATABASE_TIMEOUT");
    expect(parsed.isNetworkOrDb).toBe(true);
    expect(parsed.userMessage).toContain("The request took longer than expected");
  });

  it("sanitizes Prisma P2002 (Unique constraint violation)", () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`companyId`,`invoiceNumber`)",
      {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["invoiceNumber"] },
      }
    );

    const parsed = categorizeError(uniqueError);
    expect(parsed.code).toBe("CONFLICT_DUPLICATE");
    expect(parsed.isNetworkOrDb).toBe(false);
    expect(parsed.userMessage).toContain("A invoiceNumber with this information already exists");
  });

  it("sanitizes Prisma P2025 (Record not found) and P2003 (Foreign key restriction)", () => {
    const p2025 = new Prisma.PrismaClientKnownRequestError(
      "An operation failed because it depends on one or more records that were required but not found.",
      {
        code: "P2025",
        clientVersion: "5.22.0",
      }
    );
    expect(categorizeError(p2025).code).toBe("RECORD_NOT_FOUND");
    expect(formatUserError(p2025)).toBe("The requested record could not be found or has already been removed.");

    const p2003 = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint failed on the field: `clientId`",
      {
        code: "P2003",
        clientVersion: "5.22.0",
      }
    );
    expect(categorizeError(p2003).code).toBe("FOREIGN_KEY_RESTRICTION");
    expect(formatUserError(p2003)).toContain("dependent financial records");
  });

  it("sanitizes network socket errors (ENOTFOUND, ETIMEDOUT, fetch failed)", () => {
    const networkError = new Error("fetch failed: getaddrinfo ENOTFOUND ep-rapid-wind.neon.tech");
    expect(isDatabaseOrNetworkError(networkError)).toBe(true);
    const msg = formatUserError(networkError);
    expect(msg).toBe("Unable to connect to the database. Please check your internet connection and try again.");
    expect(msg).not.toContain("getaddrinfo");
    expect(msg).not.toContain("neon.tech");
  });

  it("never leaks raw SQL queries or database passwords", () => {
    const sqlError = new Error(
      'SELECT * FROM "invoices" WHERE "companyId" = \'cmp_123\' AND "secret" = \'super_secret\' failed: database server connection reset'
    );
    const formatted = formatUserError(sqlError);
    expect(formatted).not.toContain("SELECT");
    expect(formatted).not.toContain("secret");
    expect(formatted).not.toContain("super_secret");
    expect(formatted).toBe("Unable to connect to the database. Please check your internet connection and try again.");
  });

  it("handles Zod validation errors cleanly", () => {
    const schema = z.object({ amount: z.number().positive("Amount must be positive") });
    try {
      schema.parse({ amount: -10 });
    } catch (err) {
      const parsed = categorizeError(err);
      expect(parsed.code).toBe("VALIDATION_ERROR");
      expect(parsed.userMessage).toContain("Amount must be positive");
    }
  });

  it("handles auth expiration messages cleanly", () => {
    const authError = new Error("Unauthorized: Please sign in to manage invoices.");
    const parsed = categorizeError(authError);
    expect(parsed.code).toBe("AUTH_UNAUTHORIZED");
    expect(parsed.userMessage).toBe("You must be signed in to perform this action.");
  });
});
