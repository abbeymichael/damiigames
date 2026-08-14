# DAMII — Multi-Dialect Ghanaian Draughts Arena & Tournament Platform

A full-stack, enterprise-grade implementation of traditional Ghanaian draughts (10x10 Damii) supporting multi-dialect persistence (SQLite, PostgreSQL, MySQL), Paystack Mobile Money integration, automated wager escrow, tournament leagues, turn clocks with disconnection handling, and role-guarded admin management.

## Key Features

* **Multi-Dialect Drizzle Architecture**: Native schemas for SQLite (Cloudflare D1 / memory), PostgreSQL, and MySQL switched dynamically via `DATABASE_DIALECT`.
* **Multi-Mode Game Arena**:
  * Local Device Casual Play
  * Private Room Online Matches
  * Wager Matches with Marble Escrow Lock
  * Tournament League Linked Matches
* **Traditional 10x10 Rules Engine**: Compulsory captures, flying kings, and server-side move validation.
* **Transport Layer & Reconnection Mechanics**: Short-polling HTTP heartbeats (1.5s window) with `sendBeacon` unmount presence triggers, 60-second turn limits, and a 45-second reconnection grace period. Server-side move queue buffering (`movesJson` append-only array) ensures reconnecting players seamlessly sync in-flight multi-jump sequences without losing match state.
* **Paystack Wallet Integration**: Top-up Marbles via Paystack Mobile Money (MTN / Telecel / AT) or Card, convert Points to Marbles, and cash out Points to Mobile Money.
* **Tournament Leagues**: Facilitator-created single-elimination tournament leagues with automated bracket generator and prize pool distribution.
* **Admin Control Center**: System metrics, user role manager (Facilitator/Admin), match dispute resolver, and audit ledger.

## Environment Configuration

Configure the following environment variables in `.env` or container settings:

```env
# Database Dialect: "sqlite" | "postgres" | "mysql"
DATABASE_DIALECT=sqlite
DATABASE_URL=sqlite.db

# Paystack API Keys
PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_APP_URL=https://damii.gh

# Admin Passkey
ADMIN_SECRET_KEY=damii-admin-2026
```

## Database Schema & Migrations

- SQLite schema: `db/schema.ts`
- PostgreSQL schema: `db/schema.pg.ts`
- MySQL schema: `db/schema.mysql.ts`

Generate migrations per dialect:
```bash
npm run db:generate
```

## Running the Application

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Run tests and build:
   ```bash
   npm run test
   ```

## Application Routes

- `/`: Marketing Landing Page
- `/arena`: Game Arena (10x10 Board, Local & Online)
- `/leagues`: Tournament Hub & Brackets
- `/wallet`: Paystack Wallet & Transactions
- `/admin`: Control Center & Dispute Resolver
- `/api/damii`: Game Engine API
- `/api/wallet`: Wallet & Paystack API
- `/api/wallet/paystack-webhook`: Paystack Webhook
- `/api/league`: Tournament API
- `/api/admin`: Admin Management API

## Compliance & Safe Play

All wager pots are managed via automated escrow locks. The platform enforces skill-based competition rules and maintains immutable transaction logs for all deposits, conversions, and payouts.
