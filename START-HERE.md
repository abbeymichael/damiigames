# DAMII — Draughts Arena & Tournament Platform (MySQL)

A full-stack, enterprise-grade implementation of traditional draughts (10x10 Damii) backed by MySQL via Drizzle ORM, with Paystack Mobile Money integration, automated wager escrow, tournament leagues, turn clocks with disconnection handling, and role-guarded admin management.

## Key Features

* **MySQL Persistence (dev + prod)**: A single Drizzle ORM schema (`db/schema.mysql.ts`) and a mysql2 connection pool (`lib/db/mysql-connection.ts`) serve every environment. The legacy JSON/SQLite/Postgres paths were removed — development and production share one code path and one schema.
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
# MySQL — the only supported database, used in development AND production
DATABASE_DIALECT=mysql
DATABASE_URL=mysql://root:password@127.0.0.1:3306/damii
# (or discrete MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE)

# Paystack API Keys
PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_APP_URL=https://damii.gh

# Admin Passkey
ADMIN_SECRET_KEY=damii-admin-2026
```

## Database Schema & Migrations

- MySQL schema: `db/schema.mysql.ts` (the single authoritative schema)
- Migrations live in `drizzle/mysql/` and are tracked in the `__drizzle_migrations` table.

Generate & apply migrations:
```bash
npm run db:generate   # regenerate SQL from the schema
npm run db:migrate    # apply pending migrations to MySQL
npm run env:check     # validate config + verify MySQL connectivity
```

## Running the Application

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Create the database and apply the schema:
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS damii CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   npm run db:migrate
   ```
3. Start the development server (MySQL-backed, same as production):
   ```bash
   npm run dev
   ```
4. Run tests and build (tests require a reachable MySQL — point `DATABASE_URL` at a test database):
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
