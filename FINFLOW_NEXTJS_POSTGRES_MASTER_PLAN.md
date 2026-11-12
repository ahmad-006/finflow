# FinFlow — Next.js 16 & PostgreSQL Master Implementation Plan
## Business Cash Flow Intelligence & Invoice SaaS
**Student:** Ahmad Aamir (`AF25LHB4554`)  
**Course:** CS2682 — Web Application Development  
**Architectural Paradigm:** Domain-Driven Modular Monolith (Clean Architecture) on Next.js 16 App Router + PostgreSQL  
**Status:** Living Engineering Blueprint & Execution Roadmap (Revised & Hardened)  

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
4. [Global Database Topology & Relational Integrity (PostgreSQL 3NF)](#4-global-database-topology--relational-integrity-postgresql-3nf)
   - [4.1 Comprehensive Staged Prisma Schema](#41-comprehensive-staged-prisma-schema)
   - [4.2 Entity-Relationship Architecture](#42-entity-relationship-architecture)
   - [4.3 Double-Entry Cash Source of Truth](#43-double-entry-cash-source-of-truth)
5. [The Cash Flow Intelligence & Forecasting Engine](#5-the-cash-flow-intelligence--forecasting-engine)
   - [5.1 Mathematical Model (Opening Cash, Overdue Pool & Outflows)](#51-mathematical-model-opening-cash-overdue-pool--outflows)
   - [5.2 Client Payment Latency & Trend Modeling](#52-client-payment-latency--trend-modeling)
   - [5.3 Runway & Deficit Alert Calculation](#53-runway--deficit-alert-calculation)
6. [Phase-by-Phase Modular Implementation Plan](#6-phase-by-phase-modular-implementation-plan)
   - [Phase 0: Infrastructure, Base Scaffolding & Database Connection](#phase-0-infrastructure-base-scaffolding--database-connection)
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

FinFlow is a specialized FinTech SaaS engineered to solve the existential liquidity crisis facing Small and Medium Enterprises (SMEs). Standard accounting packages (QuickBooks, Xero) focus on backward-looking accrual accounting, recognizing revenue when invoices are issued regardless of collection dates. Basic spreadsheets fail to model dynamic forward liquidity, leaving business owners blind to impending cash crunches.

FinFlow operates as a forward-looking liquid treasury cockpit:
1. **Dynamic Liquidity Forecasting:** Models daily forward cash over a 30-day horizon factoring in opening cash, historical payment latencies, and scheduled business expenses.
2. **Deficit Warning System:** Triggers alerts when projected cash breaches the company's designated safety buffer.
3. **Atomic Multi-Currency Billing:** Issues multi-line invoices with spot currency rates backed by PostgreSQL ACID transactions.
4. **Zero-Flicker Asynchronous Operations:** Optimistic UI state mutations, instant client-side PDF compilation, and public tokenized payment verification.

### Architectural Classification: Domain-Driven Modular Monolith
To remain academically honest and architecturally rigorous, FinFlow is designed as a **Domain-Driven Modular Monolith (Clean Architecture)** rather than distributed microservices:
* **Single Deployment Unit:** Deployed as a unified Next.js 16 App Router application.
* **Autonomous Domain Boundaries:** Pure business logic segregated in `src/modules/<domain>/` with explicit DTOs and Data Access Layer (DAL) methods.
* **Shared Relational Persistence:** A single PostgreSQL database enforcing strict foreign keys, multi-tenant isolation, and 3NF normalization.

```
finflow/
├── next.config.ts                # Next.js 16 Config (cacheComponents: true, Turbopack)
├── proxy.ts                      # Next.js 16 Request Interceptor (Node.js runtime)
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
| **Language** | **TypeScript 5.x** | Strict Mode (`noImplicitAny`, `strictNullChecks`) |
| **Database** | **PostgreSQL 15+** | ACID relational engine, `DECIMAL(14,2)` precision, B-Tree indexes |
| **ORM** | **Prisma ORM 6.x** | Type-safe migrations, connection pooling singleton, `$transaction` |
| **Math Precision** | **`decimal.js` / Prisma.Decimal** | Strict arbitrary-precision arithmetic for all monetary and FX calculations |
| **Styling & UI** | **Tailwind CSS + shadcn/ui** | Pure utility CSS, accessible Radix UI primitives |
| **Charts** | **Recharts** | Declarative, responsive React 19 SVG charts for liquidity curves |
| **Calendar Engine** | **FullCalendar.js (React)** | Interactive billing and maturity schedule |
| **PDF Generation** | **jsPDF + AutoTable** | Client-side vector PDF generation with embedded UTF-8 font |
| **External APIs** | **ExchangeRate-API** | Spot currency conversion cached with TTL |
| **Testing** | **Vitest + Playwright** | Fast unit testing and end-to-end browser journey verification |

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
3. **Strict Serialization:** Functions with `'use cache'` must return plain, JSON-serializable primitives. Prisma `Decimal` instances must be converted to strings (`dec.toString()`), and `Date` instances to ISO strings (`date.toISOString()`).
4. **Explicit Tagging:** Tag tenant caches with `cacheTag('company-${companyId}-${domain}')`.

### 3.4 Read-Your-Writes Mutation Model (`updateTag`)
When a mutation occurs (e.g., marking an invoice as paid), use Next.js 16's `updateTag()` to bust the cache immediately for the active request and update downstream UI components without stale cache lag.

### 3.5 Strict Asynchronous Request APIs
All route parameters, search parameters, cookies, and headers are strictly asynchronous promises (`await params`, `await cookies()`).

---

## 4. Global Database Topology & Relational Integrity (PostgreSQL 3NF)

### 4.1 Comprehensive Staged Prisma Schema
The schema is strictly normalized to 3NF, uses explicit decimal precision for all money (`Decimal(14,2)`), micro-precision for exchange rates (`Decimal(18,8)`), and restricts cascading deletes on financial records.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  OWNER
  FINANCE_MANAGER
  AUDITOR
}

enum InvoiceStatus {
  DRAFT
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
}

enum TransactionType {
  INFLOW
  OUTFLOW
}

enum ExpenseRecurrence {
  ONE_TIME
  WEEKLY
  MONTHLY
  QUARTERLY
  ANNUALLY
}

model Company {
  id             String          @id @default(uuid())
  name           String          @db.VarChar(120)
  email          String          @unique @db.VarChar(150)
  baseCurrency   String          @default("USD") @db.VarChar(10)
  liquidReserve  Decimal         @default(0.00) @db.Decimal(14, 2)
  safetyBuffer   Decimal         @default(2000.00) @db.Decimal(14, 2)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  users          User[]
  clients        Client[]
  invoices       Invoice[]
  invoiceItems   InvoiceItem[]
  expenses       Expense[]
  transactions   Transaction[]
  counter        CompanyCounter?
  auditLogs      AuditLog[]
}

model User {
  id           String     @id @default(uuid())
  companyId    String
  company      Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  fullName     String     @db.VarChar(120)
  email        String     @unique @db.VarChar(150)
  passwordHash String     @db.VarChar(255)
  role         UserRole   @default(OWNER)
  createdAt    DateTime   @default(now())
  auditLogs    AuditLog[]

  @@index([companyId, email])
}

model CompanyCounter {
  companyId    String   @id
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  currentYear  Int
  lastSequence Int      @default(0)
  updatedAt    DateTime @updatedAt
}

model Client {
  id               String    @id @default(uuid())
  companyId        String
  company          Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  clientName       String    @db.VarChar(120)
  email            String    @db.VarChar(150)
  phone            String?   @db.VarChar(30)
  address          String?   @db.Text
  paymentTermsDays Int       @default(30)
  deletedAt        DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  invoices         Invoice[]

  @@index([companyId, email])
  @@index([companyId, deletedAt])
}

model Invoice {
  id              String        @id @default(uuid())
  companyId       String
  company         Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id], onDelete: Restrict)
  invoiceNumber   String        @db.VarChar(50)
  viewToken       String        @unique @default(uuid())
  issueDate       DateTime      @db.Date
  dueDate         DateTime      @db.Date
  currency        String        @default("USD") @db.VarChar(10)
  exchangeRate    Decimal       @default(1.00000000) @db.Decimal(18, 8)
  subtotal        Decimal       @db.Decimal(14, 2)
  taxRate         Decimal       @default(0.00) @db.Decimal(5, 2)
  taxAmount       Decimal       @default(0.00) @db.Decimal(14, 2)
  totalAmount     Decimal       @db.Decimal(14, 2)
  baseTotalAmount Decimal       @db.Decimal(14, 2)
  paidAmount      Decimal       @default(0.00) @db.Decimal(14, 2)
  status          InvoiceStatus @default(DRAFT)
  paidAt          DateTime?
  notes           String?       @db.Text
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  items           InvoiceItem[]
  transactions    Transaction[]
  reminderLogs    ReminderLog[]

  @@unique([companyId, invoiceNumber])
  @@index([companyId, status, dueDate])
  @@index([viewToken])
}

model InvoiceItem {
  id          String   @id @default(uuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description String   @db.VarChar(255)
  quantity    Int      @default(1)
  unitPrice   Decimal  @db.Decimal(14, 2)
  lineTotal   Decimal  @db.Decimal(14, 2)

  @@index([companyId, invoiceId])
}

model Expense {
  id          String            @id @default(uuid())
  companyId   String
  company     Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  title       String            @db.VarChar(150)
  category    String            @db.VarChar(80)
  amount      Decimal           @db.Decimal(14, 2)
  dueDate     DateTime          @db.Date
  recurrence  ExpenseRecurrence @default(ONE_TIME)
  isPaid      Boolean           @default(false)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([companyId, dueDate, isPaid])
}

model Transaction {
  id              String          @id @default(uuid())
  companyId       String
  company         Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invoiceId       String?
  invoice         Invoice?        @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  type            TransactionType
  amount          Decimal         @db.Decimal(14, 2)
  currency        String          @default("USD") @db.VarChar(10)
  exchangeRate    Decimal         @default(1.00000000) @db.Decimal(18, 8)
  transactionDate DateTime        @db.Date
  category        String          @db.VarChar(80)
  description     String?         @db.VarChar(255)
  createdAt       DateTime        @default(now())

  @@index([companyId, transactionDate])
}

model ReminderLog {
  id             String   @id @default(uuid())
  invoiceId      String
  invoice        Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  recipientEmail String   @db.VarChar(150)
  sentAt         DateTime @default(now())
  method         String   @default("EmailJS_1Click")
  status         String   @default("SENT")

  @@index([invoiceId, sentAt])
}

model AuditLog {
  id         String   @id @default(uuid())
  companyId  String
  company    Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  userId     String?
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action     String   @db.VarChar(100)
  entityType String   @db.VarChar(50)
  entityId   String   @db.VarChar(50)
  details    Json?
  ipAddress  String?  @db.VarChar(45)
  createdAt  DateTime @default(now())

  @@index([companyId, createdAt])
}
```

---

## 5. The Cash Flow Intelligence & Forecasting Engine

### 5.1 Mathematical Model (Opening Cash, Overdue Pool & Outflows)
FinFlow models rolling liquidity over 30 days:
$$\text{Projected Balance}(t) = \text{Liquid Reserve}_0 + \text{Overdue Recovery Pool} + \sum_{d=1}^{t} \text{Expected Inflows}(d) - \sum_{d=1}^{t} \text{Scheduled Outflows}(d)$$

* **Overdue Pool (Day 0):** Unpaid invoices past due date are captured on Day 0 with a collection haircut factor ($\alpha = 0.70$), preventing them from vanishing.
* **Maturing Inflows:** Unpaid invoices due on day $d$, adjusted for historical client latency $\overline{\Delta \text{days}}$.
* **Scheduled Outflows:** One-off and recurring operational expenditures due on day $d$.
* **Deficit Alert:** Flagged whenever projected balance dips below `Company.safetyBuffer`.

---

## 6. Execution Roadmap & Phase Gates

- [ ] **Phase 0:** Infrastructure, Base Scaffolding & PostgreSQL Connection Singleton
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
