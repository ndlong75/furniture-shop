# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**FurnitureShop** — An e-commerce platform for selling furniture, built with Angular + Node.js/Express + PostgreSQL. Deployed via Docker Compose on a VPS.

- **GitHub**: github.com/ndlong75/furniture-shop
- **Language**: Vietnamese (UI text, comments, documentation)

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 17 (standalone components, signals) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 |
| Deployment | Docker Compose + Nginx (reverse proxy) |
| CI/CD | GitHub Actions → VPS via SSH |

## Development Commands

### Local dev (Docker)
```bash
# Start everything (postgres + backend + frontend)
docker compose up

# First time: run migrations and seed data
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

### Backend (run locally without Docker)
```bash
cd backend
cp .env.example .env        # then edit DATABASE_URL, JWT_SECRET
npm install
npm run dev                 # nodemon + ts-node on port 3000
npm test                    # Jest
npm run build               # compile TypeScript to dist/
npm run migrate             # run SQL migrations from database/migrations/
npm run seed                # seed categories, products, admin user
```

### Frontend
```bash
cd frontend
npm install
npm start                   # ng serve on port 4200
npm test                    # Karma + Jasmine
npm run build:prod          # production build to dist/furniture-shop/browser/
```

## Architecture

```
FurnitureShop/
├── .claude/agents/         ← SDLC agent definitions (PM, BA, QA, DevOps, Customer)
├── .github/workflows/      ← CI/CD: test → build Docker images → deploy to VPS
├── backend/
│   ├── src/
│   │   ├── config/db.ts    ← PostgreSQL pool (pg library)
│   │   ├── middleware/auth.ts  ← JWT authenticate + requireAdmin guards
│   │   ├── controllers/    ← authController, productController, cartController, orderController
│   │   ├── routes/         ← auth, products, cart, orders, admin (index.ts assembles all)
│   │   └── utils/          ← migrate.ts, seed.ts
│   └── Dockerfile
├── database/
│   ├── migrations/001_init.sql  ← Full schema: users, categories, products, cart_items, orders, order_items
│   └── seeds/              ← categories, 12 sample products, admin user
├── frontend/
│   └── src/app/
│       ├── models/         ← TypeScript interfaces: Product, User, Cart, Order
│       ├── services/       ← auth.service, product.service, cart.service, order.service
│       ├── guards/         ← authGuard, adminGuard (route protection)
│       ├── interceptors/   ← authInterceptor (adds Bearer token to all requests)
│       ├── components/     ← navbar, footer, product-card (shared)
│       └── pages/          ← home, products, product-detail, cart, checkout, orders, auth/login, auth/register, admin
├── nginx/nginx.prod.conf   ← Production Nginx: SSL, SPA routing, /api proxy to backend
├── docker-compose.yml      ← Local dev
└── docker-compose.prod.yml ← Production (uses GHCR images)
```

## Key Design Patterns

**Backend**: Controller → Route → Express. No ORM — raw `pg` pool with parameterized queries. Transactions used in `createOrder` (decrement stock + clear cart atomically).

**Frontend**: Angular standalone components with `signal()` for reactive state (AuthService.currentUser, CartService.cart, CartService.itemCount). Lazy-loaded routes. HTTP requests go through `authInterceptor` which reads JWT from localStorage.

**Auth flow**: JWT stored in localStorage. Token payload decoded on app init to restore session. `authenticate` middleware on protected routes. `requireAdmin` middleware stacked for admin routes.

**Cart**: Server-side cart in `cart_items` table. `ON CONFLICT (user_id, product_id) DO UPDATE` for upsert on add.

**Order**: Full transaction — creates order, inserts order_items (price snapshot), decrements stock, clears cart.

## SDLC Agents

Custom agents live in `.claude/agents/`. Invoke by name in Claude Code:

| Agent | Purpose |
| --- | --- |
| `pm` | Sprint planning, user stories, prioritization |
| `ba` | Requirements, API contracts, data models, acceptance criteria |
| `qa` | Test cases, edge cases, bug reports, test strategy |
| `devops` | Docker, Nginx, CI/CD, VPS operations, SSL |
| `customer` | End-user feedback, UX review, Vietnamese customer perspective |

## API Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | /api/auth/register | — | Register |
| POST | /api/auth/login | — | Login → JWT |
| GET | /api/auth/me | JWT | Current user |
| GET | /api/products | — | List (filter: category, search, minPrice, maxPrice, page, limit) |
| GET | /api/products/categories | — | All categories |
| GET | /api/products/:slug | — | Product detail |
| GET | /api/cart | JWT | User's cart |
| POST | /api/cart | JWT | Add item |
| PUT | /api/cart/:itemId | JWT | Update quantity |
| DELETE | /api/cart/:itemId | JWT | Remove item |
| POST | /api/orders | JWT | Create order from cart |
| GET | /api/orders | JWT | User's orders |
| POST | /api/admin/products | Admin | Create product |
| PUT | /api/admin/products/:id | Admin | Update product |
| DELETE | /api/admin/products/:id | Admin | Soft delete |
| GET | /api/admin/orders | Admin | All orders |
| PUT | /api/admin/orders/:id/status | Admin | Update order status |
| GET | /api/health | — | Health check |

## Deployment

### GitHub Secrets required
```
VPS_HOST, VPS_USER, VPS_SSH_KEY
POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
JWT_SECRET
FRONTEND_URL
```

### First-time VPS setup
```bash
# On VPS (Ubuntu 22.04)
apt update && apt install -y docker.io docker-compose-plugin
systemctl enable docker
mkdir -p /opt/furniture-shop
git clone https://github.com/ndlong75/furniture-shop.git /opt/furniture-shop

# SSL
apt install -y certbot python3-certbot-nginx
certbot certonly --standalone -d yourdomain.com

# Update nginx/nginx.prod.conf with your domain, then:
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend node dist/utils/migrate.js
docker compose -f docker-compose.prod.yml exec backend node dist/utils/seed.js
```

### Admin credentials (after seed)
- Email: `admin@furnitureshop.vn`
- Password: `Admin@123`

### Deploy (after setup)
Push to `main` branch — GitHub Actions handles the rest automatically.
