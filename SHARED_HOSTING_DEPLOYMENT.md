# Deploying DAMII to Shared Hosting (cPanel / Plesk / CloudLinux / Apache)

This guide provides step-by-step instructions for deploying the **DAMII Draughts Arena & Tournament Platform** to shared hosting providers (such as Namecheap, Hostinger, SiteGround, Bluehost, A2 Hosting, GoDaddy, or any cPanel/Plesk host supporting Node.js).

---

## 1. Hosting Requirements & Overview

DAMII is built with **Next.js App Router** and uses **MySQL** as its single authoritative database dialect.

### Prerequisites:
- **Node.js**: v20.x or v22.x (supported via cPanel **"Setup Node.js App"** / **Node.js Selector** / Phusion Passenger)
- **Database**: MySQL 8.0+ or MariaDB 10.4+ (created via cPanel **MySQL Databases Wizard**)
- **Storage**: Standard shared hosting disk space (SSH or File Manager access)
- **Domain / SSL**: Any primary domain or subdomain with a free Let's Encrypt SSL certificate

---

## 2. Step 1: Create MySQL Database & User in cPanel

1. Log in to your **cPanel** control panel.
2. Navigate to **Databases > MySQL Database Wizard**.
3. **Step 1 - Create Database**:
   - Enter database name (e.g. `damii`). Your full database name will look like: `cpaneluser_damii`.
   - Click **Next Step**.
4. **Step 2 - Create Database User**:
   - Enter username (e.g. `damiiuser`). Full username: `cpaneluser_damiiuser`.
   - Generate a strong password (copy and save this password securely).
   - Click **Create User**.
5. **Step 3 - Add User to Database**:
   - Check the box for **ALL PRIVILEGES**.
   - Click **Make Changes**.

---

## 3. Step 2: Upload Application Files

1. On your local machine, prepare the project files (ensure you include `package.json`, `server.js`, `app.js`, `.htaccess.example`, and application source folders).
2. Compress the files into a `.zip` archive (excluding `node_modules` and `.next` build cache).
3. In cPanel, open **File Manager**.
4. Navigate to your user root (e.g., `/home/cpaneluser/`).
5. Create a dedicated folder for the application:
   ```
   /home/cpaneluser/damii_app
   ```
   *(Keeping the application folder outside `public_html` is recommended for security).*
6. Upload your `.zip` file into `/home/cpaneluser/damii_app` and extract it.

---

## 4. Step 3: Configure Environment Variables

Create a `.env` file in your application root directory (`/home/cpaneluser/damii_app/.env`):

```env
# Application Environment
NODE_ENV=production
PORT=3000

# App Public URL (Must include https:// and your live domain)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database Connection (MySQL / MariaDB on Shared Hosting)
DATABASE_DIALECT=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=cpaneluser_damiiuser
MYSQL_PASSWORD=your_secure_mysql_password_here
MYSQL_DATABASE=cpaneluser_damii
MYSQL_SSL=false
MYSQL_POOL_SIZE=10

# Security & Admin Keys
# Generate a random 32-character hex key for ADMIN_SECRET_KEY
ADMIN_SECRET_KEY=generate_a_random_32_character_hex_secret_here

# Paystack API Keys (for Mobile Money / Card Payments)
PAYSTACK_SECRET_KEY=sk_live_your_live_paystack_secret_key_here
```

> **Note on Database Host**: On most shared hosts, `localhost` or `127.0.0.1` is the standard MySQL host. If your provider uses a remote MySQL server, specify the host IP/hostname provided in cPanel.

---

## 5. Step 4: Configure Node.js Application in cPanel

1. In cPanel, navigate to **Software > Setup Node.js App** (or **Node.js Selector**).
2. Click **Create Application**.
3. Fill out the application settings:
   - **Node.js version**: Select `22.x` (or `20.x`).
   - **Application mode**: `Production`.
   - **Application root**: `damii_app` (or the folder path relative to your home directory).
   - **Application URL**: Select your domain or subdomain (e.g. `yourdomain.com` or `play.yourdomain.com`).
   - **Application startup file**: `server.js` (or `app.js`).
4. Click **Create**.

---

## 6. Step 5: Install Dependencies & Run Database Migrations

cPanel will generate a virtual environment command at the top of the Node.js App page, for example:
`source /home/cpaneluser/nodevenv/damii_app/22/bin/activate && cd /home/cpaneluser/damii_app`

1. Open **cPanel Terminal** (or connect via SSH):
2. Paste the virtual environment activation command.
3. Install production dependencies:
   ```bash
   npm ci --only=production
   ```
4. Build the Next.js production bundle:
   ```bash
   npm run build
   ```
5. Apply database schema migrations:
   ```bash
   npm run db:migrate
   ```
6. Verify your configuration and database connection:
   ```bash
   npm run env:check
   ```
7. *(Optional)* Seed initial admin accounts (with sanitized 0 balances):
   ```bash
   npm run seed
   ```

---

## 7. Step 6: Apache `.htaccess` Configuration

If your shared host uses Phusion Passenger or reverse proxy, cPanel automatically configures `.htaccess`. If you need custom Apache routing or compression, create or verify `.htaccess` in your web root (`public_html` or domain document root):

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule ^$ http://127.0.0.1:3000/ [P,L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
</IfModule>

<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

---

## 8. Step 7: Restart Application & Verify

1. Go back to **cPanel > Setup Node.js App**.
2. Click the **Restart** button on your DAMII application.
3. Visit `https://yourdomain.com` in your browser.
4. Verify the following:
   - Matchmaking and 10x10 Draughts Arena load smoothly.
   - Admin Login functions at `https://yourdomain.com/admin`.
   - Tournament leagues and brackets are interactive.
   - Paystack deposit modal connects properly to your configured keys.

---

## 9. Troubleshooting & FAQ

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **503 Service Unavailable** | Node.js process is stopped or failed to start | Check application logs in `/home/cpaneluser/damii_app/stderr.log` or run `npm run env:check` via Terminal. |
| **Database Connection Error (ER_ACCESS_DENIED)** | Incorrect MySQL credentials in `.env` | Verify `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` match the database created in cPanel. Ensure user has ALL PRIVILEGES. |
| **EADDRINUSE (Port busy)** | Port conflict | In cPanel Phusion Passenger, Passenger automatically assigns an internal Unix socket or port. Keep `PORT=3000` in `.env`. |
| **Blank Page / Static Assets 404** | Missing Next.js build | Run `npm run build` inside the virtual environment in Terminal and click **Restart** in cPanel. |
| **SSL / Cookie Warnings** | Missing HTTPS redirect | Enable **Force HTTPS Redirect** under cPanel **Domains** or **SSL/TLS Status**. |

---

## 10. Summary of Available NPM Commands

| Command | Action |
| :--- | :--- |
| `npm run build` | Compiles the Next.js App Router application for production. |
| `npm run db:migrate` | Applies pending Drizzle database migrations to MySQL. |
| `npm run env:check` | Verifies database connectivity and environment variable configuration. |
| `npm run seed` | Seeds default admin and player accounts (with 0 balances). |
| `npm start` | Starts the production server. |
