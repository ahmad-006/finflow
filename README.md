<div align="center">

# 🌊 FinFlow
### Business Cash Flow Intelligence & Invoice SaaS
**Empowering SMEs with Forward-Looking Liquid Treasury Forecasting, Dynamic Multi-Currency Invoicing, and Real-Time Receivables Synchronization.**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4+-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Overview & Problem Statement

Cash flow mismanagement is empirically the **#1 reason Small and Medium Enterprises (SMEs) fail** within their first three years of operation. While businesses often record nominal accounting profits, they frequently suffer fatal liquidity crises because their capital remains trapped in extended Accounts Receivable (A/R) cycles.

Traditional accounting software (e.g., QuickBooks, SAP, Xero) focuses heavily on backward-looking accrual bookkeeping—counting invoices as revenue the moment they are issued, regardless of when cash is collected. Basic spreadsheets, on the other hand, lack dynamic forward-looking forecasting, automated follow-ups, and real-time state synchronization.

**FinFlow** bridges this divide by acting as a modern financial operations cockpit for SMEs:
* **Forward Liquidity Forecasting:** Algorithmic 30-day cumulative rolling cash curve mapping receivables to contractual due dates.
* **Cash Bottleneck Alerts:** Early warning signals identifying the exact calendar day an SME will breach its liquid reserve buffer.
* **Atomic Multi-Currency Invoicing:** Instant multi-line invoice issuance backed by PostgreSQL ACID transactions and spot exchange rates.
* **Real-Time Asynchronous Operations:** Optimistic UI state mutations, zero-flicker Chart.js re-renders, and 1-click automated collection reminders.

---

## 🏛️ Architectural Topology: Modular Microservices

FinFlow is architected as an industrial-grade **Modular Monolith partitioned into autonomous Domain Microservices** built natively on the **Next.js 16 App Router**:

```
finflow/
├── next.config.ts                # Next.js 16 Config (cacheComponents: true, Turbopack)
├── src/
│   ├── app/                      # Next.js 16 App Router (RSC, Async Route Handlers, Layouts)
│   │   ├── (auth)/               # Tenant authentication route group
│   │   ├── (dashboard)/          # Authenticated cockpit application shell
│   │   └── api/                  # REST & SSE stream endpoints
│   ├── modules/                  # Autonomous Domain Microservices
│   │   ├── auth/                 # Microservice 1: Multi-Tenant Identity & RBAC
│   │   ├── clients/              # Microservice 2: Client Directory & CRM Ledger
│   │   ├── invoices/             # Microservice 3: Atomic Invoicing Engine & Currency Rates
│   │   ├── documents/            # Microservice 4: PDF Document Builder & Vault
│   │   ├── treasury/             # Microservice 5: 30-Day Forward Cash Flow Projection Engine
│   │   ├── calendar/             # Microservice 6: Due-Date Scheduling & Visual Feed
│   │   └── notifications/        # Microservice 7: Real-Time SSE Sync & Email Reminders
│   ├── components/               # Shared shadcn/ui & Radix UI primitives
│   ├── lib/                      # Database client (Prisma/Drizzle), utilities, logger
│   └── types/                    # Shared TypeScript schemas & DTOs
```

Each domain microservice owns its data contracts (Zod DTOs), business logic services, Next.js 16 Server Actions, and UI components.

---

## ⚡ Core Features

### 1. Multi-Tenant Identity & Workspace Isolation
* Tenant isolation with company-scoped workspaces.
* Secure authentication using salted bcrypt password hashing, encrypted HTTP-only session cookies, and route guard middleware.
* Customizable workspace parameters (Base currency: USD, PKR, EUR, GBP; liquid reserve buffers).

### 2. Client CRM & Accounts Receivable Ledger
* Scoped customer profiles with contact records and contractual payment terms (Net-15, Net-30, Net-60).
* Real-time ledger aggregations: Total Billed, Total Collected, Outstanding Receivables, and Aging Overdue balances.
* Instant risk profiling to highlight clients with chronic collection delays.

### 3. Atomic Multi-Currency Invoicing Engine
* Dynamic multi-row invoice builder with client-side recalculation and server-side verification.
* Multi-currency support fetching spot exchange rates via ExchangeRate-API with normalized base currency storage.
* Atomic database mutations executed via PostgreSQL transactions (`prisma.$transaction`) to preserve ACID compliance.
* Sequential invoice numbering generator (`INV-YYYY-XXXX`).

### 4. 30-Day Forward Cash Flow Intelligence
* Mathematical liquidity projection algorithm:
  $$\text{Projected Balance}(t) = \text{Liquid Reserve}_0 + \sum_{d=0}^{t} \text{Expected Inflows}(d) - \sum_{d=0}^{t} \text{Scheduled Outflows}(d)$$
* Interactive shaded area curve and waterfall charts visualizing liquidity trajectory.
* Automated deficit markers alerting finance managers before reserves dip below safe operational levels.

### 5. Document Engine & Client-Side PDF Generation
* Instant vector PDF invoice compilation via `jsPDF` and `jspdf-autotable` directly inside the browser.
* Clean print stylesheets for standard browser printing.

### 6. Interactive Due-Date Financial Calendar
* FullCalendar.js view mapping receivables and expense spikes across month, week, and list views.
* Color-coded statuses: Emerald Green (Paid), Sapphire Blue (Upcoming), Crimson Red (Overdue).

### 7. Real-Time State Sync & Automated Reminders
* Zero-refresh optimistic UI mutations powered by React 19 `useOptimistic`.
* Next.js 16 Cache Components (`'use cache'`) with tenant-isolated `cacheTag` invalidations.
* 1-click automated payment reminders dispatched directly to client inboxes via EmailJS.

---

## 🛠️ Tech Stack & Tooling

| Tier | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.4+ (Active LTS)** | App Router, Turbopack, React 19 Server Components, and Server Actions |
| **Language** | **TypeScript 5.x** | Strict end-to-end type safety |
| **Database** | **PostgreSQL 15+** | ACID-compliant relational persistence, decimal precision, 3NF schema |
| **ORM** | **Prisma ORM** | Type-safe migrations, auto-generated client, connection pooling singleton |
| **Styling & UI** | **Tailwind CSS + shadcn/ui** | Modern, accessible Radix UI primitives |
| **Charts** | **Chart.js / Recharts** | Reactive waterfall and rolling cash trajectory graphs |
| **Calendar** | **FullCalendar.js (React)** | Interactive billing and maturity schedule |
| **PDF Generation** | **jsPDF + AutoTable** | Browser-side instant vector PDF export |
| **External APIs** | **ExchangeRate-API & EmailJS** | Spot foreign exchange rates and browser transactional emails |
| **Testing** | **Vitest + Playwright** | Unit and end-to-end browser test suites |

---

## 🗄️ Database Architecture (PostgreSQL 3NF)

```mermaid
erDiagram
    COMPANIES ||--o{ USERS : "has many"
    COMPANIES ||--o{ CLIENTS : "owns"
    COMPANIES ||--o{ INVOICES : "issues"
    COMPANIES ||--o{ TRANSACTIONS : "records"
    CLIENTS ||--o{ INVOICES : "billed to"
    INVOICES ||--o{ INVOICE_ITEMS : "contains (CASCADE)"
    INVOICES ||--o{ TRANSACTIONS : "triggers"

    COMPANIES {
        uuid id PK
        varchar name
        varchar base_currency
        numeric liquid_reserve
        timestamp created_at
    }
    USERS {
        uuid id PK
        uuid company_id FK
        varchar email
        varchar password_hash
        varchar role
    }
    CLIENTS {
        uuid id PK
        uuid company_id FK
        varchar name
        varchar email
        int payment_terms_days
    }
    INVOICES {
        uuid id PK
        uuid company_id FK
        uuid client_id FK
        varchar invoice_number
        date issue_date
        date due_date
        numeric total_amount
        numeric base_total_amount
        varchar status
    }
    INVOICE_ITEMS {
        uuid id PK
        uuid invoice_id FK
        varchar description
        int quantity
        numeric unit_price
        numeric line_total
    }
    TRANSACTIONS {
        uuid id PK
        uuid company_id FK
        uuid invoice_id FK
        varchar type
        numeric amount
        date transaction_date
        varchar category
    }
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js:** `v20.20+` or **Bun:** `v1.4+`
* **PostgreSQL:** `15+` (Local instance or hosted via Supabase / Neon)
* **Git:** Latest version

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ahmad-006/finflow.git
   cd finflow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   # Database (PostgreSQL)
   DATABASE_URL="postgresql://username:password@localhost:5432/finflow_db?schema=public"

   # Authentication
   NEXTAUTH_SECRET="your-super-secret-random-key-at-least-32-chars"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # External APIs (Optional / Free Tier)
   EXCHANGE_RATE_API_KEY=""
   NEXT_PUBLIC_EMAILJS_SERVICE_ID=""
   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=""
   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=""
   ```

4. **Run Database Migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start Development Server (with Turbopack):**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📋 Implementation Roadmap & Phase Gates

Development follows a strict **Phase Gate Protocol** where each domain microservice must meet 100% of its Definition of Done (DoD) before progressing:

- [ ] **Phase 0:** Infrastructure, Base Scaffolding & PostgreSQL Connection Singleton
- [ ] **Phase 1:** Multi-Tenant Identity & Auth Service (`auth-tenant-service`)
- [ ] **Phase 2:** Client Directory & CRM Service (`client-crm-service`)
- [ ] **Phase 3:** Invoicing Engine & Multi-Currency Calculation Service (`invoicing-service`)
- [ ] **Phase 4:** Document Generation & PDF Engine Service (`document-service`)
- [ ] **Phase 5:** Treasury Ledger & 30-Day Forward Cash Flow Engine (`treasury-forecast-service`)
- [ ] **Phase 6:** Visual Calendar & Scheduling Service (`schedule-calendar-service`)
- [ ] **Phase 7:** Real-Time Synchronizer & Automated Reminders Service (`notification-sync-service`)
- [ ] **Phase 8:** Production Hardening, Security Audit & E2E Testing Suite
- [ ] **Phase 9:** Academic Viva Defense & Examination Master Readiness

---

## 🎓 Academic Project Context

* **Course:** CS2682 — Web Application Development
* **Institution:** Riphah International University
* **Student:** Ahmad Aamir
* **Roll Number:** `AF25LHB4554`
* **Assignment Project #:** 8 (FinFlow — Business Cash Flow Intelligence & Invoice SaaS)

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
