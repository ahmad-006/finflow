# FinFlow — Next.js 16 & SQLite Master Implementation Plan
## Business Cash Flow Intelligence & Invoice SaaS
**Student:** Ahmad Aamir (`AF25LHB4554`)  
**Course:** CS2682 — Web Application Development  
**Architectural Paradigm:** Domain-Driven Modular Monolith (Clean Architecture) on Next.js 16 App Router + SQLite (Prisma ORM)  
**Status:** Living Engineering Blueprint & Execution Roadmap (Revised & Hardened for SQLite-First Architecture)  

---

## Table of Contents
1. [Executive Summary & Architectural Paradigm](#1-executive-summary--architectural-paradigm)
2. [Target Tech Stack & Tooling](#2-target-tech-stack--tooling)
3. [Next.js 16 Core Architectural Primitives & Guidelines](#3-nextjs-16-core-architectural-primitives--guidelines)
   - [3.1 Request Interception via `proxy.ts` (Node.js Runtime)](#31-request-interception-via-proxyts-nodejs-runtime)
   - [3.2 Top-Level Cache Components (`cacheComponents: true`)](#32-top-level-cache-components-cachecomponents-true)
   - [3.3 Multi-Tenant Cache Isolation & Serialization Standards](#33-multi-tenant-cache-isolation--serialization-standards)
   - [3.4 Read-Your-Writes Mutation Model (`updateTag`)](#34-read-your-writes-mutation-model-updatetag)
   - [3.5 Strict Asynchronous Request APIs](#35-strict-asynchronous-request-apis)
4. [Global Database Topology & Relational Integrity (SQLite 3NF)](#4-global-database-topology--relational-integrity-sqlite-3nf)
   - [4.1 Comprehensive Staged Prisma Schema](#41-comprehensive-staged-prisma-schema)
   - [4.2 Entity-Relationship Architecture](#42-entity-relationship-architecture)
   - [4.3 Double-Entry Cash Source of Truth](#43-double-entry-cash-source-of-truth)
   - [4.4 Cloud Portability to PostgreSQL](#44-cloud-portability-to-postgresql)
5. [The Cash Flow Intelligence & Forecasting Engine](#5-the-cash-flow-intelligence--forecasting-engine)
   - [5.1 Mathematical Model (Opening Cash, Overdue Pool & Outflows)](#51-mathematical-model-opening-cash-overdue-pool--outflows)
   - [5.2 Client Payment Latency & Trend Modeling](#52-client-payment-latency--trend-modeling)
   - [5.3 Runway & Deficit Alert Calculation](#53-runway--deficit-alert-calculation)
6. [Phase-by-Phase Modular Implementation Plan](#6-phase-by-phase-modular-implementation-plan)
   - [Phase 0: Infrastructure, Base Scaffolding & SQLite Prisma Connection](#phase-0-infrastructure-base-scaffolding--sqlite-prisma-connection)
   - [Phase 1: Domain 1 — Multi-Tenant Identity & Auth Service (`auth-tenant`)](#phase-1-domain-1--multi-tenant-identity--auth-service-auth-tenant)
   - [Phase 2: Domain 2 — Client Directory & Accounts Receivable Ledger (`clients-crm`)](#phase-2-domain-2--client-directory--accounts-receivable-ledger-clients-crm)
   - [Phase 3: Domain 3 — Invoicing Engine & Spot Multi-Currency Service (`invoicing`)](#phase-3-domain-3--invoicing-engine--spot-multi-currency-service-invoicing)
   - [Phase 4: Domain 4 — Document Generation & Public Tokenized Portal (`documents`)](#phase-4-domain-4--document-generation--public-tokenized-portal-documents)
   - [Phase 5: Domain 5 — Expense Management & Scheduled Outflows (`expenses`)](#phase-5-domain-5--expense-management--scheduled-outflows-expenses)
   - [Phase 6: Domain 6 — Treasury Ledger & 30-Day Forward Forecast Engine (`treasury-forecast`)](#phase-6-domain-6--treasury-ledger--30-day-forward-forecast-engine-treasury-forecast)
   - [Phase 7: Domain 7 — Visual Calendar & Scheduling Service (`calendar`)](#phase-7-domain-7--visual-calendar--scheduling-service-calendar)
   - [Phase 8: Domain 8 — Real-Time State Sync & Client Reminders (`notifications-sync`)](#phase-8-domain-8--real-time-state-sync--client-reminders-notifications-sync)
   - [Phase 9: Domain 9 — Production Hardening, Security Audit & E2E Testing (`audit-testing`)](#phase-9-domain-9--production-hardening-security-audit--e2e-testing-audit-testing)
7. [Phase 10: Academic Viva Defense & Examination Blueprint](#7-phase-10-academic-viva-defense--examination-blueprint)
8. [Execution Protocol: Strict Phase Gate Workflow](#8-execution-protocol-strict-phase-gate-workflow)

---

## 1. Executive Summary & Architectural Paradigm

FinFlow is a specialized FinTech SaaS engineered to solve the existential liquidity crisis facing Small and Medium Enterprises (SMEs). Standard accounting packages focus on backward-looking accrual accounting, recognizing revenue when invoices are issued regardless of collection dates. Basic spreadsheets fail to model dynamic forward liquidity, leaving business owners blind to impending cash crunches.

FinFlow operates as a forward-looking liquid treasury cockpit:
1. **Dynamic Liquidity Forecasting:** Models daily forward cash over a 30-day horizon factoring in opening cash, historical payment latencies, and scheduled business expenses.
2. **Deficit Warning System:** Triggers alerts when projected cash breaches the company's designated safety buffer.
3. **Atomic Multi-Currency Billing:** Issues multi-line invoices with spot currency rates backed by ACID transactions.
4. **Zero-Flicker Asynchronous Operations:** Optimistic UI state mutations, instant client-side PDF compilation, and public tokenized payment verification.
5. **Zero-Friction Local Persistence:** Powered by an ACID-compliant **SQLite** database via Prisma ORM for 100% offline portability and instant academic evaluation, with seamless one-line migration to PostgreSQL for cloud production.

### Architectural Classification: Domain-Driven Modular Monolith
To remain academically honest and architecturally rigorous, FinFlow is designed as a **Domain-Driven Modular Monolith (Clean Architecture)**:
* **Single Deployment Unit:** Next.js 16 App Router application.
* **Autonomous Domain Boundaries:** Pure business logic segregated in `src/modules/<domain>/` with explicit DTOs and Data Access Layer (DAL) methods.
* **Shared Relational Persistence:** A single SQLite database enforcing strict foreign keys, multi-tenant isolation, and 3NF normalization.

```
finflow/
├── next.config.ts                # Next.js 16 Config (cacheComponents: true, Turbopack)
├── proxy.ts                      # Next.js 16 Request Interceptor (Node.js runtime)
├── prisma/
│   ├── schema.prisma             # Relational 3NF SQLite Database Schema
│   └── dev.db                    # Zero-config local SQLite database
├── src/
│   ├── app/                      # App Router (RSC, Route Handlers, Layouts)
│   │   ├── (auth)/               # Tenant auth route group
│   │   ├── (dashboard)/          # Authenticated cockpit
│   │   ├── pay/                  # Public tokenized invoice portal (guest view)
│   │   └── api/                  # REST, SSE, and Cron endpoints
│   ├── modules/                  # Isolated Domain Modules
│   │   ├── auth/                 # Domain 1: Multi-Tenant Identity, RBAC, Sessions
│   │   ├── clients/              # Domain 2: Client CRM, A/R Ledger, Aging Buckets
│   │   ├── invoices/             # Domain 3: Atomic Invoicing Engine & FX Rates
│   │   ├── documents/            # Domain 4: jsPDF Client-Side Export & Public Portal
│   │   ├── expenses/             # Domain 5: Operational Outflows & Recurring Costs
│   │   ├── treasury/             # Domain 6: 30-Day Forward Forecast & Runway
│   │   ├── calendar/             # Domain 7: Due-Date Scheduling & Visual Feed
│   │   └── notifications/        # Domain 8: Optimistic Sync & Payment Reminders
│   ├── components/               # Shared shadcn/ui & Tailwind primitives
│   ├── lib/                      # Prisma client singleton, DAL, currency & date utils
│   └── types/                    # Shared TypeScript interfaces & Zod schemas
```

---

## 2. Target Tech Stack & Tooling

| Tier | Technology | Selected Version & Specification |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16** | App Router, Turbopack, React 19 Server Components, Server Actions |
| **Runtime & PM** | **Bun 1.4+** | Fast package management, script execution, and test runtime |
| **Language** | **TypeScript 5.x** | Strict Mode (`noImplicitAny`, `strictNullChecks`) |
| **Database** | **SQLite 3** | ACID relational engine, foreign keys, local zero-config `dev.db` file (100% offline viva-ready) |
| **ORM** | **Prisma ORM 7.x / 8.x** | Type-safe migrations, connection singleton, `$transaction` |
| **Math Precision** | **`decimal.js`** | Strict arbitrary-precision arithmetic for all monetary and FX calculations |
| **Styling & UI** | **Tailwind CSS v4 + shadcn/ui** | Pure utility CSS, accessible Radix UI primitives, strictly light-only |
| **Charts** | **Chart.js + react-chartjs-2** | Declarative, responsive canvas/SVG charts for liquidity curves |
| **Calendar Engine** | **FullCalendar.js (React)** | Interactive billing and maturity schedule |
| **PDF Generation** | **jsPDF + AutoTable** | Client-side vector PDF generation with embedded UTF-8 font |
| **External APIs** | **ExchangeRate-API** | Spot currency conversion cached with TTL |
| **Testing** | **Vitest / Bun test + Playwright** | Fast unit testing and end-to-end browser journey verification |

---

## 3. Next.js 16 Core Architectural Primitives & Guidelines

### 3.1 Request Interception via `proxy.ts` (Node.js Runtime)
Next.js 16 replaces the deprecated Edge-only `middleware.ts` with **`proxy.ts`**, which runs on the Node.js runtime by default:
* Evaluates incoming requests before reaching route handlers.
* Sanitizes headers to prevent client header injection (`x-company-id` must be overwritten).
* Intercepts unauthenticated sessions and redirects to `/login`.

### 3.2 Top-Level Cache Components (`cacheComponents: true`)
In Next.js 16, `cacheComponents` is a top-level stable configuration in `next.config.ts`:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    // Enabled by default in Next.js 16
  },
};

export default nextConfig;
```

### 3.3 Multi-Tenant Cache Isolation & Serialization Standards
1. **Never read `cookies()` or `headers()` inside `'use cache'`:** Next.js 16 enforces this compiler rule to prevent cross-tenant data leaks.
2. **Pass tenant primitives as arguments:** Tenant ID (`companyId`) must be passed explicitly into cached functions so it becomes part of the cache key.
3. **Strict Serialization:** Functions with `'use cache'` must return plain, JSON-serializable primitives.
4. **Explicit Tagging:** Tag tenant caches with `cacheTag('company-${companyId}-${domain}')`.

### 3.4 Read-Your-Writes Mutation Model (`updateTag`)
When a mutation occurs (e.g., marking an invoice as paid), use Next.js 16's `updateTag()` to bust the cache immediately for the active request and update downstream UI components without stale cache lag.

### 3.5 Strict Asynchronous Request APIs
All route parameters, search parameters, cookies, and headers are strictly asynchronous promises (`await params`, `await cookies()`).

---

## 4. Global Database Topology & Relational Integrity (SQLite 3NF)

### 4.1 Comprehensive Staged Prisma Schema
The schema is strictly normalized to 3NF, uses `Float` columns for SQLite persistence, arbitrary precision in business logic via `decimal.js`, and restricts cascading deletes on financial records (`onDelete: Restrict`).

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Company {
  id            String   @id @default(uuid())
  name          String
  baseCurrency  String   @default("PKR")
  liquidReserve Float    @default(0.0)
  safetyBuffer  Float    @default(0.0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  users        User[]
  clients      Client[]
  invoices     Invoice[]
  invoiceItems InvoiceItem[]
  expenses     Expense[]
  transactions Transaction[]
  auditLogs    AuditLog[]

  @@map("companies")
}

model User {
  id           String   @id @default(uuid())
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  email        String   @unique
  passwordHash String
  fullName     String
  role         String   @default("OWNER")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([companyId])
  @@map("users")
}

model Client {
  id                String    @id @default(uuid())
  companyId         String
  company           Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  clientName        String
  email             String
  phone             String?
  address           String?
  paymentTermsDays  Int       @default(30)
  riskStatus        String    @default("HEALTHY")
  deletedAt         DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  invoices Invoice[]

  @@index([companyId])
  @@index([companyId, deletedAt])
  @@map("clients")
}

model Invoice {
  id              String    @id @default(uuid())
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  clientId        String
  client          Client    @relation(fields: [clientId], references: [id], onDelete: Restrict)
  invoiceNumber   String
  viewToken       String    @unique @default(uuid())
  currency        String    @default("PKR")
  exchangeRate    Float     @default(1.0)
  issueDate       DateTime
  dueDate         DateTime
  subtotal        Float     @default(0.0)
  taxRate         Float     @default(0.0)
  taxAmount       Float     @default(0.0)
  totalAmount     Float     @default(0.0)
  baseTotalAmount Float     @default(0.0)
  paidAmount      Float     @default(0.0)
  status          String    @default("DRAFT")
  notes           String?
  paidAt          DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  items        InvoiceItem[]
  transactions Transaction[]
  reminders    ReminderLog[]

  @@unique([companyId, invoiceNumber])
  @@index([companyId, status])
  @@index([companyId, dueDate])
  @@index([viewToken])
  @@map("invoices")
}

model InvoiceItem {
  id          String   @id @default(uuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description String
  quantity    Float    @default(1.0)
  unitPrice   Float    @default(0.0)
  lineTotal   Float    @default(0.0)
  createdAt   DateTime @default(now())

  @@index([companyId])
  @@index([invoiceId])
  @@map("invoice_items")
}

model Expense {
  id         String    @id @default(uuid())
  companyId  String
  company    Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  title      String
  category   String
  amount     Float
  dueDate    DateTime
  recurrence String    @default("NONE")
  isPaid     Boolean   @default(false)
  paidAt     DateTime?
  notes      String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([companyId, dueDate])
  @@index([companyId, isPaid])
  @@map("expenses")
}

model Transaction {
  id              String   @id @default(uuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invoiceId       String?
  invoice         Invoice? @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  type            String
  amount          Float
  baseAmount      Float
  transactionDate DateTime @default(now())
  category        String
  paymentMethod   String   @default("BANK_TRANSFER")
  reference       String?
  createdAt       DateTime @default(now())

  @@index([companyId, transactionDate])
  @@map("transactions")
}

model ReminderLog {
  id             String   @id @default(uuid())
  invoiceId      String
  invoice        Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  recipientEmail String
  status         String
  sentAt         DateTime @default(now())

  @@index([invoiceId])
  @@map("reminder_logs")
}

model AuditLog {
  id         String   @id @default(uuid())
  companyId  String
  company    Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  userId     String?
  entityType String
  entityId   String
  action     String
  details    String?
  timestamp  DateTime @default(now())

  @@index([companyId, timestamp])
  @@map("audit_logs")
}
```

### 4.4 Cloud Portability to PostgreSQL
The schema is built for seamless portability: switching to PostgreSQL only requires changing `provider = "sqlite"` to `provider = "postgresql"`, updating `url` to a PostgreSQL connection string, and mapping `Float` to `@db.Decimal(14, 2)`.

---

## 5. The Cash Flow Intelligence & Forecasting Engine

### 5.1 Mathematical Model (Opening Cash, Overdue Pool & Outflows)
FinFlow models rolling liquidity over 30 days:
$$\text{Projected Balance}(t) = \text{Liquid Reserve}_0 + \text{Overdue Recovery Pool} + \sum_{d=1}^{t} \text{Expected Inflows}(d) - \sum_{d=1}^{t} \text{Scheduled Outflows}(d)$$

* **Overdue Pool (Day 0):** Unpaid invoices past due date are captured on Day 0 with a collection haircut factor ($\alpha = 0.70$), preventing them from vanishing.
* **Maturing Inflows:** Unpaid invoices due on day $d$, adjusted for historical client latency.
* **Scheduled Outflows:** One-off and recurring operational expenditures due on day $d$.
* **Deficit Alert:** Flagged whenever projected balance dips below `Company.safetyBuffer`.

---

## 6. Execution Roadmap & Phase Gates

- [ ] **Phase 0:** Infrastructure, Base Scaffolding & SQLite Connection Singleton
- [ ] **Phase 1:** Multi-Tenant Identity & Auth Service (`auth-tenant`)
- [ ] **Phase 2:** Client Directory & Accounts Receivable Ledger (`clients-crm`)
- [ ] **Phase 3:** Invoicing Engine & Spot Multi-Currency Service (`invoicing`)
- [ ] **Phase 4:** Document Generation & Public Tokenized Portal (`documents`)
- [ ] **Phase 5:** Expense Management & Scheduled Outflows (`expenses`)
- [ ] **Phase 6:** Treasury Ledger & 30-Day Forward Forecast Engine (`treasury-forecast`)
- [ ] **Phase 7:** Visual Calendar & Scheduling Service (`calendar`)
- [ ] **Phase 8:** Real-Time State Sync & Client Reminders (`notifications-sync`)
- [ ] **Phase 9:** Production Hardening, Security Audit & E2E Testing (`audit-testing`)
- [ ] **Phase 10:** Academic Viva Defense & Examination Master Readiness

---
*FinFlow Engineering Plan revised and hardened on November 12, 2026 for Ahmad Aamir (AF25LHB4554).*
