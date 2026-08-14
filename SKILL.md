# SKILL.md — DAMII Project Capabilities & Developer Skill Sheet

This document outlines the core capabilities, architectural workflows, and specialized skills required for maintaining and extending the **DAMII Ghanaian Draughts Arena & Tournament Platform**.

---

## 🛠️ Core Project Skills

### 1. Ghanaian 10x10 Draughts (Damii) Engine
- **Rules Implementation**: Located in `lib/damii-rules.ts`. Handles 10x10 board layout (50 dark playable squares), piece movement, mandatory maximum capture enforcement, multi-jump sequences, and flying kings.
- **Clock & Disconnection Management**: Enforces 60-second turn clocks and a 45-second reconnection grace period before declaring automatic forfeits.

### 2. Multi-Dialect Database Persistence
- **Supported Dialects**: SQLite (Cloudflare D1 / File / Memory), PostgreSQL, and MySQL.
- **Dialect Switcher**: Configured via `DATABASE_DIALECT` in `lib/db-client.ts` and `drizzle.config.ts`.
- **Database Seeding**: Invoke `dbRepository.seedDatabase()` or `POST /api/admin` (`action: "seed"`) to populate default administrator and player accounts.

### 3. Paystack Mobile Money & Wager Escrow Engine
- **Mobile Money Top-Up**: Integrates Paystack API for Ghanaian Mobile Money (MTN MoMo, Telecel Cash, AT Money).
- **Automated Escrow**: Locks Marble wagers in `/lib/wallet-service.ts` upon game initialization and transfers payouts upon match conclusion.
- **Paystack Webhook Listener**: Endpoint `/app/api/wallet/paystack-webhook/route.ts` verifies HMAC signature (`x-paystack-signature`) before crediting wallets.

### 4. Tournament League Generator & Brackets
- **Single Elimination Generator**: Located in `lib/league-service.ts`. Generates balanced single-elimination tournament trees with automatic BYE assignment for odd participant counts.
- **Participant Check-In**: Manages check-in states, seed distribution, and linked match creation for online tournament games.

### 5. Role-Guarded Administration & Dispute Resolution
- **Roles**: `super_admin`, `admin`, `treasurer`, `facilitator`, and `user`.
- **Admin Service**: `lib/admin-service.ts` handles administrator login authentication, system metric collection, role updates, transaction audit logs, and match dispute overrides.

---

## ⚡ Quick Operational Workflows

### Resetting & Seeding the Database
To reset or generate default admin and player profiles:
```bash
# Call Admin API Seeder Endpoint
curl -X POST http://localhost:3000/api/admin \
  -H "Content-Type: application/json" \
  -d '{"action": "seed"}'
```

### Starting Development Server
```bash
npm run dev
```

### Verifying Compilation & Lint
```bash
npm run build
```

---

## 📋 Default Credentials Quick Reference

- **Admin Account**: `admin` / `admin123`
- **Superadmin Account**: `superadmin` / `admin123`
- **Facilitator Account**: `DAMII Facilitator` / `admin123`
- **Player Accounts**:
  - `Kwame_Master` / `123456`
  - `Ama_Queen` / `123456`
  - `Kofi_Grandmaster` / `123456`
