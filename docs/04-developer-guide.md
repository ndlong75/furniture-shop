# FurnitureShop — Developer Guide

> Tài liệu dành cho lập trình viên. Ngôn ngữ giao diện và bình luận code sử dụng tiếng Việt.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Setup (Step by Step)](#2-local-setup-step-by-step)
3. [Project Structure](#3-project-structure)
4. [Development Workflow](#4-development-workflow)
5. [Code Conventions](#5-code-conventions)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Database Operations](#7-database-operations)
8. [Testing](#8-testing)
9. [Common Issues & Solutions](#9-common-issues--solutions)
10. [SDLC Agents Reference](#10-sdlc-agents-reference)

---

## 1. Prerequisites

Install the following tools before starting development.

### Required Software

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Node.js | 20.x LTS | Backend runtime + Angular CLI |
| npm | 10.x | Package manager (bundled with Node.js 20) |
| PostgreSQL | 16.x | Primary database (local dev without Docker) |
| Git | 2.40+ | Version control |
| Docker + Docker Compose | 24.x / 2.x | Optional: run the full stack in containers |

### Verify your environment

```bash
node --version    # v20.x.x
npm --version     # 10.x.x
psql --version    # psql (PostgreSQL) 16.x
git --version     # git version 2.x
docker --version  # Docker version 24.x  (optional)
```

### Recommended IDE Extensions (VS Code)

- **Angular Language Service** — template type-checking and autocomplete
- **ESLint** — linting
- **Prettier** — code formatting
- **Thunder Client** or **REST Client** — API testing without leaving VS Code
- **PostgreSQL** (by Chris Kolkman) — query the database from the sidebar

---

## 2. Local Setup (Step by Step)

There are two setup paths: **manual** (backend + frontend run separately) and **Docker** (everything in containers). Choose whichever suits your workflow.

---

### 2A. Manual Setup (Recommended for Active Development)

#### Step 1 — Clone the repository

```bash
git clone https://github.com/ndlong75/furniture-shop.git
cd furniture-shop
```

#### Step 2 — Set up the database

Make sure PostgreSQL 16 is running locally, then create the database and user:

```bash
psql -U postgres
```

```sql
CREATE DATABASE furnituredb;
CREATE USER furnitureuser WITH PASSWORD 'furniturepass';
GRANT ALL PRIVILEGES ON DATABASE furnituredb TO furnitureuser;
-- PostgreSQL 15+ requires schema privileges:
\c furnituredb
GRANT ALL ON SCHEMA public TO furnitureuser;
\q
```

#### Step 3 — Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your local values:

```ini
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://furnitureuser:furniturepass@localhost:5432/furnituredb
DATABASE_SSL=false
JWT_SECRET=my-local-dev-secret-at-least-32-chars
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:4200
SEED_ADMIN_PASSWORD=Admin@123
```

#### Step 4 — Install backend dependencies and run migrations

```bash
# From the backend/ directory
npm install

# Build TypeScript first (migrate/seed scripts require compiled output)
npm run build

# Run database migrations
npm run migrate

# Seed sample data (categories, 12 products, admin user)
npm run seed
```

Expected output from migrate:

```
Running migration: 001_init.sql
  Done: 001_init.sql
All migrations complete
```

Expected output from seed:

```
Seeding categories...
Seeding products...
Seeding admin user...
Seed complete
```

#### Step 5 — Start the backend

```bash
npm run dev
# Backend running on http://localhost:3000
```

Verify it is healthy:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"2026-03-05T..."}
```

#### Step 6 — Set up and start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
# Angular dev server running on http://localhost:4200
```

#### Step 7 — Verify the full stack

1. Open `http://localhost:4200` — the homepage should load products.
2. Login with admin credentials:
   - Email: `admin@furnitureshop.vn`
   - Password: value you set in `SEED_ADMIN_PASSWORD` (default `Admin@123`)
3. Visit `http://localhost:4200/admin` — admin panel should be accessible.
4. Test the API directly:

```bash
# Login and capture token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@furnitureshop.vn","password":"Admin@123"}' \
  | jq -r '.token')

# Use token for an authenticated request
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/auth/me
```

---

### 2B. Docker Setup (Full Stack in Containers)

Use Docker when you want a self-contained environment that mirrors production.

```bash
# From the repo root
docker compose up          # starts postgres, backend, frontend

# First time only — in a second terminal:
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

Services started by Docker Compose:

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL 16 |
| backend | 3000 | Express API |
| frontend | 4200 | Angular dev server |

To stop and remove containers:

```bash
docker compose down            # stops containers
docker compose down -v         # also removes the database volume (fresh start)
```

To rebuild after changing `package.json` or `Dockerfile`:

```bash
docker compose build --no-cache backend
docker compose up
```

---

## 3. Project Structure

### Repository Root

```
FurnitureShop/
├── .claude/
│   └── agents/              # SDLC agent definitions for Claude Code
│       ├── pm.md            # Product Manager agent
│       ├── ba.md            # Business Analyst agent
│       ├── qa.md            # QA Engineer agent
│       ├── devops.md        # DevOps agent
│       └── customer.md      # Customer perspective agent
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD: test → build → push GHCR → SSH deploy
├── backend/                 # Node.js + Express + TypeScript API
├── database/                # SQL migrations and seed files
├── docs/                    # Project documentation
├── frontend/                # Angular 17 SPA
├── nginx/
│   └── nginx.prod.conf      # Production Nginx: SSL termination, SPA, /api proxy
├── docker-compose.yml       # Local development stack
└── docker-compose.prod.yml  # Production stack (pulls GHCR images)
```

### Backend Structure

```
backend/
├── src/
│   ├── index.ts             # Express app entry: middleware, routes, error handler
│   ├── config/
│   │   ├── db.ts            # PostgreSQL Pool + query() helper with dev logging
│   │   └── env.ts           # Validated environment variable access (fail-fast)
│   ├── middleware/
│   │   └── auth.ts          # authenticate() + requireAdmin() middleware functions
│   ├── controllers/
│   │   ├── authController.ts    # register, login, getMe
│   │   ├── productController.ts # list, getBySlug, create, update, delete
│   │   ├── cartController.ts    # getCart, addItem, updateItem, removeItem
│   │   └── orderController.ts   # createOrder (transaction), getMyOrders, admin ops
│   ├── routes/
│   │   ├── index.ts         # Assembles all sub-routers under /api
│   │   ├── auth.ts          # POST /auth/register, /auth/login, GET /auth/me
│   │   ├── products.ts      # GET /products, /products/categories, /products/:slug
│   │   ├── cart.ts          # GET/POST /cart, PUT/DELETE /cart/:itemId
│   │   ├── orders.ts        # POST/GET /orders
│   │   └── admin.ts         # Admin-only: products CRUD, orders management
│   ├── models/              # TypeScript interfaces (not used at runtime — type safety only)
│   └── utils/
│       ├── migrate.ts       # Reads database/migrations/*.sql and executes in order
│       └── seed.ts          # Inserts categories, products, admin user
├── Dockerfile               # Multi-stage: build TypeScript → production image
├── .env.example             # Template for local .env
├── tsconfig.json            # TypeScript compiler options
└── package.json
```

### Frontend Structure

```
frontend/
├── src/
│   ├── main.ts              # Bootstrap Angular with app.config.ts providers
│   ├── app/
│   │   ├── app.config.ts    # provideRouter, provideHttpClient, withInterceptors
│   │   ├── app.routes.ts    # All routes with lazy-loaded components
│   │   ├── models/          # TypeScript interfaces matching API response shapes
│   │   │   ├── user.model.ts
│   │   │   ├── product.model.ts
│   │   │   ├── cart.model.ts
│   │   │   └── order.model.ts
│   │   ├── services/        # Injectable services — one per domain
│   │   │   ├── auth.service.ts      # JWT storage, currentUser signal
│   │   │   ├── product.service.ts   # Product listing and detail HTTP calls
│   │   │   ├── cart.service.ts      # cart signal, itemCount signal, CRUD
│   │   │   └── order.service.ts     # createOrder, getMyOrders
│   │   ├── guards/
│   │   │   └── auth.guard.ts        # authGuard (logged in) + adminGuard (role=admin)
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts  # Attaches Bearer token to every outbound request
│   │   ├── components/      # Shared/reusable standalone components
│   │   │   ├── navbar/
│   │   │   ├── footer/
│   │   │   └── product-card/
│   │   └── pages/           # Feature pages — each is a lazy-loaded standalone component
│   │       ├── home/
│   │       ├── products/
│   │       ├── product-detail/
│   │       ├── cart/
│   │       ├── checkout/
│   │       ├── orders/
│   │       ├── auth/
│   │       │   ├── login.component.ts
│   │       │   └── register.component.ts
│   │       └── admin/
│   └── environments/
│       ├── environment.ts           # { apiUrl: 'http://localhost:3000/api' }
│       └── environment.production.ts # { apiUrl: '/api' } (Nginx proxies /api)
└── package.json
```

---

## 4. Development Workflow

### Git Branching Strategy

```
main          ← production-ready; every push triggers CI/CD deploy
  └── feature/TICKET-short-description   ← new features
  └── fix/TICKET-short-description       ← bug fixes
  └── chore/short-description            ← maintenance, deps, docs
```

Rules:
- Never commit directly to `main`. Open a pull request and get a review.
- Branch names use lowercase and hyphens only.
- Commit messages in English, past tense (e.g., `Add wishlist feature`, `Fix stock decrement bug`).

---

### How to Add a New API Endpoint

This walkthrough adds `GET /api/products/:id/reviews` as an example.

#### Step 1 — Add a database migration (if needed)

Create `database/migrations/002_reviews.sql`:

```sql
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_reviews_product ON product_reviews(product_id);
```

Run it:

```bash
cd backend
npm run build
npm run migrate
```

#### Step 2 — Create the controller function

Create `backend/src/controllers/reviewController.ts`:

```typescript
import { Request, Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/auth';

// GET /api/products/:id/reviews
export async function getProductReviews(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name AS user_name
       FROM product_reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getProductReviews error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/products/:id/reviews  (authenticated)
export async function createReview(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be between 1 and 5' });
    return;
  }
  try {
    const result = await query(
      `INSERT INTO product_reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user!.id, rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createReview error', err);
    res.status(500).json({ error: 'Server error' });
  }
}
```

#### Step 3 — Create the route file

Create `backend/src/routes/reviews.ts`:

```typescript
import { Router } from 'express';
import { getProductReviews, createReview } from '../controllers/reviewController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true }); // mergeParams to access :id from parent

router.get('/', getProductReviews);
router.post('/', authenticate, createReview);

export default router;
```

#### Step 4 — Register the route in the product router

Edit `backend/src/routes/products.ts` and add:

```typescript
import reviewRoutes from './reviews';

// After existing product routes:
router.use('/:id/reviews', reviewRoutes);
```

#### Step 5 — Test the endpoint

```bash
# Get reviews (public)
curl http://localhost:3000/api/products/<product-uuid>/reviews

# Post a review (authenticated)
curl -X POST http://localhost:3000/api/products/<product-uuid>/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Sản phẩm rất tốt!"}'
```

---

### How to Add a New Angular Page

This walkthrough adds a `Wishlist` page at `/wishlist`.

#### Step 1 — Generate the component

```bash
cd frontend
# Angular CLI — standalone component
npx ng generate component pages/wishlist --standalone
```

This creates:
```
src/app/pages/wishlist/
├── wishlist.component.ts
├── wishlist.component.html
└── wishlist.component.css
```

#### Step 2 — Implement the component

Edit `wishlist.component.ts`:

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WishlistService } from '../../services/wishlist.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wishlist.component.html',
})
export class WishlistComponent implements OnInit {
  items = signal<Product[]>([]);
  loading = signal(true);

  constructor(private wishlistService: WishlistService) {}

  ngOnInit() {
    this.wishlistService.getWishlist().subscribe({
      next: (products) => {
        this.items.set(products);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  remove(productId: string) {
    this.wishlistService.remove(productId).subscribe(() => {
      this.items.update(list => list.filter(p => p.id !== productId));
    });
  }
}
```

#### Step 3 — Add the route

Edit `frontend/src/app/app.routes.ts`:

```typescript
{
  path: 'wishlist',
  loadComponent: () =>
    import('./pages/wishlist/wishlist.component').then(m => m.WishlistComponent),
  canActivate: [authGuard],   // require login
},
```

#### Step 4 — Link to the page from navbar

In `navbar.component.html`, add:

```html
<a routerLink="/wishlist" routerLinkActive="active">Danh sách yêu thích</a>
```

#### Step 5 — Create the service (if needed)

```bash
npx ng generate service services/wishlist --skip-tests
```

Follow the service pattern described in Section 5.

---

### How to Add a Database Migration

Migrations are plain SQL files executed in alphabetical order by `migrate.ts`.

1. Create a new file in `database/migrations/` with the next sequence number:
   ```
   database/migrations/002_add_wishlist.sql
   ```

2. Write idempotent SQL using `IF NOT EXISTS` where possible:
   ```sql
   -- Migration 002: Wishlist feature
   CREATE TABLE IF NOT EXISTS wishlists (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE (user_id, product_id)
   );
   CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
   ```

3. Build and run:
   ```bash
   cd backend
   npm run build
   npm run migrate
   ```

> **Warning:** The current migration runner re-runs ALL files on every invocation. For production, use a proper migration tracker (e.g., `node-pg-migrate` or a `schema_migrations` table) to skip already-applied files.

---

## 5. Code Conventions

### TypeScript Patterns

- **Strict mode** is enabled in both `tsconfig.json` files.
- Use `interface` over `type` for object shapes.
- Prefer explicit return types on exported functions.
- No `any` — use `unknown` if the type is genuinely unknown, then narrow it.

### Backend: Controller Structure

Every controller function follows the same pattern:

```typescript
// 1. Function signature — always async, always returns Promise<void>
export async function myHandler(req: AuthRequest, res: Response): Promise<void> {
  // 2. Input validation — return early on bad input
  const { field } = req.body;
  if (!field) {
    res.status(400).json({ error: 'field is required' });
    return;   // <-- explicit return, no implicit fall-through
  }

  // 3. Business logic inside try/catch
  try {
    const result = await query('SELECT ...', [field]);
    res.json(result.rows[0]);
  } catch (err) {
    // 4. Log the raw error, return a generic message to the client
    console.error('myHandler error', err);
    res.status(500).json({ error: 'Server error' });
  }
}
```

Key rules:
- Always `return` after sending a response to prevent "headers already sent" errors.
- Never expose raw error messages or stack traces to the client.
- Log errors with a context prefix: `console.error('handlerName error', err)`.

### Backend: Parameterized Queries

**Never** interpolate user input into SQL strings. Always use positional parameters:

```typescript
// CORRECT — parameterized
const result = await query(
  'SELECT * FROM products WHERE category_id = $1 AND price <= $2',
  [categoryId, maxPrice]
);

// WRONG — SQL injection vulnerability
const result = await query(
  `SELECT * FROM products WHERE category_id = ${categoryId}`  // never do this
);
```

For `IN` clauses with dynamic arrays:

```typescript
const ids = ['uuid-1', 'uuid-2', 'uuid-3'];
// Generate: WHERE id = ANY($1)
const result = await query(
  'SELECT * FROM products WHERE id = ANY($1)',
  [ids]
);
```

### Backend: Transactions

Use `pool.connect()` and explicit `BEGIN/COMMIT/ROLLBACK` for multi-step writes:

```typescript
import { pool } from '../config/db';

const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple queries ...
  await client.query('COMMIT');
  res.status(201).json(result);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('myTransaction error', err);
  res.status(500).json({ error: 'Server error' });
} finally {
  client.release();   // always release back to the pool
}
```

### Frontend: Standalone Component Pattern

Every Angular component in this project is standalone (no NgModules):

```typescript
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-example',
  standalone: true,                      // required
  imports: [CommonModule, RouterModule], // declare ALL dependencies here
  templateUrl: './example.component.html',
  styleUrl: './example.component.css',
})
export class ExampleComponent implements OnInit {
  // Reactive state via signals
  data = signal<string[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() { /* ... */ }
}
```

### Frontend: Signal Usage

Use `signal()` for local state, read with `signal()` call syntax:

```typescript
// Declare
count = signal(0);
user = signal<User | null>(null);

// Read (in TypeScript)
const current = this.count();

// Write
this.count.set(5);

// Update relative to current value
this.count.update(n => n + 1);

// In templates — no parentheses needed in Angular 17 signals with template binding
// <span>{{ count() }}</span>   ← call it in the template
```

For derived computed values:

```typescript
import { computed } from '@angular/core';

total = computed(() =>
  this.items().reduce((sum, item) => sum + item.price * item.quantity, 0)
);
```

### Frontend: Service Pattern

Services are `providedIn: 'root'` singletons. HTTP calls return `Observable` and update signals via `tap`:

```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  readonly items = signal<Item[]>([]);

  constructor(private http: HttpClient) {}

  loadItems() {
    return this.http.get<Item[]>(`${environment.apiUrl}/items`).pipe(
      tap(items => this.items.set(items))
    );
  }

  createItem(data: Partial<Item>) {
    return this.http.post<Item>(`${environment.apiUrl}/items`, data).pipe(
      tap(newItem => this.items.update(list => [...list, newItem]))
    );
  }
}
```

Always subscribe in the component and handle errors:

```typescript
ngOnInit() {
  this.myService.loadItems().subscribe({
    next: () => this.loading.set(false),
    error: (err) => {
      this.error.set('Không thể tải dữ liệu');
      this.loading.set(false);
    },
  });
}
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Backend files | camelCase | `authController.ts` |
| Backend functions | camelCase | `createOrder`, `getMe` |
| Frontend files | kebab-case | `product-card.component.ts` |
| Frontend classes | PascalCase | `ProductCardComponent` |
| Database tables | snake_case | `cart_items`, `order_items` |
| Database columns | snake_case | `user_id`, `stock_quantity` |
| API JSON fields | camelCase | `shippingAddress`, `itemCount` |
| Environment variables | SCREAMING_SNAKE_CASE | `JWT_SECRET`, `DATABASE_URL` |

---

## 6. Environment Variables Reference

### Backend (.env)

| Variable | Required | Default (example) | Description |
|----------|----------|-------------------|-------------|
| `NODE_ENV` | No | `development` | Controls logging verbosity. Set to `production` in prod. |
| `PORT` | No | `3000` | HTTP port the Express server listens on. |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@localhost:5432/db` | Full PostgreSQL connection string. |
| `DATABASE_SSL` | No | `false` | Set to `true` for managed cloud databases (AWS RDS, Supabase). |
| `JWT_SECRET` | **Yes** | *(no default — must set)* | Secret key for signing JWTs. Use a random string of 32+ characters. |
| `JWT_EXPIRES_IN` | No | `7d` | JWT lifetime. Accepts `ms` format: `1h`, `7d`, `30d`. |
| `FRONTEND_URL` | No | `http://localhost:4200` | Allowed CORS origin. Set to your production domain in prod. |
| `SEED_ADMIN_PASSWORD` | Seed only | *(none)* | Password for the seeded admin account. Required only when running `npm run seed`. |

### Frontend (src/environments/)

The frontend reads its API URL from the Angular environment files, not from `.env`.

| File | `apiUrl` value | When used |
|------|---------------|-----------|
| `environment.ts` | `http://localhost:3000/api` | `ng serve` (development) |
| `environment.production.ts` | `/api` | `ng build --configuration production` |

In production, Nginx handles the `/api` prefix and proxies requests to the backend container. No absolute URL is needed in the production build.

---

## 7. Database Operations

### Running Migrations

```bash
# Build TypeScript first (migrate.ts compiles to dist/utils/migrate.js)
cd backend
npm run build
npm run migrate
```

In Docker:

```bash
docker compose exec backend npm run migrate
```

The migration runner reads every `*.sql` file in `database/migrations/` sorted alphabetically and executes each in sequence against the configured `DATABASE_URL`.

### Running Seeds

```bash
# Ensure SEED_ADMIN_PASSWORD is set in .env
cd backend
npm run seed
```

Seeds insert:
- Categories (from `database/seeds/001_categories.sql`)
- 12 sample products (from `database/seeds/002_products.sql`)
- Admin user with hashed password (from `database/seeds/003_admin_user.sql`)

The seed script is safe to re-run — it uses `ON CONFLICT DO NOTHING` and `INSERT ... WHERE NOT EXISTS` patterns to avoid duplicates.

### Connecting to the Database Directly

**Local PostgreSQL:**

```bash
psql postgresql://furnitureuser:furniturepass@localhost:5432/furnituredb
```

**Docker PostgreSQL:**

```bash
docker compose exec postgres psql -U furnitureuser -d furnituredb
```

**Production (via SSH tunnel):**

```bash
ssh -L 5433:localhost:5432 user@your-vps-ip
# In a second terminal:
psql postgresql://furnitureuser:password@localhost:5433/furnituredb
```

### Common Queries Reference

```sql
-- List all products with category name
SELECT p.id, p.name, p.price, p.stock_quantity, c.name AS category
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = TRUE
ORDER BY p.created_at DESC;

-- Check stock for a specific product
SELECT name, stock_quantity FROM products WHERE slug = 'sofa-da-that';

-- View a user's cart with product details
SELECT ci.id, p.name, p.price, ci.quantity, p.price * ci.quantity AS subtotal
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.user_id = '<user-uuid>';

-- List all orders with user info and item count
SELECT o.id, o.status, o.total_amount, o.created_at,
       u.name AS customer, u.email,
       COUNT(oi.id) AS item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, u.name, u.email
ORDER BY o.created_at DESC;

-- Find orders by status
SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at ASC;

-- Update order status manually
UPDATE orders SET status = 'shipped' WHERE id = '<order-uuid>';

-- Get revenue summary by month
SELECT DATE_TRUNC('month', created_at) AS month,
       COUNT(*) AS order_count,
       SUM(total_amount) AS revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY 1
ORDER BY 1 DESC;

-- Soft delete a product (admin endpoint does this automatically)
UPDATE products SET is_active = FALSE WHERE id = '<product-uuid>';
```

### Database Schema Overview

```
users           -- id (UUID), name, email, password_hash, role (customer|admin)
categories      -- id (SERIAL), name, slug, description, image_url
products        -- id (UUID), category_id, name, slug, price, stock_quantity,
                --   images (JSONB array), attributes (JSONB object), is_active
cart_items      -- id (UUID), user_id, product_id, quantity
                --   UNIQUE(user_id, product_id) — one row per product per user
orders          -- id (UUID), user_id, status, total_amount, shipping_address (JSONB)
order_items     -- id (UUID), order_id, product_id, product_name*, unit_price*, quantity
                --   *snapshot fields — preserve values even if product changes
```

---

## 8. Testing

### Backend Tests (Jest + Supertest)

The test suite uses Jest with `ts-jest` for TypeScript support and Supertest for HTTP integration tests.

**Run all tests:**

```bash
cd backend
npm test
```

**Run a single test file:**

```bash
npm test -- src/__tests__/auth.test.ts
```

**Run tests matching a name pattern:**

```bash
npm test -- --testNamePattern="login"
```

**Run with coverage:**

```bash
npm test -- --coverage
```

#### Writing a New Backend Test

Create a file at `backend/src/__tests__/reviews.test.ts`:

```typescript
import request from 'supertest';
import app from '../index';          // Express app (export app, not just listen)
import { pool } from '../config/db';

// Clean up DB state between tests
afterAll(async () => {
  await pool.end();
});

describe('GET /api/products/:id/reviews', () => {
  it('returns empty array for product with no reviews', async () => {
    const res = await request(app)
      .get('/api/products/some-valid-uuid/reviews');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 when posting a review without auth', async () => {
    const res = await request(app)
      .post('/api/products/some-valid-uuid/reviews')
      .send({ rating: 5, comment: 'Tốt lắm' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/products/:id/reviews (authenticated)', () => {
  let token: string;

  beforeAll(async () => {
    // Login to get a token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@furnitureshop.vn', password: 'Admin@123' });
    token = res.body.token;
  });

  it('creates a review with valid data', async () => {
    const res = await request(app)
      .post('/api/products/some-valid-uuid/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, comment: 'Chất lượng ổn' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.rating).toBe(4);
  });

  it('rejects invalid rating', async () => {
    const res = await request(app)
      .post('/api/products/some-valid-uuid/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 10 });      // out of range

    expect(res.status).toBe(400);
  });
});
```

### Frontend Tests (Karma + Jasmine)

**Run tests in Chrome (watch mode):**

```bash
cd frontend
npm test
```

**Run tests headlessly for CI:**

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

#### Writing a New Frontend Test

Create `wishlist.component.spec.ts` alongside the component:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WishlistComponent } from './wishlist.component';
import { WishlistService } from '../../services/wishlist.service';
import { of, throwError } from 'rxjs';

describe('WishlistComponent', () => {
  let component: WishlistComponent;
  let fixture: ComponentFixture<WishlistComponent>;
  let wishlistServiceSpy: jasmine.SpyObj<WishlistService>;

  beforeEach(async () => {
    // Create a spy object for the service
    wishlistServiceSpy = jasmine.createSpyObj('WishlistService', ['getWishlist', 'remove']);
    wishlistServiceSpy.getWishlist.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [WishlistComponent],   // standalone component goes in imports
      providers: [
        { provide: WishlistService, useValue: wishlistServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WishlistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();   // triggers ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in loading state', () => {
    // Reset
    wishlistServiceSpy.getWishlist.and.returnValue(of([]));
    // loading goes false after data loads
    expect(component.loading()).toBe(false);
  });

  it('renders empty message when wishlist is empty', () => {
    const el: HTMLElement = fixture.nativeElement;
    // Assume template shows this when items() is empty
    expect(el.textContent).toContain('Danh sách yêu thích trống');
  });

  it('handles service errors gracefully', async () => {
    wishlistServiceSpy.getWishlist.and.returnValue(throwError(() => new Error('Network error')));
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
  });
});
```

### Service Unit Tests

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CartService } from './cart.service';
import { environment } from '../../environments/environment';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CartService],
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadCart() updates the cart signal', () => {
    const mockCart = { items: [{ id: '1', quantity: 2 }], total: 500000 };

    service.loadCart().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cart`);
    req.flush(mockCart as any);

    expect(service.cart().total).toBe(500000);
    expect(service.itemCount()).toBe(2);
  });
});
```

---

## 9. Common Issues & Solutions

### Issue 1: `npm run migrate` fails with "permission denied for schema public"

**Symptom:** `ERROR: permission denied for schema public`

**Cause:** PostgreSQL 15+ requires explicit schema grants.

**Solution:**
```bash
psql -U postgres -d furnituredb
```
```sql
GRANT ALL ON SCHEMA public TO furnitureuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO furnitureuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO furnitureuser;
```

---

### Issue 2: Backend fails to start with "password authentication failed"

**Symptom:** `error: password authentication failed for user "furnitureuser"`

**Cause:** Wrong credentials in `DATABASE_URL`, or the PostgreSQL user does not exist.

**Solution:**
```bash
# Check the DATABASE_URL in .env matches what you created:
grep DATABASE_URL backend/.env

# Verify the user exists in PostgreSQL:
psql -U postgres -c "\du"

# Reset the password if needed:
psql -U postgres -c "ALTER USER furnitureuser WITH PASSWORD 'furniturepass';"
```

---

### Issue 3: CORS errors in the browser

**Symptom:** `Access to XMLHttpRequest blocked by CORS policy` in browser console.

**Cause:** `FRONTEND_URL` in backend `.env` does not match the origin the browser is sending.

**Solution:**

Check what origin the browser sends (look at the `Origin` header in network tab). Update `FRONTEND_URL` in `.env`:

```ini
# If running Angular on a non-standard port:
FRONTEND_URL=http://localhost:4201
```

Restart the backend after changing `.env`.

---

### Issue 4: JWT token not being sent to the API

**Symptom:** API returns `401 Authentication required` even though the user is logged in.

**Cause:** The `authInterceptor` is not registered in `app.config.ts`.

**Verify** `frontend/src/app/app.config.ts` contains:

```typescript
import { withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),  // <-- must be here
  ],
};
```

---

### Issue 5: SSL certificate error with DATABASE_SSL

**Symptom:** `Error: self signed certificate in certificate chain` when `DATABASE_SSL=true`.

**Cause:** The PostgreSQL server uses a self-signed certificate and `rejectUnauthorized: true` is blocking the connection.

**Solution:**

For managed cloud databases (AWS RDS, Supabase), their certificates are signed by trusted CAs. If you are using a self-signed cert in development, either:

```ini
# Option A — Disable SSL entirely (local only)
DATABASE_SSL=false

# Option B — Disable certificate verification (not for production)
# Modify backend/src/config/db.ts temporarily:
# ssl: { rejectUnauthorized: false }
```

---

### Issue 6: `ng serve` — "Port 4200 is already in use"

**Symptom:** `Port 4200 is already in use. Use '--port' to specify a different port.`

**Solution:**

```bash
# Kill the process on port 4200
lsof -ti:4200 | xargs kill -9

# Or start on a different port
npm start -- --port 4201
```

If using a different port, remember to update `FRONTEND_URL` in backend `.env`.

---

### Issue 7: `docker compose up` — database container keeps restarting

**Symptom:** `postgres` container exits immediately or keeps restarting.

**Cause:** Often a leftover volume with corrupted data, or a port conflict.

**Solution:**

```bash
# Stop all containers and remove the database volume
docker compose down -v

# Check if something else uses port 5432
lsof -i :5432

# Restart fresh
docker compose up
```

---

### Issue 8: Order creation fails with "Insufficient stock"

**Symptom:** `POST /api/orders` returns `400 Insufficient stock for: <product name>` even though stock looks correct.

**Cause:** Race condition if multiple concurrent checkouts hit the same product — the `FOR UPDATE` row lock prevents double-spending, but the first transaction wins.

**Expected behavior:** This is correct behavior. If a user hits this error, prompt them to adjust their cart and try again.

**For testing/development** — increase stock directly:

```bash
psql $DATABASE_URL -c "UPDATE products SET stock_quantity = 100 WHERE name = 'Sofa Da Thật';"
```

---

### Issue 9: Frontend build fails — "Cannot find module" for environment files

**Symptom:** `Cannot find module '../../environments/environment'`

**Cause:** Environment files were deleted or not created.

**Solution:**

```bash
# Create missing files
cat > frontend/src/environments/environment.ts << 'EOF'
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
};
EOF

cat > frontend/src/environments/environment.production.ts << 'EOF'
export const environment = {
  production: true,
  apiUrl: '/api',
};
EOF
```

---

### Issue 10: Admin panel not accessible — redirected to home

**Symptom:** Navigating to `/admin` redirects back to home even when logged in as admin.

**Cause:** The user's `role` field in the JWT payload is not `'admin'`.

**Debug steps:**

```bash
# Check the user's role in the database
psql $DATABASE_URL -c "SELECT email, role FROM users WHERE email = 'admin@furnitureshop.vn';"

# If role is 'customer', update it:
psql $DATABASE_URL -c "UPDATE users SET role = 'admin' WHERE email = 'admin@furnitureshop.vn';"
```

Then log out and log back in — the new JWT will contain `role: 'admin'`.

---

## 10. SDLC Agents Reference

This project ships with five Claude Code agents defined in `.claude/agents/`. Invoke them by name inside a Claude Code session.

### How to Invoke an Agent

In Claude Code, type:

```
Use the pm agent to...
Use the qa agent to write test cases for...
Ask the devops agent how to...
```

Or use the slash command if available:

```
/agent pm  create sprint plan for wishlist feature
```

---

### Agent: `pm` — Product Manager

**Purpose:** Sprint planning, user story writing, feature prioritization, roadmap decisions.

**Example prompts:**
```
Use the pm agent to create a user story for the wishlist feature.
Use the pm agent to prioritize the backlog for the next sprint.
Use the pm agent to write acceptance criteria for the checkout flow.
```

---

### Agent: `ba` — Business Analyst

**Purpose:** API contract design, data model design, requirements analysis, acceptance criteria, edge case identification.

**Example prompts:**
```
Use the ba agent to define the API contract for product reviews.
Use the ba agent to model the data structure for a loyalty points system.
Use the ba agent to analyze the checkout flow and identify missing requirements.
```

---

### Agent: `qa` — QA Engineer

**Purpose:** Test case writing, edge case identification, bug report templates, test strategy, regression checklist.

**Example prompts:**
```
Use the qa agent to write test cases for the order creation flow.
Use the qa agent to create a regression checklist for the cart feature.
Use the qa agent to identify edge cases in the authentication system.
```

---

### Agent: `devops` — DevOps Engineer

**Purpose:** Docker configuration, Nginx setup, CI/CD pipeline, VPS operations, SSL certificates, environment configuration.

**Example prompts:**
```
Use the devops agent to troubleshoot the Nginx SSL configuration.
Use the devops agent to set up a staging environment on a new VPS.
Use the devops agent to optimize the Docker build for faster CI.
```

---

### Agent: `customer` — Customer Perspective

**Purpose:** End-user feedback simulation, UX review from a Vietnamese customer's perspective, usability analysis, UI copy review.

**Example prompts:**
```
Use the customer agent to review the checkout page UX.
Use the customer agent to provide feedback on the product listing page.
Use the customer agent to evaluate the order confirmation email template.
```

---

## Quick Reference Card

```bash
# Backend
cd backend && npm run dev          # start backend (port 3000)
npm run build                      # compile TypeScript
npm run migrate                    # run SQL migrations
npm run seed                       # seed sample data
npm test                           # run Jest tests

# Frontend
cd frontend && npm start           # start Angular dev server (port 4200)
npm test                           # run Karma tests
npm run build:prod                 # production build

# Docker
docker compose up                  # start full stack
docker compose down -v             # stop and wipe volumes
docker compose exec backend bash   # shell into backend container
docker compose exec postgres \
  psql -U furnitureuser furnituredb   # psql in container

# Health check
curl http://localhost:3000/api/health

# Quick login test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@furnitureshop.vn","password":"Admin@123"}'
```
