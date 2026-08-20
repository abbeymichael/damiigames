# Deploying DAMII to a Node.js Production Server

This guide provides comprehensive instructions for deploying the **DAMII Ghanaian Draughts Arena & Tournament Platform** on a production Node.js server environment (Cloud Run, VPS, Railway, Render, Docker, or bare metal).

---

## 1. System Requirements & Architecture

DAMII is a full-stack Next.js App Router application requiring a persistent Node.js environment to support real-time game engine polling, session management, financial ledger processing, and Paystack webhook processing.

### Prerequisites:
- **Node.js**: `v22.13.0` or higher
- **Package Manager**: `npm` v10+
- **Database**: MySQL 8+ or MariaDB 10.4+ — the only supported dialect, used in development AND production. There is no SQLite/Postgres/JSON-file path any more.

---

## 2. Environment Variables Configuration

Create a `.env.production` file (or set environment variables in your deployment platform control panel):

```env
# Node Environment & Server Config
NODE_ENV=production
PORT=3000

# Administrative Credentials & Security Keys
ADMIN_SECRET_KEY=your_secure_admin_secret_key_here
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret_key_here
ADMIN_PASSCODE=admin123_change_in_production

# MySQL — the only supported database (required in every environment)
DATABASE_DIALECT=mysql
DATABASE_URL=mysql://user:password@localhost:3306/damii
# ...or discrete variables (useful on cPanel / shared hosting):
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=damii_user
# MYSQL_PASSWORD=strong-password
# MYSQL_DATABASE=damii
# MYSQL_SSL=false
# MYSQL_POOL_SIZE=10

# Hostname & Domain Configuration
NEXT_PUBLIC_APP_URL=https://damii.app
```

---

## 3. Direct Node.js Build & Execution

To build and start the server manually on a host machine:

### Step 1: Install Production Dependencies
```bash
npm ci --only=production
```

### Step 2: Build the Production Application
```bash
npm run build
```

### Step 3: Create the MySQL Database & Apply the Schema
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS damii CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
npm run db:migrate   # creates all tables (tracked in __drizzle_migrations)
npm run env:check    # validates config + verifies connectivity
```

Default admin/player accounts are seeded automatically on first boot (idempotent); `npm run seed` re-runs the seeder explicitly if needed.

### Step 4: Start the Production Node.js Server
```bash
npm start
```

By default, the server listens on `http://localhost:3000`.

---

## 4. Docker Container Deployment

A multi-stage Docker build produces a lightweight, secure production image.

### Production `Dockerfile`
```dockerfile
# --- Stage 1: Build Image ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
ENV NODE_ENV=production
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# MySQL is required — provide DATABASE_URL / MYSQL_* via the runtime environment.

# Copy built artifacts and production node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/db ./db
COPY --from=builder /app/drizzle ./drizzle

USER node

EXPOSE 3000

# Apply MySQL migrations, then boot. (All state lives in MySQL — no volume needed.)
CMD ["sh", "-c", "npm run db:migrate && npm start"]
```

### Docker Build & Run Commands
```bash
# Build the Docker image
docker build -t damii-game:latest .

# Run the container (MySQL connection supplied via env file — no app volume required)
docker run -d \
  --name damii-server \
  -p 3000:3000 \
  --env-file .env.production \
  damii-game:latest
```

---

## 5. PM2 Process Manager Configuration (VPS / Linux)

PM2 provides daemonization, zero-downtime reloads, and automatic crash recovery on Linux VPS instances.

### Create `ecosystem.config.cjs`
```javascript
module.exports = {
  apps: [
    {
      name: 'damii-arena',
      script: 'scripts/start.js',
      // MySQL handles cross-process concurrency (atomic updates + transactions),
      // so multiple instances against one database are safe.
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env.production',
      max_memory_restart: '1G',
      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
    },
  ],
};
```

### PM2 Execution Commands
```bash
# Install PM2 globally
npm install -g pm2

# Start DAMII process
pm2 start ecosystem.config.cjs

# Save PM2 process list to start automatically on system reboot
pm2 save
pm2 startup
```

---

## 6. Reverse Proxy Setup (Nginx + SSL / Let's Encrypt)

Run Nginx as a reverse proxy in front of Node.js for SSL termination, HttpOnly cookie forwarding, and rate limiting.

### Nginx Configuration (`/etc/nginx/sites-available/damii`)
```nginx
server {
    listen 80;
    server_name damii.app www.damii.app;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name damii.app www.damii.app;

    # SSL Certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/damii.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/damii.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy headers for HttpOnly cookies & IP identification
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for low-latency game state polling
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Enable Site and Issue SSL Certificate
```bash
sudo ln -s /etc/nginx/sites-available/damii /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Issue Let's Encrypt SSL Certificate
sudo certbot --nginx -d damii.app -d www.damii.app
```

---

## 7. Cloud Deployment Guides

### A. Google Cloud Run
1. Build & push container image to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/damii-app
   ```
2. Deploy service:
   ```bash
   gcloud run deploy damii-service \
     --image gcr.io/YOUR_PROJECT_ID/damii-app \
     --platform managed \
     --region europe-west1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-env-vars DATABASE_DIALECT=mysql,DATABASE_URL="mysql://user:pass@host:3306/damii"
   ```
   (Provision a Cloud SQL MySQL 8 instance or any reachable MySQL server first.)

### B. Railway / Render
1. Connect your GitHub repository.
2. Provision a MySQL database (Railway/Render MySQL plugin, PlanetScale, Aiven, etc.).
3. Set Build Command: `npm run build`
4. Set Start Command: `npm run db:migrate && npm start`
5. Add environment variables in dashboard (`PAYSTACK_SECRET_KEY`, `ADMIN_SECRET_KEY`, `DATABASE_DIALECT=mysql`, `DATABASE_URL` or the `MYSQL_*` set).

### C. Shared Hosting (cPanel / CloudLinux Node.js App / Phusion Passenger)
Shared hosts (Namecheap, Hostinger, SiteGround, cPanel-based providers) run Node.js using Phusion Passenger or Apache reverse proxy.

1. **Create MySQL Database in cPanel**:
   - Go to **cPanel > MySQL Databases Wizard**.
   - Create a database (e.g. `yourcpaneluser_damii`).
   - Create a user with a strong password and assign **ALL PRIVILEGES** to the database.

2. **Upload & Extract Application Files**:
   - Upload project files to a folder outside `public_html` (e.g. `/home/username/damii_app`) or in your target application root.
   - Ensure `server.js` (or `app.js`) is present at the root directory.

3. **Configure Environment Variables (`.env`)**:
   - Create `.env` or `.env.production` in your application root:
     ```env
     NODE_ENV=production
     DATABASE_DIALECT=mysql
     MYSQL_HOST=localhost
     MYSQL_PORT=3306
     MYSQL_USER=yourcpaneluser_damiiuser
     MYSQL_PASSWORD=your_mysql_password
     MYSQL_DATABASE=yourcpaneluser_damii
     ADMIN_SECRET_KEY=your_secure_24_char_secret_key_here
     PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret
     NEXT_PUBLIC_APP_URL=https://yourdomain.com
     ```

4. **Setup Node.js App in cPanel**:
   - Open **cPanel > Setup Node.js App** (or **Node.js Selector**).
   - Click **Create Application**.
   - **Node.js version**: Choose `22.x` (or `20.x+`).
   - **Application mode**: `Production`.
   - **Application root**: `damii_app` (or your folder path).
   - **Application URL**: `yourdomain.com` (or subdomain).
   - **Application startup file**: `server.js` (or `app.js`).
   - Click **Create**.

5. **Install Dependencies & Run Migrations**:
   - In cPanel, copy the virtual environment command (e.g., `source /home/username/nodevenv/.../bin/activate`).
   - Open **cPanel Terminal** (or connect via SSH), paste the virtualenv command, and run:
     ```bash
     npm ci --only=production
     npm run build
     npm run db:migrate
     npm run env:check
     ```

6. **Start / Restart Application**:
   - Click **Restart** in the cPanel Node.js App manager.
   - Your DAMII Arena is now live on shared hosting!

---

## 8. Database Migration & Maintenance

When deploying schema updates using Drizzle ORM (MySQL-only):

```bash
# Regenerate SQL migrations from db/schema.mysql.ts into drizzle/mysql/
npm run db:generate

# Apply pending migrations to the configured MySQL database
npm run db:migrate

# Re-run the idempotent seeder if default accounts are missing
npm run seed
```

---

## 9. Security Verification Checklist

- [x] **Secret Isolation**: `PAYSTACK_SECRET_KEY` and `ADMIN_SECRET_KEY` are kept strictly in server environment variables.
- [x] **Session Security**: HttpOnly `damii_session` cookies and `x-csrf-token` verification enabled.
- [x] **Data Persistence**: MySQL 8+ database provisioned, schema applied via `npm run db:migrate`, and connectivity verified with `npm run env:check`.
- [x] **SSL / HTTPS**: Reverse proxy correctly forwards `X-Forwarded-Proto: https` so secure cookies operate properly.
