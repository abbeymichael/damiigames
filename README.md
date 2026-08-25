# DAMII — 10x10 Draughts Arena, Tournament & Wager Platform

**DAMII** is a full-stack, competitive web application and tournament platform for traditional **10x10 West African (Ghanaian) & International Draughts**. Designed for high-stakes competition, casual play, and organized esports leagues, DAMII combines an authentic rules engine with real-time multiplayer, double-entry escrow wagering, automated tournament brackets, and a comprehensive administrative arbitration console.

---

## 🌟 Key Feature Highlights

### 1. Authentic 10x10 Draughts Engine & Rule Variations
* **Standard 10x10 Board Matrix**: 100 dark and light squares with 20 men per player, following official international and West African draughts rules.
* **Compulsory Multi-Jump Captures**: Multi-step capturing logic supporting forward and backward captures for men.
* **Flying Kings (Long-Range Diagonals)**: Unlocked kings can travel and capture across arbitrary diagonal distances.
* **Configurable Rule Variations**:
  * **Capture Rules**: Standard Compulsory, Majority Capture (must take the path with the highest quantity of pieces), or Free Choice.
  * **Flying King Dynamics**: Full Long Diagonal (unlimited steps), Restricted Range (up to 3 squares), or Classic Single-Step jumping.
  * **King Promotion Timing**: Immediate mid-jump promotion vs. End-of-Turn promotion.
* **Move Validation & Anti-Cheating**: Fully validated server-side move execution preventing illegal transitions or desynchronization.
* **Automated Draw & Stalemate Conditions**: Detection of no legal moves, board exhaustion, repetition draw rules, and bilateral draw negotiation.

---

### 2. Multi-Mode Matchmaking & Game Arenas
* **Online Multiplayer (PvP)**: Create private rooms with custom 6-character room codes or join via quick-share invite links.
* **Wagered 1v1 Matches**: Real-time escrow-backed matches with customizable stake sizes.
* **AI / CPU Opponents**: Single-player offline matches with adaptive AI difficulty levels (Easy, Medium, Hard).
* **Local Pass & Play**: Two-player shared screen mode on desktop or mobile.
* **Spectator Mode**: Live viewing capability for ongoing tournament games and high-stakes matches with real-time board updates.

---

### 3. Match Arena HUD & Player Experience
* **Detached Adaptive Player HUD**: Responsive status indicators showing captured pieces, player ratings, active turn badges, and connection states without interfering with the board zoom.
* **Dynamic Turn Clock & Blitz Timers**: Configurable turn timers (30s, 60s, 90s) with audio-visual countdown warnings.
* **Disconnection Grace Window & Reconnection**: 90-second pause window allowing disconnected players to reconnect and resume without immediate forfeit.
* **Move History & Notation Log**: Real-time notation log tracking all moves, multi-jumps, king promotions, and timestamps.
* **Interactive Board Tools**:
  * Board flip (rotate perspective 180°).
  * Smooth board zoom and pan for mobile and compact displays.
  * Audio sound effects and haptic vibration feedback for captures, moves, king promotions, and turn alerts.
  * Resign, offer draw, and report dispute triggers.

---

### 4. Comprehensive Tournament & League System
* **Bracket Formats**: Full support for **Single Elimination** and **Double Elimination** tournament structures.
* **Automated Tournament Seeding**: Seeding engine pairing top seeds across rounds (Round of 16, Quarterfinals, Semifinals, Grand Finals).
* **Automated Blitz Tiebreakers**: Automatic creation of rapid 30s blitz rooms in the event of tournament match draws.
* **Prize Pool & Escrow Management**: Facilitator-funded prize pools with automated percentage payouts to 1st, 2nd, and 3rd place winners upon tournament completion.
* **Interactive Bracket Visualizer**: Full-screen interactive tournament bracket visualizer with pan and zoom controls.
* **Certified Organizer System**: Application submission, review, and badging flow allowing trusted community leaders to organize sanctioned leagues.
* **Custom Tournament Constraints**: Set minimum/maximum rating requirements, regional restrictions, custom turn clocks, and custom rule variations per tournament.

---

### 5. Dual-Currency Economy & Escrow Ledger
* **Dual Currency Engine**:
  * **Points**: In-game loyalty, match rewards, and tournament scores.
  * **Marbles**: Premium competitive tokens tied 1:1 with Ghanaian Cedi (GHS).
* **Paystack Payment Integration**: Direct deposit workflow supporting **Mobile Money** (MTN, Vodafone/Telecel, AirtelTigo) and Visa/Mastercard.
* **Double-Entry Financial Ledger**: Invariant-backed transaction tracking for deposits, wagers, escrow holds, dispute refunds, and withdrawals.
* **Withdrawal Request Management**: Streamlined player withdrawal requests with audit trails, transaction reference logging, and automated balance locks.
* **Platform Treasury & Revenue Tracking**: Transparent tracking of house rake fees, tournament organizer cuts, and circulating balances.

---

### 6. Administrative Governance & Dispute Arbitration
* **Granular Role-Based Access Control (RBAC)**:
  * **Super Admin**: Full platform configuration, role assignments, financial controls, and system maintenance.
  * **Finance Admin**: Withdrawal processing, exchange rate configuration, and deposit verification.
  * **Tournament Admin & Arbiter**: Bracket oversight, match dispute arbitration, and organizer application reviews.
  * **Certified Organizer**: League creation, bracket seeding, and prize pool sponsorship.
  * **Player**: Public matchmaking, wagers, tournaments, and wallet actions.
* **Live Dispute Arbitration Console**:
  * Inspect live or completed match boards square by square.
  * Review full timestamped move histories and chat logs.
  * Enforce resolutions: Award win to either player, declare a tie, or void match with full escrow refund.
* **Player Moderation Suite**: Instant account suspensions, role promotions, and balance audit adjustments.
* **Platform Financial Health Dashboard**: Live visual metrics tracking total circulating supply, active escrow holdings, collected platform revenue, and pending liabilities.

---

### 7. Technical Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15+ (App Router with React 19) |
| **Styling** | Tailwind CSS v4 (Modern high-contrast dark green & gold aesthetic) |
| **Database & ORM** | MySQL 8.0+ / MariaDB via Drizzle ORM with atomic SQL transactions |
| **Icons & Visuals** | Lucide React with custom vector SVG game pieces and board elements |
| **Charts & Metrics** | Recharts & D3 for financial dashboards and bracket graphs |
| **Payment Gateway** | Paystack Standard & Mobile Money Webhooks |
| **Deployment Target** | Shared Hosting (cPanel / Phusion Passenger / Apache / LiteSpeed) & Cloud Containers |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **MySQL / MariaDB**: `8.0+`

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/damii-game.git
   cd damii-game
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your database and API credentials:
   ```bash
   cp .env.example .env
   ```

4. **Run Database Migrations & Environment Verification**:
   ```bash
   npm run db:migrate
   npm run env:check
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on port 3000. |
| `npm run build` | Compiles the production build. |
| `npm run start` | Launches the production server. |
| `npm run db:migrate` | Applies Drizzle database schema migrations to MySQL. |
| `npm run db:generate`| Generates new SQL migration files from schema changes. |
| `npm run seed` | Seeds default admin roles and profiles (with 0 balances). |
| `npm run env:check` | Validates environment variables and database connectivity. |
| `npm run lint` | Runs ESLint checks across the codebase. |
| `npm run typecheck` | Runs TypeScript compilation verification without emitting files. |

---

## 📖 Deployment Guides

For detailed instructions on deploying DAMII to production shared hosting environments (cPanel, Namecheap, Hostinger, SiteGround, etc.), please consult [SHARED_HOSTING_DEPLOYMENT.md](./SHARED_HOSTING_DEPLOYMENT.md).

---

## ⚖️ License & Credits

Developed with precision for draughts enthusiasts, tournament organizers, and competitive players worldwide.
