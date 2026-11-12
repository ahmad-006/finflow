# Google Jules System Directives for FinFlow

Welcome, Jules! You are working on FinFlow, an SME cash flow intelligence SaaS.

## Primary Instructions:
1. Refer strictly to `AGENTS.md`, `FINFLOW_UI_DESIGN_SYSTEM.md`, and `FINFLOW_MASTER_PLAN.md` before taking action.
2. Architecture: **Domain-Driven Modular Monolith** on **Next.js 16 (App Router)** and **SQLite (Prisma ORM)**.
3. Next.js 16 Rules:
   - Use `proxy.ts` on the Node.js runtime for request interception (do not use `middleware.ts`).
   - Await all request APIs (`await params`, `await searchParams`, `await cookies()`, `await headers()`).
   - Use `'use cache'` with `cacheTag` and `cacheLife`. Do not call `cookies()` inside `'use cache'`.
   - Functions with `'use cache'` must return JSON-serializable primitives (convert `Decimal` to string, `Date` to ISO string).
   - Use `updateTag()` on mutations for read-your-writes cache invalidation.
4. Financial Precision:
   - Persist monetary fields as `Float` in SQLite, but ALWAYS perform accounting arithmetic via `decimal.js`.
   - Never use JavaScript native floats or `Number()` directly for currency arithmetic.
5. Data Integrity:
   - Client relations must use `onDelete: Restrict` (no cascading wipes of historical invoices).
   - Reminders and public payment links must point to `/pay/[token]`.
6. UI Guidelines:
   - Light theme only (per `FINFLOW_UI_DESIGN_SYSTEM.md`). No dark mode. No emoji in UI.
7. Mandatory Verification:
   - Run `bun run build`, `bun run lint`, and `bun test` before opening any Pull Request.
