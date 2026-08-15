# AGENTS.md — DAMII Platform Instructions & Project Guidelines

This file provides system instructions, architectural standards, current platform capabilities, and operational guidelines for AI coding agents working on the **DAMII (Ghanaian Draughts Arena & Tournament Platform)** codebase.

---

## 1. Project Domain Overview

**DAMII** is an enterprise-grade Ghanaian 10x10 Draughts (Damii) platform built with Next.js App Router, TypeScript, and Tailwind CSS.

### Key Functional Domains & Recently Built Capabilities:
- **Game Engine & Rules (`/lib/damii-rules.ts`)**: Standard 10x10 Ghanaian Damii rules, compulsory captures, multi-hop jumping sequences, flying king capabilities, turn clocks (60s), and reconnection grace periods (45s).
- **Transport Layer & Real-time State**: Short-polling HTTP heartbeats (1.5s interval) and `navigator.sendBeacon` disconnection hooks over Next.js API Routes (`/app/api/damii`). Incorporates server-side move queue buffering (`movesJson` append-only log) so reconnected players recover full in-flight multi-jump sequences without losing state, alongside real-time player presence/heartbeat tracking.
- **Admin Tournament Oversight & Spectator Center (`/app/admin`, `/lib/league-service.ts`, `/app/api/admin`)**: 
  - Comprehensive admin control over all tournament leagues with status filtering (`all`, `registration`, `active`, `completed`, `cancelled`).
  - **Tournament Operations**: Admins can directly create tournaments (`admin_create_tournament`), manually register players (`admin_add_participant`), approve/reject player applications (`admin_approve_applicant` / `admin_reject_applicant`), generate brackets & launch active rounds (`admin_generate_bracket`), and cancel tournaments with auto-refunds (`admin_cancel_tournament`).
  - **Tournament Inspector & Live Arena Watch**: Multi-tab inspector modal (Overview, Roster, Matches). Includes real-time match spectating via linked game room codes (`/arena?code=...`) and admin forced match result overrides (Player 1 Win, Player 2 Win, Draw) for resolving disputes or stalled matches.
- **Financial Ledger & Balance Audit System (`/app/admin`, `/lib/admin-service.ts`, `/lib/db-client.ts`, `/app/api/admin`)**:
  - Manual transaction recording (`add_ledger_entry` / `addManualLedgerEntry`) supporting deposits, withdrawals, wager refunds, league prize payouts, entry fees, points conversions, and balance adjustments for any user in Points or Marbles.
  - Atomically updates profile balances (`updateProfileMarblesBalance` / `updateProfileBalance`), records reference IDs, and logs full audit metadata (`adminName`, `reason`, `recordedAt`).
  - Real-time financial KPI metrics dashboard (Marbles circulation, Points circulation, Escrow volume, Transaction counts) and filterable audit transaction tables.
- **Paystack Wallet & Escrow (`/lib/wallet-service.ts`, `/app/api/wallet`)**: Marble top-ups using Paystack Mobile Money (MTN / Telecel / AT), Point-to-Marble conversions, wager pot escrow locks during matches, Mobile Money cashouts, and Paystack reference idempotency tracking (`processedPaystackRefs`) with atomic key mutexes.
- **MySQL Database Persistence (`/lib/db-client.ts`, `/lib/db/*`, `/db/schema.mysql.ts`)**: MySQL (8+ / MariaDB 10.4+) is the ONLY database dialect — in development AND production. `lib/db-client.ts` exposes `dbRepository`, implemented by `lib/db/mysql-store.ts` over a pooled mysql2/Drizzle connection (`lib/db/mysql-connection.ts`). Money movement uses SQL-atomic updates inside transactions, and idempotency relies on PRIMARY KEY conflicts. The legacy `.data/damii_db.json` file store and the SQLite/Postgres paths were removed.

---

## 2. Core Architecture & Folder Structure

```
├── app/
│   ├── admin/             # Admin Control Center, Tournament Inspector, Dispute Resolver & Ledger UI
│   ├── arena/             # 10x10 Interactive Game Arena (Local, Online, Wager, Tournament, Spectator)
│   ├── leagues/           # Tournament Leagues & Bracket Viewer for Players
│   ├── wallet/            # Paystack Deposit, Wager Log & Cashout UI
│   └── api/               # Server-Side API Routes
│       ├── admin/         # Admin Management, Tournament Oversight, Ledger & Seeder Endpoints
│       ├── auth/          # Authentication & Profile Management
│       ├── damii/         # Game Engine & Move Validation API
│       ├── league/        # Tournament League & Player Check-in Endpoints
│       └── wallet/        # Paystack Payments & Escrow Webhooks
├── db/                    # Drizzle Schemas (schema.mysql.ts is authoritative)
├── drizzle/mysql/         # Generated SQL migrations (applied via `npm run db:migrate`)
├── lib/
│   ├── admin-service.ts   # Admin logic, Audit logging & Manual Ledger Service
│   ├── damii-rules.ts     # 10x10 Ghanaian Draughts Rules & Move Validator
│   ├── db/
│   │   ├── repository.ts        # DbRepository storage contract
│   │   ├── mysql-connection.ts  # Shared mysql2 pool + Drizzle handle
│   │   ├── mysql-mappers.ts     # Row <-> domain object mapping
│   │   ├── mysql-store.ts       # MySQL repository implementation (dev + prod)
│   │   └── seed-data.ts         # Canonical seed dataset
│   ├── db-client.ts       # Public DB entrypoint (MySQL-only)
│   ├── league-service.ts  # Tournament Bracket, Roster & League Logic
│   ├── wallet-service.ts  # Paystack Integration & Wager Escrow Logic
│   └── types.ts           # Central TypeScript Definitions
```

---

## 3. Operational Guidelines & "The Way We Want Things To Go"

1. **Server-Authoritative Ledger & Escrow Discipline**:
   - Never perform balance or escrow modifications purely in client state.
   - All financial adjustments must pass through `adminService.addManualLedgerEntry` or `walletService` with complete audit logging in `admin_logs`.
2. **Tournament Lifecycle & Dispute Resolution**:
   - Stalled or disputed tournament matches must be resolvable by administrators using `admin_submit_match_result` or match cancellation routines.
   - When a tournament is cancelled, always issue automatic refunds to all registered participants via `cancelTournament`.
3. **Security Constraints**:
   - `PAYSTACK_SECRET_KEY` and `ADMIN_SECRET_KEY` must **NEVER** be exposed in client-side code (`NEXT_PUBLIC_`). All sensitive financial and administrative logic must run in server-side API routes (`/app/api/*`).
   - New profile registration (`createRegisteredProfile` / `upsertProfile`) strictly assigns `"user"` role. Never auto-promote based on username content.
   - All financial wallet mutations and Paystack verification calls must use idempotency checks (Paystack reference PRIMARY KEY conflicts) and SQL-atomic updates to eliminate race conditions and duplicate credits.
   - The database layer is MySQL-only. `DATABASE_DIALECT` defaults to `mysql` in every environment; point `DATABASE_URL` (mysql://…) or the `MYSQL_*` variables at the server, run `npm run db:migrate` once, and both `npm run dev` and `npm run start` use the same MySQL backend.
4. **Code Style & UI Integrity**:
   - Stick to the dark emerald/slate theme palette (`bg-[#081c15]`, `bg-[#06261f]`, `border-[#114232]`, `text-[#d6a735]`, `text-[#f5efdf]`).
   - Use exclusively `lucide-react` icons. Make sure any new icon used is explicitly imported at the top of the file.
   - Use exact TypeScript types defined in `lib/types.ts`. Avoid `any` unless required for low-level SDKs.

---

## 4. Seeder & Default Accounts

When testing or setting up the database, the initial seeder populates:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin123` | System management, tournament oversight & ledger execution |
| **Super Admin** | `superadmin` | `admin123` | Backup system admin |
| **Facilitator** | `DAMII Facilitator` | `admin123` | Tournament league creator |
| **Player** | `Kwame_Master` | `123456` | Rated player account |
| **Player** | `Ama_Queen` | `123456` | Rated player account |
| **Player** | `Kofi_Grandmaster` | `123456` | High-rated player account |

Seeder API endpoint: `POST /api/admin` with `{ "action": "seed" }`.

---

## 5. Verification Checklist

When making modifications:
1. Run `compile_applet` to ensure there are no TypeScript compilation errors or missing icon imports.
2. Verify all API routes return valid JSON error payloads with proper HTTP status codes.
3. Confirm client components handle loading, busy, and error states gracefully with proper feedback toasts/modals.
