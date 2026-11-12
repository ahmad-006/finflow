# AGENTS.md — Remote Agentic Operating Manual
## FinFlow Repository Directives for Autonomous AI Agents

> **Notice to Autonomous Coding Agents (Google Jules, GitHub Copilot Agents, Antigravity Swarms):**  
> You are operating on the **FinFlow** codebase. Read this document in full before generating, refactoring, or submitting pull requests.

---

### 1. Mandatory Technical Constraints & Next.js 16 Standards

* **Framework:** **Next.js 16 (App Router)** with **Turbopack** and **React 19**.
  * **Runtime & Package Manager:** **Bun** (`bun install`, `bun run dev`, `bun test`).
  * **Request Interception:** Use **`proxy.ts`** running on the Node.js runtime. **DO NOT** use deprecated `middleware.ts`.
  * **Caching Standard:** `cacheComponents: true` is enabled at top-level in `next.config.ts`.
  * **Cache Components (`'use cache'`):**
    * Use explicit `cacheLife()` and `cacheTag('company-${companyId}-${domain}')`.
    * **DO NOT** read `cookies()` or `headers()` inside a standard `'use cache'` scope (throws compiler error to prevent cross-tenant data leaks). Read them outside and pass `companyId` as a function argument.
    * **Serialization Requirement:** All functions marked with `'use cache'` MUST return plain JSON-serializable primitives. Convert `Decimal` instances to strings (`dec.toString()`) and `Date` instances to ISO strings (`date.toISOString()`).
    * **Read-Your-Writes:** Use **`updateTag()`** on mutations to invalidate and refresh active tenant caches immediately.
  * **Asynchronous Request APIs:** Dynamic route params, search params, cookies, and headers are strictly **asynchronous** (`await params`, `await searchParams`, `await cookies()`, `await headers()`).
* **Database & Persistence:** **SQLite 3** (local zero-config `file:./dev.db`) managed via **Prisma ORM**.
  * **Strict Decimal Math:** Monetary columns are persisted as `Float` in SQLite, but all business domain math MUST be executed via `decimal.js` methods (`.add()`, `.sub()`, `.mul()`, `.div()`) to guarantee accounting precision. Never use raw JS operators `+`, `-`, `*`, `/` on currency figures.
  * **Type-Safe Enums:** Stored as `String` in SQLite and strictly typed at the TypeScript layer via string literal unions (e.g., `type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED"`).
  * **Multi-Tenant Isolation:** Every table (including `InvoiceItem` and `Expense`) MUST include a `companyId` foreign key and be indexed.
  * **Atomic Transactions:** Invoice creation, status updates, and expense payments MUST use `prisma.$transaction` for ACID atomicity.
  * **Relational Restraint:** `Invoice -> Client` relation MUST use `onDelete: Restrict`. Never cascade-delete historical financial records.
  * **Cloud Portability:** The schema is structured so changing `provider = "sqlite"` to `"postgresql"` requires zero architectural redesign.
* **UI & Styling:** Tailwind CSS v4 + shadcn/ui strictly following [`FINFLOW_UI_DESIGN_SYSTEM.md`](./FINFLOW_UI_DESIGN_SYSTEM.md).
  * **Light Theme Only:** FinFlow ships light only. DO NOT install `next-themes`; DO NOT write `dark:` classes.
  * **No Emoji in UI:** Emoji must never appear in product interfaces, headings, or components.
  * Use React 19 `useActionState` and `useOptimistic` for instant UI state changes.
  * Pure Tailwind utility classes only — **DO NOT** mix Bootstrap classes.
* **Public Payment Links:** All client-facing email reminders and links MUST use the unauthenticated tokenized route `/pay/[token]`, NOT the authenticated `/invoices/[id]` path.

---

### 2. Architectural Blueprint & Phase Gate Protocol

FinFlow follows a strict **Phase Gate Protocol** documented in [`FINFLOW_MASTER_PLAN.md`](./FINFLOW_MASTER_PLAN.md):

* **Rule 1 — Phase Lock:** You may ONLY implement or modify code for the phase explicitly specified in your task prompt. Do NOT pre-implement features for future phases.
* **Rule 2 — Mandatory Per-Phase Testing:** Every phase MUST include automated unit and integration tests.
* **Rule 3 — Definition of Done (DoD):** Before submitting a PR or marking a task complete, verify that every item in that phase's DoD checklist passes.
* **Rule 4 — Verification Commands:**
  ```bash
  bun run build       # Must compile cleanly with Turbopack and strict TypeScript
  bun run lint        # Zero ESLint or ui-lint warnings or errors
  bun test            # 100% of unit & integration tests must pass
  bunx prisma validate # Database schema must remain 100% valid
  ```

---

### 3. Modular Monolith Domain Structure

Place code inside autonomous domain modules under `src/modules/`:
```
src/modules/
├── auth/          # Domain 1: Tenant Identity, RBAC, Sessions, proxy.ts
├── clients/       # Domain 2: Client CRM, A/R Ledger, 5-Bucket Aging
├── invoices/      # Domain 3: Atomic Invoicing Engine & Spot Currency Rates
├── documents/     # Domain 4: jsPDF Client-Side Export & Public Token Portal (/pay/[token])
├── expenses/      # Domain 5: Operational Outflows & Recurring Expense Schedules
├── treasury/      # Domain 6: 30-Day Forward Forecast, Overdue Pool & Runway Engine
├── calendar/      # Domain 7: FullCalendar Due-Date Schedule & Visual Feed
└── notifications/ # Domain 8: React 19 Optimistic Sync & 1-Click EmailJS Reminders
```

---

### 4. Git & PR Conventions

* **Branch Naming:** `feat/phase-[N]-[domain-name]` (e.g., `feat/phase-0-scaffolding`, `feat/phase-5-expenses`)
* **Commit Message Format:** Conventional commits (e.g., `feat(expenses): add recurring expense expansion service`)
* **PR Description:** Summarize the phase implemented, list files added/modified, and provide verification evidence (`bun run build` and `bun test` output).
