import { db } from "../src/lib/db";

async function main() {
  console.log("Applying optimized indexes to Neon PostgreSQL...");

  const queries = [
    // Client indexes
    `CREATE INDEX IF NOT EXISTS "clients_companyId_deletedAt_createdAt_idx" ON "clients"("companyId", "deletedAt", "createdAt" DESC);`,
    `CREATE INDEX IF NOT EXISTS "clients_companyId_email_idx" ON "clients"("companyId", "email");`,
    `DROP INDEX IF EXISTS "clients_companyId_idx";`,

    // Invoice indexes
    `CREATE INDEX IF NOT EXISTS "invoices_clientId_idx" ON "invoices"("clientId");`,
    `CREATE INDEX IF NOT EXISTS "invoices_companyId_clientId_idx" ON "invoices"("companyId", "clientId");`,
    `CREATE INDEX IF NOT EXISTS "invoices_companyId_status_dueDate_idx" ON "invoices"("companyId", "status", "dueDate");`,
    `CREATE INDEX IF NOT EXISTS "invoices_companyId_issueDate_idx" ON "invoices"("companyId", "issueDate" DESC);`,
    `CREATE INDEX IF NOT EXISTS "invoices_companyId_status_paidAt_idx" ON "invoices"("companyId", "status", "paidAt");`,
    `DROP INDEX IF EXISTS "invoices_viewToken_idx";`,

    // Expense indexes
    `CREATE INDEX IF NOT EXISTS "expenses_companyId_isPaid_dueDate_idx" ON "expenses"("companyId", "isPaid", "dueDate");`,
    `CREATE INDEX IF NOT EXISTS "expenses_companyId_category_dueDate_idx" ON "expenses"("companyId", "category", "dueDate");`,

    // Transaction indexes
    `CREATE INDEX IF NOT EXISTS "transactions_invoiceId_idx" ON "transactions"("invoiceId");`,
    `CREATE INDEX IF NOT EXISTS "transactions_companyId_invoiceId_idx" ON "transactions"("companyId", "invoiceId");`,

    // AuditLog indexes
    `CREATE INDEX IF NOT EXISTS "audit_logs_companyId_userId_idx" ON "audit_logs"("companyId", "userId");`,
    `CREATE INDEX IF NOT EXISTS "audit_logs_companyId_entityType_entityId_idx" ON "audit_logs"("companyId", "entityType", "entityId");`,
  ];

  for (const q of queries) {
    console.log(`Executing: ${q}`);
    await db.$executeRawUnsafe(q);
  }

  console.log("All indexes applied successfully to Neon PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("Failed to apply indexes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
