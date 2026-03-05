# FurnitureShop — Deployment & Operations Guide

**Version**: 1.0
**Last updated**: 2026-03-05
**Audience**: DevOps engineers, system administrators, developers responsible for deploying FurnitureShop to production.

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [VPS Requirements](#2-vps-requirements)
3. [Option A: Bare Metal Deployment (No Docker)](#3-option-a-bare-metal-deployment-no-docker)
4. [Option B: Docker Deployment](#4-option-b-docker-deployment)
5. [SSL / HTTPS Setup](#5-ssl--https-setup)
6. [GitHub Actions CI/CD](#6-github-actions-cicd)
7. [Update / Redeploy Procedure](#7-update--redeploy-procedure)
8. [Operations & Monitoring](#8-operations--monitoring)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Infrastructure Overview

### Architecture Diagram

```
Internet (HTTPS :443 / HTTP :80)
         |
         v
+------------------+
|   Nginx           |  Port 80  → redirect to 443
|  (reverse proxy)  |  Port 443 → SSL termination
+------------------+
      |         |
      |         +-----------------------------+
      |                                       |
      v                                       v
+------------------+               +--------------------+
|  Angular SPA     |               |   Backend API       |
|  (static files)  |               |   Node.js/Express   |
|  /usr/share/     |               |   Port 3000         |
|  nginx/html      |               |   (internal only)   |
+------------------+               +--------------------+
                                           |
                                           v
                                  +------------------+
                                  |  PostgreSQL 16    |
                                  |  Port 5432        |
                                  |  (internal only)  |
                                  +------------------+
```

### Request Flow

```
Browser → Nginx (443)
  GET /           → serve /usr/share/nginx/html/index.html  (Angular SPA)
  GET /products   → serve index.html  (Angular handles client-side routing)
  GET /api/*      → proxy_pass http://backend:3000/api/*
  GET /api/health → backend responds with { status: "ok" }
```

### Deployment Options

| Option | Pros | Cons | Recommended for |
|--------|------|------|-----------------|
| **Bare Metal (PM2)** | Full OS control, no Docker overhead, easier debugging | Manual dependency management, harder to replicate | VPS with limited RAM (<1 GB), teams without Docker experience |
| **Docker Compose** | Isolated environment, reproducible builds, matches CI/CD pipeline, easy rollback | Requires Docker knowledge, slightly more RAM | All production deployments — the recommended approach |

The primary production method for FurnitureShop is **Option B (Docker Compose)** — it is used by the automated CI/CD pipeline. Option A is documented as a fallback.

---

## 2. VPS Requirements

### Minimum Hardware Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| vCPU | 1 core | 2 cores |
| RAM | 1 GB | 2 GB |
| Disk | 20 GB SSD | 40 GB SSD |
| Bandwidth | 100 Mbps | 1 Gbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS or Debian 12 |

> **Note**: Docker adds approximately 150–200 MB of baseline RAM overhead. For low-memory VPS (512 MB), use Option A (bare metal).

### Supported Operating Systems

- Ubuntu 22.04 LTS (Jammy) — **primary, fully tested**
- Ubuntu 20.04 LTS (Focal) — supported
- Debian 12 (Bookworm) — supported
- Debian 11 (Bullseye) — supported

### Required Open Ports

| Port | Protocol | Purpose | Direction |
|------|----------|---------|-----------|
| 22 | TCP | SSH access for administration and CI/CD deployment | Inbound |
| 80 | TCP | HTTP — redirects to HTTPS | Inbound |
| 443 | TCP | HTTPS — main application traffic | Inbound |

**Internal ports (not exposed externally):**

| Port | Service | Notes |
|------|---------|-------|
| 3000 | Backend API | Accessible only within Docker network or localhost |
| 5432 | PostgreSQL | Accessible only within Docker network or localhost |

### Domain Name

A registered domain name pointing to your VPS IP is required before proceeding with SSL setup. Update the DNS A record:

```
A   yourdomain.com      → <VPS_IP>
A   www.yourdomain.com  → <VPS_IP>
```

Allow 10–60 minutes for DNS propagation before running Certbot.

---

## 3. Option A: Bare Metal Deployment (No Docker)

This section covers deploying FurnitureShop directly on the server OS using PM2 for process management. All commands assume **Ubuntu 22.04** or **Debian 12** running as root or with `sudo`.

### 3.1 System Update

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential ufw
```

### 3.2 Install Node.js 20

```bash
# Install NodeSource repository for Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version    # should output v20.x.x
npm --version     # should output 10.x.x
```

### 3.3 Install PostgreSQL 16

```bash
# Add PostgreSQL APT repository
apt install -y gnupg2 wget
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list

apt update
apt install -y postgresql-16

# Start and enable PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# Verify
systemctl status postgresql
```

### 3.4 Configure PostgreSQL

```bash
# Switch to postgres system user
sudo -u postgres psql

-- Inside psql shell:
CREATE USER furnitureuser WITH PASSWORD 'StrongPassword123!';
CREATE DATABASE furnituredb OWNER furnitureuser;
GRANT ALL PRIVILEGES ON DATABASE furnituredb TO furnitureuser;
\q
```

Verify the connection:

```bash
psql -U furnitureuser -h localhost -d furnituredb -c "SELECT version();"
# Will prompt for password: StrongPassword123!
```

Edit `/etc/postgresql/16/main/pg_hba.conf` to allow password authentication for the application user:

```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

Ensure this line exists (add if missing):

```
# TYPE  DATABASE        USER            ADDRESS         METHOD
host    furnituredb     furnitureuser   127.0.0.1/32    md5
```

Reload PostgreSQL after any configuration change:

```bash
systemctl reload postgresql
```

### 3.5 Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 3.6 Clone the Repository

```bash
mkdir -p /opt/furniture-shop
git clone https://github.com/ndlong75/furniture-shop.git /opt/furniture-shop
cd /opt/furniture-shop
```

### 3.7 Backend Setup

```bash
cd /opt/furniture-shop/backend

# Install production dependencies
npm ci --omit=dev

# Wait — for building we need dev deps (TypeScript compiler)
npm ci

# Create environment file
cp .env.example .env
nano .env
```

Edit `.env` with production values:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://furnitureuser:StrongPassword123!@localhost:5432/furnituredb
JWT_SECRET=replace-with-a-very-long-random-string-at-least-64-chars
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://yourdomain.com
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

```bash
# Compile TypeScript
npm run build

# Remove dev dependencies to save space
npm ci --omit=dev

# Run database migrations
npm run migrate

# Seed initial data (categories, sample products, admin user)
npm run seed
```

### 3.8 Install and Configure PM2

PM2 is the Node.js process manager for production. It handles auto-restart on crash and startup on server reboot.

```bash
# Install PM2 globally
npm install -g pm2

# Start the backend
cd /opt/furniture-shop/backend
pm2 start dist/index.js --name furniture-backend --env production

# Save the PM2 process list (persists across reboots)
pm2 save

# Generate and install the startup script
pm2 startup
# PM2 will output a command — copy and run it. Example:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

# Verify the process is running
pm2 status
pm2 logs furniture-backend --lines 50
```

Useful PM2 commands:

```bash
pm2 restart furniture-backend    # Restart
pm2 reload furniture-backend     # Zero-downtime reload
pm2 stop furniture-backend       # Stop
pm2 delete furniture-backend     # Remove from PM2 list
pm2 monit                        # Live dashboard
pm2 logs furniture-backend       # Stream logs
pm2 logs furniture-backend --lines 100   # Last 100 lines
```

### 3.9 Frontend Build

```bash
cd /opt/furniture-shop/frontend

# Install dependencies
npm ci

# Production build
npm run build:prod
# Output goes to: dist/furniture-shop/browser/

# Copy static files to Nginx web root
mkdir -p /var/www/furniture-shop
cp -r dist/furniture-shop/browser/* /var/www/furniture-shop/
chown -R www-data:www-data /var/www/furniture-shop
```

### 3.10 Nginx Configuration (Bare Metal)

Create the Nginx virtual host configuration:

```bash
nano /etc/nginx/sites-available/furniture-shop
```

Paste the following (replace `yourdomain.com`):

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Angular SPA static files
    root /var/www/furniture-shop;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript;
    gzip_min_length 1024;

    # Cache static assets aggressively (Angular uses content hashes)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site and test:

```bash
ln -s /etc/nginx/sites-available/furniture-shop /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 3.11 Firewall Setup (UFW)

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable the firewall
ufw enable

# Verify rules
ufw status verbose
```

Expected output:

```
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

---

## 4. Option B: Docker Deployment

This is the **recommended production deployment method**. The CI/CD pipeline uses this approach. All commands run on the VPS as root or a user in the `docker` group.

### 4.1 Install Docker on Debian/Ubuntu

```bash
# Update package index
apt update

# Install prerequisites
apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker APT repository (Ubuntu 22.04)
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose plugin
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl enable docker
systemctl start docker

# Verify installation
docker --version          # Docker version 25.x.x or newer
docker compose version    # Docker Compose version v2.x.x
```

For **Debian 12**, replace `ubuntu` with `debian` in the repository URL:

```bash
curl -fsSL https://download.docker.com/linux/debian/gpg | \
  gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Optionally allow a non-root user to run Docker:

```bash
usermod -aG docker $USER
# Log out and back in for the change to take effect
```

### 4.2 Clone the Repository

```bash
mkdir -p /opt/furniture-shop
git clone https://github.com/ndlong75/furniture-shop.git /opt/furniture-shop
cd /opt/furniture-shop
```

### 4.3 Environment Variables Setup

Docker Compose production uses a `.env` file in the same directory as `docker-compose.prod.yml`. Create it:

```bash
cd /opt/furniture-shop
nano .env
```

Populate with production values:

```bash
# PostgreSQL
POSTGRES_DB=furnituredb
POSTGRES_USER=furnitureuser
POSTGRES_PASSWORD=StrongPassword123!

# JWT
JWT_SECRET=replace-with-64-char-random-hex-string

# Application
FRONTEND_URL=https://yourdomain.com
```

Generate a strong JWT secret:

```bash
openssl rand -hex 64
```

Set strict permissions on the `.env` file:

```bash
chmod 600 /opt/furniture-shop/.env
chown root:root /opt/furniture-shop/.env
```

**Never commit `.env` to Git.** It is already in `.gitignore`.

### 4.4 Log In to GitHub Container Registry (GHCR)

The production Docker images are hosted on GHCR. To pull them:

```bash
# Log in using a GitHub Personal Access Token (PAT) with read:packages scope
echo "<YOUR_GITHUB_PAT>" | docker login ghcr.io -u <github-username> --password-stdin
```

For automated CI/CD via GitHub Actions, the `GITHUB_TOKEN` secret is used automatically.

### 4.5 Pull Images and Start Services

```bash
cd /opt/furniture-shop

# Pull the latest images from GHCR
docker pull ghcr.io/ndlong75/furniture-shop/backend:latest
docker pull ghcr.io/ndlong75/furniture-shop/frontend:latest

# Start all services in detached mode
docker compose -f docker-compose.prod.yml up -d

# Verify all containers are running
docker compose -f docker-compose.prod.yml ps
```

Expected output:

```
NAME           IMAGE                                             STATUS
fs_postgres    postgres:16-alpine                                Up (healthy)
fs_backend     ghcr.io/ndlong75/furniture-shop/backend:latest   Up
fs_nginx       ghcr.io/ndlong75/furniture-shop/frontend:latest  Up
```

### 4.6 Run Database Migrations and Seed

This step only needs to be done once on initial setup, or when new migrations are added:

```bash
cd /opt/furniture-shop

# Run SQL migrations (creates tables)
docker compose -f docker-compose.prod.yml exec -T backend node dist/utils/migrate.js

# Seed initial data (categories, 12 products, admin user)
docker compose -f docker-compose.prod.yml exec -T backend node dist/utils/seed.js
```

After seeding, the admin account is available:

- **Email**: `admin@furnitureshop.vn`
- **Password**: `Admin@123`

**Change the admin password immediately after first login.**

### 4.7 Verify All Containers Are Running

```bash
# List running containers
docker ps

# Check health status
docker compose -f docker-compose.prod.yml ps

# Test the API health endpoint
curl -s http://localhost/api/health
# Expected: {"status":"ok"} or similar

# Check backend logs for errors
docker compose -f docker-compose.prod.yml logs --tail=50 backend

# Check Nginx logs
docker compose -f docker-compose.prod.yml logs --tail=50 nginx
```

### 4.8 Firewall Setup (Docker)

UFW rules remain the same whether using Docker or bare metal:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

> **Note**: Docker manages its own iptables rules and bypasses UFW for published ports. If you need UFW to strictly control Docker-published ports, additional configuration is required (see the `ufw-docker` project). For this deployment, the recommended approach is to only publish ports 80 and 443 in the compose file (as configured), and never publish 3000 or 5432 externally.

---

## 5. SSL / HTTPS Setup

HTTPS is required for production. FurnitureShop uses Let's Encrypt via Certbot. Complete this step before starting Nginx if using bare metal, or before updating `nginx.prod.conf` if using Docker.

### 5.1 Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain the SSL Certificate

**Stop Nginx before running Certbot in standalone mode** (it needs port 80):

```bash
# If using bare metal Nginx:
systemctl stop nginx

# If using Docker:
docker compose -f docker-compose.prod.yml stop nginx
```

Run Certbot:

```bash
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com \
  --agree-tos --no-eff-email \
  --email admin@yourdomain.com
```

After success, certificates are stored at:

```
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 5.3 Update Nginx Configuration with Your Domain

Edit `/opt/furniture-shop/nginx/nginx.prod.conf`:

```bash
nano /opt/furniture-shop/nginx/nginx.prod.conf
```

Replace all occurrences of `yourdomain.com` with your actual domain:

```nginx
server_name yourdomain.com www.yourdomain.com;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

Restart Nginx:

```bash
# Bare metal:
systemctl start nginx

# Docker:
docker compose -f docker-compose.prod.yml up -d nginx
```

Verify HTTPS is working:

```bash
curl -I https://yourdomain.com/api/health
# Expected: HTTP/2 200
```

### 5.4 SSL Certificate Auto-Renewal

Let's Encrypt certificates expire after 90 days. Certbot installs a systemd timer automatically. Verify it:

```bash
systemctl status certbot.timer
systemctl list-timers | grep certbot
```

Test the renewal process (dry run — does not actually renew):

```bash
certbot renew --dry-run
```

If using Docker, after renewal Nginx must reload to pick up the new certificate. Add a post-renewal hook:

```bash
mkdir -p /etc/letsencrypt/renewal-hooks/post/
nano /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

For bare metal:

```bash
#!/bin/bash
systemctl reload nginx
```

For Docker:

```bash
#!/bin/bash
cd /opt/furniture-shop
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Make it executable:

```bash
chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

To manually renew at any time:

```bash
certbot renew
```

---

## 6. GitHub Actions CI/CD

### 6.1 Pipeline Overview

The CI/CD pipeline is defined in `.github/workflows/deploy.yml`. It is triggered automatically on every push to the `main` branch and can also be triggered manually.

**Pipeline stages:**

```
push to main
     |
     v
[1] test          -- Backend Jest tests against a temporary PostgreSQL container
     |
     v
[2] build-and-push -- Build backend and frontend Docker images, push to GHCR
     |
     v
[3] deploy        -- SCP compose files to VPS, SSH in, pull images, restart services, migrate, health check
```

### 6.2 Required GitHub Secrets

Navigate to **GitHub → Repository → Settings → Secrets and variables → Actions** and add all of the following:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VPS_HOST` | Public IP address or hostname of the VPS | `203.0.113.42` or `vps.yourdomain.com` |
| `VPS_USER` | SSH username on the VPS | `root` or `ubuntu` |
| `VPS_SSH_KEY` | Private SSH key (RSA/Ed25519) for VPS access. The corresponding public key must be in `~/.ssh/authorized_keys` on the VPS. Paste the entire private key including header/footer. | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `POSTGRES_DB` | PostgreSQL database name | `furnituredb` |
| `POSTGRES_USER` | PostgreSQL username | `furnitureuser` |
| `POSTGRES_PASSWORD` | PostgreSQL password — use a strong password | `StrongP@ssword123!` |
| `JWT_SECRET` | Secret key for signing JWT tokens — minimum 64 characters, random | `a3f8b2...` (64+ hex chars) |
| `FRONTEND_URL` | Full HTTPS URL of the frontend application | `https://yourdomain.com` |

### 6.3 Setting Up SSH Key for Deployment

Generate a dedicated deployment SSH key pair (do this on your local machine):

```bash
ssh-keygen -t ed25519 -C "furniture-shop-deploy" -f ~/.ssh/furniture_deploy
# Do not set a passphrase (leave empty) — GitHub Actions cannot enter a passphrase
```

Copy the public key to the VPS:

```bash
ssh-copy-id -i ~/.ssh/furniture_deploy.pub root@<VPS_IP>
# Or manually append to /root/.ssh/authorized_keys on the VPS
```

Add the **private key** content as the `VPS_SSH_KEY` GitHub secret:

```bash
cat ~/.ssh/furniture_deploy
# Copy the entire output including -----BEGIN OPENSSH PRIVATE KEY----- and -----END OPENSSH PRIVATE KEY-----
```

### 6.4 Manual Pipeline Trigger

To redeploy without a code push:

1. Go to **GitHub → Repository → Actions**
2. Select **"Build & Deploy to VPS"** workflow
3. Click **"Run workflow"**
4. Select branch `main`
5. Click **"Run workflow"** button

Or via GitHub CLI:

```bash
gh workflow run deploy.yml --ref main
```

### 6.5 Viewing Pipeline Logs

In the GitHub web UI:

1. Go to **Actions** tab
2. Click the workflow run
3. Click any job (test, build-and-push, deploy) to expand steps
4. Each step shows stdout/stderr in real time

Via GitHub CLI:

```bash
# List recent workflow runs
gh run list --workflow=deploy.yml

# Watch a specific run
gh run watch <run-id>

# View logs
gh run view <run-id> --log
```

### 6.6 How the Deploy Step Works

The deploy job:

1. Uses `appleboy/scp-action` to copy `docker-compose.prod.yml` and the `nginx/` directory to `/opt/furniture-shop` on the VPS via SCP.
2. Uses `appleboy/ssh-action` to SSH into the VPS and execute:
   ```bash
   cd /opt/furniture-shop
   docker pull ghcr.io/ndlong75/furniture-shop/backend:latest
   docker pull ghcr.io/ndlong75/furniture-shop/frontend:latest
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   docker compose -f docker-compose.prod.yml exec -T backend node dist/utils/migrate.js
   sleep 5
   curl -f http://localhost/api/health
   ```
3. If the health check fails, the pipeline exits with a non-zero code and GitHub marks the deployment as failed.

The `.env` file is **not** copied by CI/CD — it must already exist on the VPS. Environment variables are injected at runtime from the `.env` file Docker Compose reads.

---

## 7. Update / Redeploy Procedure

### 7.1 Automatic (via GitHub Actions)

Simply push to the `main` branch:

```bash
git add .
git commit -m "feat: update product listing pagination"
git push origin main
```

GitHub Actions handles everything: test → build → push images → deploy → migrate → health check.

### 7.2 Manual Update (Docker)

Use this procedure when you need to redeploy without going through GitHub Actions, or to apply configuration changes:

```bash
cd /opt/furniture-shop

# Pull the latest code (for compose file changes, nginx config, etc.)
git pull origin main

# Pull the latest Docker images
docker pull ghcr.io/ndlong75/furniture-shop/backend:latest
docker pull ghcr.io/ndlong75/furniture-shop/frontend:latest

# Recreate containers with the new images
# --remove-orphans removes containers for services no longer defined
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Run migrations (safe to run repeatedly — migrations are idempotent)
docker compose -f docker-compose.prod.yml exec -T backend node dist/utils/migrate.js

# Verify health
curl -s http://localhost/api/health
docker compose -f docker-compose.prod.yml ps
```

### 7.3 Manual Update (Bare Metal with PM2)

```bash
cd /opt/furniture-shop

# Pull latest code
git pull origin main

# Update backend
cd backend
npm ci
npm run build
npm ci --omit=dev  # Strip dev dependencies

# Run migrations
npm run migrate

# Zero-downtime reload with PM2
pm2 reload furniture-backend
# 'reload' sends SIGINT, waits for in-flight requests to complete, then starts new process
# Unlike 'restart' which is an immediate kill

# Update frontend static files
cd ../frontend
npm ci
npm run build:prod
cp -r dist/furniture-shop/browser/* /var/www/furniture-shop/

# Reload Nginx to pick up any config changes
nginx -t && systemctl reload nginx

# Verify
pm2 status
curl -s https://yourdomain.com/api/health
```

### 7.4 Rolling Back to a Previous Version (Docker)

Each deployment pushes images tagged with both `latest` and the Git commit SHA. To roll back:

```bash
# Find the commit SHA of the version you want
git log --oneline -10

# Pull the specific version
docker pull ghcr.io/ndlong75/furniture-shop/backend:<commit-sha>
docker pull ghcr.io/ndlong75/furniture-shop/frontend:<commit-sha>

# Update the compose file to use the specific tag temporarily
# Then restart
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

Or edit `docker-compose.prod.yml` temporarily to pin a specific image tag:

```yaml
backend:
  image: ghcr.io/ndlong75/furniture-shop/backend:abc1234  # specific commit SHA
```

---

## 8. Operations & Monitoring

### 8.1 Health Check

The application exposes a health endpoint at `/api/health`:

```bash
# Quick health check (Docker)
curl -s http://localhost/api/health

# Over HTTPS
curl -s https://yourdomain.com/api/health

# Full verbose check
curl -sv https://yourdomain.com/api/health 2>&1 | grep -E "(HTTP|health|status)"
```

Check all containers are healthy:

```bash
docker compose -f docker-compose.prod.yml ps
# All services should show "Up" status
# PostgreSQL should show "Up (healthy)" indicating healthcheck passed
```

### 8.2 Viewing Logs

**Docker logs:**

```bash
cd /opt/furniture-shop

# Follow all logs from all services
docker compose -f docker-compose.prod.yml logs -f

# Follow specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f postgres

# Show last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Filter logs with grep
docker compose -f docker-compose.prod.yml logs backend 2>&1 | grep "ERROR"
```

**PM2 logs (bare metal):**

```bash
# Stream live logs
pm2 logs furniture-backend

# Show last N lines
pm2 logs furniture-backend --lines 100

# Log files are stored at:
ls -la ~/.pm2/logs/
# furniture-backend-out.log  — stdout
# furniture-backend-error.log — stderr
```

**Nginx access and error logs:**

```bash
# Docker — Nginx logs go to stdout/stderr (captured by Docker)
docker compose -f docker-compose.prod.yml logs nginx

# Bare metal — Nginx log files
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Filter for HTTP errors
grep " 5[0-9][0-9] " /var/log/nginx/access.log
grep " 4[0-9][0-9] " /var/log/nginx/access.log | grep -v " 404 "
```

**PostgreSQL logs:**

```bash
# Docker
docker compose -f docker-compose.prod.yml logs postgres

# Bare metal — PostgreSQL log files
tail -f /var/log/postgresql/postgresql-16-main.log

# Connect to PostgreSQL and check activity
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U furnitureuser -d furnituredb -c "SELECT * FROM pg_stat_activity;"
```

### 8.3 Common Nginx Commands

```bash
# Test configuration syntax
nginx -t

# Reload configuration without dropping connections
systemctl reload nginx      # bare metal
# Docker: Nginx reloads when the container restarts

# Restart Nginx completely
systemctl restart nginx     # bare metal
docker compose -f docker-compose.prod.yml restart nginx  # Docker

# Check Nginx status
systemctl status nginx      # bare metal
docker ps | grep fs_nginx   # Docker

# View current Nginx configuration
nginx -T                    # dumps entire merged config
```

### 8.4 Database Backup Procedure

**Manual backup:**

```bash
# Docker
docker exec fs_postgres pg_dump \
  -U furnitureuser \
  -d furnituredb \
  --no-password \
  -F c \                    # custom format (compressed)
  -f /tmp/backup_$(date +%Y%m%d_%H%M%S).dump

# Copy the dump file out of the container
docker cp fs_postgres:/tmp/backup_$(date +%Y%m%d).dump \
  /opt/backups/furnituredb_$(date +%Y%m%d).dump
```

**Simplified one-liner:**

```bash
mkdir -p /opt/backups
docker exec fs_postgres pg_dump -U furnitureuser furnituredb \
  | gzip > /opt/backups/furnituredb_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Bare metal backup:**

```bash
mkdir -p /opt/backups
PGPASSWORD=StrongPassword123! pg_dump \
  -U furnitureuser \
  -h localhost \
  -d furnituredb \
  | gzip > /opt/backups/furnituredb_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Automated daily backup via cron:**

```bash
crontab -e
```

Add the following line to run a backup every day at 2:00 AM:

```
0 2 * * * docker exec fs_postgres pg_dump -U furnitureuser furnituredb | gzip > /opt/backups/furnituredb_$(date +\%Y\%m\%d).sql.gz 2>> /var/log/pg-backup.log
```

**Backup retention — delete backups older than 30 days:**

```bash
# Add to crontab alongside the backup job
0 3 * * * find /opt/backups -name "*.sql.gz" -mtime +30 -delete
```

**Restore from backup:**

```bash
# Docker
gunzip -c /opt/backups/furnituredb_20260305.sql.gz | \
  docker exec -i fs_postgres psql -U furnitureuser -d furnituredb

# Bare metal
gunzip -c /opt/backups/furnituredb_20260305.sql.gz | \
  PGPASSWORD=StrongPassword123! psql -U furnitureuser -h localhost -d furnituredb
```

### 8.5 Resource Monitoring

```bash
# CPU and RAM usage
docker stats --no-stream

# Disk usage
df -h
du -sh /var/lib/docker/volumes/   # Docker volumes
du -sh /opt/backups/               # Backup directory

# System resources
top
htop  # (install: apt install htop)

# Docker volume size (PostgreSQL data)
docker system df -v
```

---

## 9. Troubleshooting

### Issue 1: SSL Certificate Error — "Certificate not yet valid" or "Certificate expired"

**Symptoms**: Browser shows SSL error; `curl` returns `SSL certificate problem`.

**Diagnosis:**

```bash
# Check certificate expiry
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null \
  | openssl x509 -noout -dates

# Check Certbot status
certbot certificates
systemctl status certbot.timer
```

**Solution:**

```bash
# Force renewal
certbot renew --force-renewal

# Reload Nginx after renewal
systemctl reload nginx  # bare metal
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload  # Docker
```

---

### Issue 2: Port 80 or 443 Already in Use

**Symptoms**: Nginx or Docker fails to start; error: `bind() to 0.0.0.0:80 failed (98: Address already in use)`.

**Diagnosis:**

```bash
# Find what is using the port
ss -tlnp | grep ':80'
ss -tlnp | grep ':443'
lsof -i :80
lsof -i :443
```

**Solution:**

```bash
# Stop the conflicting service (e.g., Apache)
systemctl stop apache2
systemctl disable apache2

# Or kill the process using the port
kill -9 <PID>

# Then restart Nginx
systemctl start nginx
```

---

### Issue 3: PostgreSQL Authentication Failure

**Symptoms**: Backend logs show `password authentication failed for user "furnitureuser"` or `FATAL: role "furnitureuser" does not exist`.

**Diagnosis:**

```bash
# Docker: check env vars are loaded from .env
docker compose -f docker-compose.prod.yml exec postgres env | grep POSTGRES

# Bare metal: test connection directly
psql -U furnitureuser -h localhost -d furnituredb
```

**Solution:**

```bash
# If the user does not exist, recreate it
sudo -u postgres psql
CREATE USER furnitureuser WITH PASSWORD 'StrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE furnituredb TO furnitureuser;
\q

# Verify the DATABASE_URL in .env matches the actual credentials
cat /opt/furniture-shop/.env | grep DATABASE_URL

# Docker: recreate the postgres container to re-apply env vars
docker compose -f docker-compose.prod.yml down postgres
docker compose -f docker-compose.prod.yml up -d postgres
```

---

### Issue 4: Backend Container Keeps Restarting

**Symptoms**: `docker ps` shows `fs_backend` with status `Restarting (1)`.

**Diagnosis:**

```bash
# View the error causing the restart
docker logs fs_backend --tail=50

# Common causes in the logs:
# "Cannot connect to database" → PostgreSQL not ready or wrong credentials
# "EADDRINUSE" → port 3000 conflict (unlikely in Docker)
# "MODULE_NOT_FOUND" → build artifact missing
```

**Solution:**

```bash
# Wait for PostgreSQL to be healthy first
docker compose -f docker-compose.prod.yml ps postgres
# Should show: Up (healthy)

# If postgres healthcheck is failing, check its logs
docker logs fs_postgres --tail=50

# Force restart in correct order
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d postgres
# Wait for postgres to be healthy
sleep 15
docker compose -f docker-compose.prod.yml up -d backend nginx
```

---

### Issue 5: Out of Memory — OOM Killer Terminates Container

**Symptoms**: Container exits unexpectedly; `dmesg | grep -i oom` shows kill events; `docker inspect fs_backend` shows `OOMKilled: true`.

**Diagnosis:**

```bash
dmesg | grep -i "out of memory"
docker inspect fs_backend | grep -A5 OOMKilled
free -m
```

**Solution:**

```bash
# Short-term: add swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verify swap
free -m

# Long-term: upgrade VPS RAM, or optimize the Node.js heap size
# Add to docker-compose.prod.yml backend service:
# environment:
#   NODE_OPTIONS: "--max-old-space-size=512"
```

---

### Issue 6: 502 Bad Gateway from Nginx

**Symptoms**: Browser shows "502 Bad Gateway"; Nginx error log shows `connect() failed (111: Connection refused) while connecting to upstream`.

**Diagnosis:**

```bash
# Is the backend running?
docker ps | grep fs_backend
curl http://localhost:3000/api/health  # test direct backend access

# Check Nginx upstream config
docker exec fs_nginx cat /etc/nginx/conf.d/default.conf | grep proxy_pass
```

**Solution:**

```bash
# Restart the backend
docker compose -f docker-compose.prod.yml restart backend

# Check backend logs for startup errors
docker logs fs_backend --tail=100

# Verify Docker network — nginx must be able to reach backend by hostname
docker network ls
docker network inspect furniture-shop_internal

# Test DNS resolution inside nginx container
docker exec fs_nginx ping -c 3 backend
```

---

### Issue 7: Angular SPA Routes Return 404

**Symptoms**: Direct URL access to `/products`, `/cart`, etc. returns Nginx 404 instead of the Angular app.

**Diagnosis:**

```bash
curl -I https://yourdomain.com/products
# Should return 200, not 404
```

**Solution:**

The Nginx `location /` block must include `try_files $uri $uri/ /index.html;`. Verify it is present:

```bash
grep -A3 "location /" /opt/furniture-shop/nginx/nginx.prod.conf
```

If missing, add it and reload Nginx:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

### Issue 8: CI/CD Pipeline Fails at SSH Step

**Symptoms**: GitHub Actions deploy job fails with `ssh: connect to host ... port 22: Connection timed out` or `Permission denied (publickey)`.

**Diagnosis:**

```bash
# Test SSH from your local machine
ssh -i ~/.ssh/furniture_deploy root@<VPS_IP> "echo OK"

# Check the authorized_keys on the VPS
cat /root/.ssh/authorized_keys
```

**Solution:**

```bash
# Ensure the public key is in authorized_keys
cat ~/.ssh/furniture_deploy.pub >> /root/.ssh/authorized_keys

# Set correct permissions on VPS
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys

# Ensure SSH service allows key authentication
grep "PubkeyAuthentication" /etc/ssh/sshd_config
# Should show: PubkeyAuthentication yes

# Ensure port 22 is open in firewall
ufw status
```

In GitHub Secrets, verify `VPS_SSH_KEY` contains the entire **private** key (not the public key), including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines.

---

### Issue 9: Docker Disk Space Full

**Symptoms**: `docker: write /var/lib/docker/...` errors; deployments fail; `df -h` shows `/` at 100%.

**Diagnosis:**

```bash
df -h /
docker system df
du -sh /var/lib/docker/
```

**Solution:**

```bash
# Remove unused images, containers, networks, and build cache
docker system prune -af

# Remove unused volumes (CAUTION: do not run this if postgres volume is unused-looking)
docker volume prune
# Better: only remove specific unused volumes, NOT postgres_data

# Remove old build cache only
docker builder prune -af

# Check for large log files
find /var/lib/docker/containers -name "*.log" -size +100M

# Limit Docker log size permanently
nano /etc/docker/daemon.json
```

Add to `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

```bash
systemctl restart docker
```

---

### Issue 10: Database Migrations Fail on Deploy

**Symptoms**: CI/CD pipeline fails at the migrations step; `docker compose exec backend node dist/utils/migrate.js` exits with an error.

**Diagnosis:**

```bash
# Run migration manually to see the error
docker compose -f docker-compose.prod.yml exec backend node dist/utils/migrate.js

# Check PostgreSQL is healthy
docker compose -f docker-compose.prod.yml ps postgres

# Inspect migration SQL
cat /opt/furniture-shop/database/migrations/001_init.sql
```

**Common causes and fixes:**

```bash
# Cause 1: PostgreSQL not ready yet
# Solution: wait for healthy status before migrating
docker compose -f docker-compose.prod.yml ps postgres
# Wait until status is "Up (healthy)" before running migrate

# Cause 2: Permission denied on tables
sudo -u postgres psql -d furnituredb -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO furnitureuser;"
sudo -u postgres psql -d furnituredb -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO furnitureuser;"

# Cause 3: Migration already applied (tables exist)
# This is expected — migrations should be idempotent using IF NOT EXISTS
# Review the migration script if it lacks IF NOT EXISTS guards

# Cause 4: Wrong DATABASE_URL in .env
cat /opt/furniture-shop/.env | grep DATABASE_URL
docker exec fs_backend env | grep DATABASE_URL
```

---

### Issue 11: JWT Token Errors — "invalid signature" or "jwt malformed"

**Symptoms**: Users get logged out unexpectedly; API returns 401 for valid-looking tokens; frontend shows authentication errors.

**Cause**: The `JWT_SECRET` in the running application does not match the secret used to sign the tokens (common after rotating the secret or misconfiguring the `.env`).

**Solution:**

```bash
# Verify the current JWT_SECRET
docker exec fs_backend env | grep JWT_SECRET

# Compare with .env file
cat /opt/furniture-shop/.env | grep JWT_SECRET

# If they differ, restart the backend to reload .env
docker compose -f docker-compose.prod.yml restart backend

# If you intentionally rotated the JWT_SECRET:
# All existing tokens are immediately invalidated — users must log in again
# This is expected behavior
```

---

### Issue 12: Slow API Response Times

**Symptoms**: API responses take > 2 seconds; database queries are slow.

**Diagnosis:**

```bash
# Check database connection pool
docker exec fs_backend env | grep DATABASE_URL

# Monitor PostgreSQL active queries
docker exec fs_postgres psql -U furnitureuser -d furnituredb -c \
  "SELECT pid, query_start, state, query FROM pg_stat_activity WHERE state != 'idle';"

# Check for missing indexes (slow sequential scans)
docker exec fs_postgres psql -U furnitureuser -d furnituredb -c \
  "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE tablename IN ('products','orders','cart_items') ORDER BY n_distinct;"

# Check system load
uptime
docker stats --no-stream
```

**Solution:**

```bash
# Add indexes if missing (connect to PostgreSQL)
docker exec -it fs_postgres psql -U furnitureuser -d furnituredb

-- Example: index on products for category filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);
\q
```

---

## Appendix A: Quick Reference Commands

### Docker Compose (Production)

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# Restart a single service
docker compose -f docker-compose.prod.yml restart backend

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Execute command in container
docker compose -f docker-compose.prod.yml exec backend sh

# View resource usage
docker stats
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it fs_postgres psql -U furnitureuser -d furnituredb

# Backup
docker exec fs_postgres pg_dump -U furnitureuser furnituredb | gzip > backup.sql.gz

# Restore
gunzip -c backup.sql.gz | docker exec -i fs_postgres psql -U furnitureuser -d furnituredb

# Run migrations
docker compose -f docker-compose.prod.yml exec backend node dist/utils/migrate.js
```

### SSL

```bash
# Check expiry
certbot certificates

# Force renew
certbot renew --force-renewal

# Dry run
certbot renew --dry-run
```

### System

```bash
# Disk space
df -h && docker system df

# Memory
free -m

# CPU load
uptime && top -bn1 | head -20

# Firewall
ufw status verbose
```

---

## Appendix B: Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Application mode | `production` |
| `PORT` | Yes | Backend HTTP port | `3000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Yes | JWT signing secret (min 64 chars) | `a3f8b2c9...` |
| `JWT_EXPIRES_IN` | No | JWT token lifetime | `7d` |
| `FRONTEND_URL` | Yes | CORS allowed origin | `https://yourdomain.com` |
| `POSTGRES_DB` | Yes (Docker) | PostgreSQL database name | `furnituredb` |
| `POSTGRES_USER` | Yes (Docker) | PostgreSQL username | `furnitureuser` |
| `POSTGRES_PASSWORD` | Yes (Docker) | PostgreSQL password | `StrongPass!` |

---

*End of FurnitureShop Deployment & Operations Guide*
