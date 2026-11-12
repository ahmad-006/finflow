# FinFlow Markdown Plan Review: Weak Points

Review of `README.md`, `AGENTS.md` and `FINFLOW_NEXTJS_POSTGRES_MASTER_PLAN.md` for Ahmad Aamir (AF25LHB4554), CS2682. Judged against the markdown stack (Next.js 16, PostgreSQL, Prisma); the PDF's PHP/CodeIgniter stack is ignored. Next.js 16 claims were checked against current public sources.

The design is solid, but there are real bugs, contradictions and gaps. They are grouped below.

## A. Things that will break or are wrong in the code samples

1. **Wrong Next.js 16 APIs.**
   - **`revalidateTag`:** it now requires a second argument (a cacheLife profile), and single-argument calls fail. Every call in the plan uses one argument.
   - **`proxy.ts`:** Next.js 16 replaces `middleware.ts` with `proxy.ts`, which runs on Node.js by default, and `middleware.ts` is deprecated. The plan uses `src/middleware.ts`.
   - **`cacheComponents` placement:** Phase 0 puts it under `experimental: { cacheComponents: true }`, but it is a stable top-level option in Next.js 16. The plan's own project tree and Section 3.1 describe it as top-level, so the document contradicts itself.
   - **`updateTag()`:** it is missing. It is the right tool for read-your-writes after "mark as paid".
   - **Cache imports:** the samples import `unstable_cacheLife` and `unstable_cacheTag`, while Section 3.1 and `AGENTS.md` say `unstable_*` is replaced. Stable names are believed to exist in 16, so check the docs.
   - **Agent risk:** any agent following `AGENTS.md` will generate code that fails to compile.
2. **Overdue invoices vanish from the forecast.** The query fetches invoices with `dueDate <= horizon`, which includes past-due ones. The daily loop only matches `isSameDay` for days 0 to 30, so those invoices are never counted. The most important cash risk is silently dropped.
3. **Deficit logic ignores the safety buffer.** The text defines a buffer ("$2,000 or 15% of monthly expenses"), but the code uses `isDeficit: currentBalance < 0`. No buffer column exists in the schema. `liquidReserve` is used both as opening cash and as the "reserve buffer", which are two different concepts.
4. **Floating-point money despite your own rule.** `AGENTS.md` forbids JS floats for currency. The invoice action uses plain `number` arithmetic (`acc + quantity * unitPrice`, `totalAmount * rate`), and the forecast uses `Number()` on Decimals.
5. **Exchange rate fetched inside `prisma.$transaction`.** An external HTTP call inside an interactive transaction holds a DB connection and can hit the transaction timeout. Fetch the rate first, then open the transaction.
6. **`exchangeRate` is `Decimal(10,4)`.** PKR to USD is about 0.0036, so four decimals gives roughly 1% rounding error on every conversion. Use something like `Decimal(18,8)`.
7. **`'use cache'` returns Prisma objects.** `getClientLedgerSummary` returns results containing `Decimal` and `Date` instances. Cached return values must be serializable, so this will likely misbehave. Convert to strings or plain numbers inside the cached function.
8. **Time-zone bugs.** `today.setHours(0,0,0,0)` uses the server's zone, while `@db.Date` is zone-less. On a UTC server and a Pakistan user (UTC+5), `isSameDay` gives off-by-one results. `new Date()` is also frozen inside a cached function, so "today" goes stale.

## B. Data-model weaknesses

9. **`Invoice → Client` is `onDelete: Cascade`.** Deleting a client wipes all their invoices, including paid history. That is dangerous for financial records and contradicts "cannot delete clients with unpaid invoices". Use `Restrict` plus soft delete.
10. **Client ledger mixes currencies.** Billed, Paid and Outstanding sum `totalAmount` (invoice currency) across invoices, so USD and PKR get added together. It must sum `baseTotalAmount`.
11. **Overdue is a stored status that nothing updates.** Nothing flips `SENT` to `OVERDUE`: there is no cron, no computed rule and no timer. Derive it from `dueDate < today AND status = SENT`.
12. **No source of truth for the cash balance.** Marking an invoice paid never says whether it creates an INFLOW `Transaction`, updates `liquidReserve`, or both. The forecast reads only OUTFLOW transactions. This invites double counting or drift.
13. **No expense/outflow module.** The forecast depends on "scheduled recurring and one-off expense records". There is no recurring-expense schema, no CRUD, no UI, and no phase that builds it. The cash-out half of the product doesn't exist. Viva Q5 also claims you deduct scheduled expenses.
14. **No partial payments.** The only paid state is `PAID`, so part-paid invoices can't be represented. `Transaction` also has no currency column.
15. **Missing tenant column and ownership check.**
    - `InvoiceItem` has no `company_id`, violating `AGENTS.md`'s "every table MUST" rule.
    - `createInvoiceAction` takes `clientId` from the client without checking it belongs to the session's company, which is a cross-tenant IDOR.
    - Isolation is app-level only, with no Postgres Row-Level Security or composite foreign keys.
16. **Decimal rules are violated.** `unitPrice` is `Decimal(10,2)`, but `AGENTS.md` mandates `(12,2)` or `(14,2)` for money. `liquidReserve` uses 14 while other fields use 12.
17. **Invoice numbering and status defaults.**
    - `generateNextInvoiceNumber` is unspecified, yet the DoD promises "no race conditions". Without a per-company counter row, concurrent creates collide on the unique index.
    - The format differs between files: `INV-YYYY-XXXX` in the README and `INV-2026-001` in the plan. Yearly reset is undefined.
    - The schema defaults to `SENT` and the action forces `SENT`, so `DRAFT` can never be created.
18. **Aging metrics are weak.**
    - "Aging Risk Score = Overdue / Total Billed" includes paid history, so it is diluted. Standard 1-30 / 31-60 / 61-90 / 90+ buckets are better.
    - The client badges leave a hole: "Watchlist <15 days" and "Critical >30 days" say nothing about 15 to 30 days.
19. **FX is locked forever.** `baseTotalAmount` is frozen at issue time, with no revaluation of open receivables and no FX gain/loss when payment settles at a different rate.

## C. Auth and security

20. **Auth library never chosen.**
    - The env file has `NEXTAUTH_SECRET`, but the dependency list has no NextAuth/Auth.js, and the plan hand-rolls JWT.
    - The README says "encrypted session cookies", the plan says "JWT", and no signing library (`jose`, `iron-session`) is named.
21. **Auth hangs on the proxy alone.** Relying on middleware/proxy for authorization is a known bypass class. Add checks in a data-access layer. Also, the proxy "injects `x-company-id`", and a header is only trustworthy if the proxy overwrites any client-supplied value.
22. **Missing auth features.**
    - No password reset, email verification, rate limiting or lockout, session expiry or revocation.
    - No way to invite additional users, so the `FINANCE_MANAGER` and `AUDITOR` roles can never be created.
    - No permission matrix. The role sits in a JWT and goes stale if changed.
23. **Security claims are overstated or inconsistent.**
    - "100% immunity" to SQL injection ignores `$queryRaw`, which Phase 0 uses in the health check.
    - Phase 8 claims "SameSite strict" while Phase 1 sets `lax`.
    - `/api/health` is unauthenticated and reveals the framework version.
24. **No audit trail.** Financial software needs an immutable log of who marked what as paid and when.

## D. Reminders and "real-time" claims

25. **Reminders are not automated.** EmailJS runs in the browser, so nothing is sent when no one is logged in. That contradicts "automated" in your README and plan, and a free-tier quota makes it fragile. There is also no reminder-history table, throttling or escalation schedule.
26. **The reminder link is unusable.** `payment_link` points to `/invoices/${id}`, which is behind login. Clients aren't users, so they hit the login page. No public invoice link or token exists.
27. **SSE has no backbone.**
    - No pub/sub is specified (Postgres LISTEN/NOTIFY, Redis). In-memory events don't cross server instances, and serverless hosts cut long connections.
    - Tenant scoping of the stream is undefined.
    - The Phase 7 text says `revalidateTag` "propagates updated values to all tabs". It doesn't, because it only invalidates server cache.
28. **Optimistic UI vs cached forecast.** The chart comes from a cached server function (`cacheLife("minutes")`), but the DoD wants instant re-render. The optimistic example takes an unused `initialBalance` and never updates counters or the chart.
29. **Mixed CSS frameworks in samples.** The `badge bg-emerald-500` example mixes Bootstrap's `badge` class with Tailwind classes.

## E. Forecasting depth

30. **Purely deterministic forecast.** It assumes every invoice is paid exactly on its due date. There is no payment-delay history, moving average or late-payment probability. This is the weakest point for the "intelligence" claim and for viva questions.
31. **Missing metrics.** There is no cash-in vs cash-out velocity, and "Net Runway / Cash Crunch Countdown" is named but never defined.
32. **Chart choice is undecided and mismatched.** The README promises "waterfall charts", the plan builds an area curve plus bars, and both say "Chart.js / Recharts" without choosing. Open Exchange Rates is listed nowhere in the markdown, even though the assignment requires it.

## F. Phase-gate and process contradictions

33. **Phases depend on later phases.** `Company` (Phase 1) references `Invoice[]` and `Transaction[]`, and `Client` (Phase 2) references `Invoice[]`. `npx prisma validate`, which `AGENTS.md` requires for every phase, fails until those models exist. Phase 2's DoD ("ledger matches invoice math exactly") can't be tested before invoices exist in Phase 3.
34. **Phase lock is violated by the plan itself.** Phase 2 includes a "one-click reminder button" that belongs to Phase 7. "Mark as Paid" is specified in Phases 3, 6 and 7 with no single owner.
35. **Tests are deferred to Phase 8.** Phases 1 to 7 have no test requirements, yet the phase-gate rule says each phase must pass tests. `AGENTS.md`'s verification commands omit `npm test`. There is no CI.
36. **Unmeasurable DoDs.** Examples: "zero flakiness", "under 500ms PDF" (dependent on device), and "SSE within 1 second". Lighthouse 90+ with charts and FullCalendar is risky.
37. **Unresolved choices.** Prisma or Drizzle, Node or Bun, Chart.js or Recharts. A "strict" plan shouldn't leave these open.

## G. Documentation, architecture and viva risks

38. **Not actually microservices.** The files call it "Autonomous Microservice Domains" while admitting it is a monolith. Modules share one schema and query each other's tables directly (clients and treasury read `invoice`). There is no enforced boundary, such as import-boundary lint rules. Also, "Phase 8: Microservice Domain 8" isn't a domain.
39. **Viva answers contain risky claims.**
    - Q1 says PHP/CodeIgniter needs full reloads or jQuery glue. Examiners can easily challenge that.
    - "Zero client JavaScript overhead" is false for a chart- and calendar-heavy app.
    - Q3 has a quoting typo in `cacheTag('company-${companyId}-domain')`.
40. **Document Vault is promised but never built.** The module is described as "PDF Builder & Document Vault", but no storage schema exists. PDFs are generated client-side and never stored.
41. **PDF font and Unicode limits.** jsPDF's default fonts don't support Urdu text or some currency symbols. For a PKR product, embed a font.
42. **README is out of sync with the plan.** Its ER diagram lacks `currency`, `tax_rate`, `exchange_rate`, `paid_at` and `phone`. It also refers to a license file and repo URL as if they exist. Check both.
43. **Unverified version claims.** Next.js 16 and its main changes are confirmed. "16.4+ Active LTS" and "Bun 1.4+" could not be verified, so verify before putting them in a report.
44. **Nothing is built yet.** Every checkbox is unchecked, but the README is written in the present tense ("backed by ACID transactions"). Examiners may read that as overclaiming.

## Fix first (highest return)

1. Update the API usage: `proxy.ts`, the `revalidateTag` second argument, `updateTag`, and top-level `cacheComponents`.
2. Fix the forecast: include overdue invoices, use a real safety-buffer field, and use Decimal math with consistent time zones.
3. Change the client cascade to `Restrict` and use `baseTotalAmount` in the ledger.
4. Define the paid-flow (Transaction plus balance source of truth) and derive overdue status.
5. Add an expense/outflow module.
6. Add a simple trend model: per-client average payment delay or late probability.
7. Fix phase order, or move schema relations to the phase that owns them, and require tests per phase.
8. Choose the auth library and add tenant ownership checks.
9. Add a public tokenized invoice link and a scheduled job for reminders, or describe them honestly as 1-click.
