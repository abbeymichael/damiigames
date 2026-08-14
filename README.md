# DAMII — Multi-Dialect Ghanaian Draughts Platform

DAMII is a modern web application for traditional Ghanaian 10x10 draughts, featuring multi-dialect database support (SQLite, PostgreSQL, MySQL), Paystack wallet top-ups, automated wager escrow, tournament leagues, turn timers, and role-guarded admin controls.

## Features Overview

- **10x10 Draughts Engine**: Compulsory captures, flying kings, server-side move validation, 60s turn clocks, and 45s disconnection grace periods.
- **Multi-Dialect Persistence**: DB client factory supporting SQLite (D1 / Local Memory), PostgreSQL, and MySQL using Drizzle ORM.
- **User Authentication System**: Complete Sign In and Registration flow with welcome bonus Points and persistent session tokens.
- **Paystack Points Wallet & Escrow**: Streamlined Points currency (1 GHS = 100 Points). Top-up Points via Paystack, lock wager pots in escrow during matches, and cash out to Mobile Money (MTN / Telecel / AT).
- **Tournament Leagues**: Host single-elimination tournaments with automated bracket generation and prize pool payouts.
- **Admin Control Center**: Monitor system health, grant Facilitator/Admin roles, and resolve match disputes via direct `/admin` URL.

---

## How to Run DAMII on Your Local Machine

Follow these step-by-step instructions to get DAMII running locally on your computer:

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: Installed on your system

---

### Step 1: Clone or Open the Repository

Open your terminal (Command Prompt / PowerShell / Terminal) and navigate to your working folder:

```bash
git clone <repository-url>
cd damii-game
```

---

### Step 2: Install Dependencies

Install all package dependencies using `npm`:

```bash
npm install
```

---

### Step 3: Set Up Environment Variables

Create a new file named `.env.local` in the root folder of the project. Copy and paste the following configuration:

```env
# Database Dialect: "sqlite" | "postgres" | "mysql"
DATABASE_DIALECT=sqlite
DATABASE_URL=sqlite.db

# Paystack Secret Key (Optional test key for local wallet top-ups)
PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin Passkey (Required to unlock the /admin route)
ADMIN_SECRET_KEY=damii-admin-2026
```

> **Note**: For local development, `DATABASE_DIALECT=sqlite` works out-of-the-box in memory / local file without needing external database setup.

---

### Step 4: Start the Development Server

Run the development command:

```bash
npm run dev
```

You will see output indicating that Next.js is running:

```text
▲ Next.js 15.1.0
  - Local:        http://localhost:3000
```

---

### Step 5: Open Application in Browser

Open your web browser and navigate to:

- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Game Arena**: [http://localhost:3000/arena](http://localhost:3000/arena)
- **Tournament Hub**: [http://localhost:3000/leagues](http://localhost:3000/leagues)
- **Wallet & Paystack**: [http://localhost:3000/wallet](http://localhost:3000/wallet)
- **Admin Portal**: Follow the link at [http://localhost:3000/admin](http://localhost:3000/admin) (or click **Admin Portal** link in the footer). Log in using default admin credentials.

---

## Default Admin Credentials

For initial system setup and platform administration, the following default accounts are seeded:

| Account Type | Username | Password | Purpose / Role |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin123` | System management, tournament oversight & ledger execution |
| **Super Admin** | `superadmin` | `admin123` | Backup system admin |
| **Facilitator** | `DAMII Facilitator` | `admin123` | Tournament league creator |
| **Player 1** | `Kwame_Master` | `123456` | Rated player account |
| **Player 2** | `Ama_Queen` | `123456` | Rated player account |

> 🔒 **Security Notice**: Once logged in to the Admin Portal (`/admin`), administrators can update credentials at any time from the **Users** or **Admin Roles** tab. Admin accounts act purely as facilitators and regulators and are blocked from participating in player matches or wagers.

---

### Additional Commands

- **Production Build**:
  ```bash
  npm run build
  ```
- **Start Production Server**:
  ```bash
  npm run start
  ```
- **Run Tests**:
  ```bash
  npm run test
  ```

---

See [START-HERE.md](./START-HERE.md) for full architecture and dialect details.
