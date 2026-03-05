# FurnitureShop — Architecture Document

**Version**: 1.0
**Date**: 2026-03-05
**Author**: Tech Architect
**Project**: FurnitureShop — E-commerce platform for furniture retail
**Repository**: github.com/ndlong75/furniture-shop

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Design](#4-database-design)
5. [Security Architecture](#5-security-architecture)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Key Design Decisions (ADR Style)](#7-key-design-decisions-adr-style)
8. [Performance Considerations](#8-performance-considerations)

---

## 1. Architecture Overview

### 1.1 System Description

FurnitureShop is a full-stack e-commerce web application serving the Vietnamese furniture retail market. It enables customers to browse a product catalog, manage a shopping cart, place orders, and track order status. An admin panel provides product and order management for back-office staff.

The system is designed as a classical three-tier web application with clearly separated concerns:

- **Presentation tier**: Angular 17 Single-Page Application (SPA), served as static files via Nginx.
- **Application tier**: RESTful API built with Node.js, Express, and TypeScript.
- **Data tier**: PostgreSQL 16 relational database.

### 1.2 Architecture Style

| Dimension | Style Applied |
|---|---|
| Overall | Layered (3-tier) |
| API surface | REST (resource-oriented, HTTP verbs, JSON body) |
| Frontend | Single-Page Application (SPA) with client-side routing |
| State management | Reactive signals (Angular 17 Signals API) |
| Auth | Stateless JWT (no server-side sessions) |
| Data access | Raw SQL with parameterized queries (no ORM) |

### 1.3 System Context Diagram

```
  +-----------+        HTTPS         +------------------+
  |  Browser  | <------------------> |  Nginx (port 443) |
  | (Angular  |                      |  Reverse Proxy    |
  |   SPA)    |                      |  + Static Server  |
  +-----------+                      +--------+----------+
                                              |
                       +--------------------+ |
                       |                    | |
                       v                    v |
               +---------------+   (static files served
               |  Angular SPA  |    from Nginx root)
               |  (embedded in |
               |  Nginx image) |
               +---------------+
                                              |
                              /api/* requests |
                                              v
                                  +-------------------+
                                  |  Express Backend  |
                                  |  Node.js (port    |
                                  |  3000, internal)  |
                                  +--------+----------+
                                           |
                                           | pg pool
                                           v
                                  +-------------------+
                                  |  PostgreSQL 16    |
                                  |  (port 5432,      |
                                  |   internal only)  |
                                  +-------------------+
```

### 1.4 Network Topology Summary

In production, only Nginx is exposed to the public internet (ports 80/443). The backend API and PostgreSQL database communicate over a private Docker bridge network (`internal`). The browser downloads the Angular SPA bundle from Nginx on first load, then all subsequent API calls travel from browser → HTTPS → Nginx → internal network → backend → PostgreSQL. PostgreSQL is never accessible from outside the Docker network.

---

## 2. Frontend Architecture

### 2.1 Angular 17 Standalone Components Pattern

FurnitureShop's frontend is built with Angular 17 using the standalone components model, which was introduced as the preferred approach in Angular 15+ and stabilized in Angular 17. Under this model:

- Each component declares its own `imports` array rather than belonging to an `NgModule`.
- The application bootstraps through `bootstrapApplication()` with an `ApplicationConfig` object.
- Tree-shaking is more effective because unused modules are never imported into the module graph.

The `ApplicationConfig` defined in `app.config.ts` is the central wiring point:

```
appConfig
  provideRouter(routes, withComponentInputBinding())
  provideHttpClient(withInterceptors([authInterceptor]))
  provideAnimations()
```

`withComponentInputBinding()` enables route parameters to be bound directly to component `@Input()` properties, removing the need to inject `ActivatedRoute` in components that only read route params.

### 2.2 Signals for State Management

Angular Signals replace RxJS `BehaviorSubject` for shared mutable state. The two primary stateful services are:

**AuthService**
- `currentUser = signal<User | null>(null)` — holds the authenticated user.
- On application init the service reads the JWT from `localStorage`, decodes the payload, and calls `currentUser.set(decoded)` to restore the session without a network request.
- On login success, sets the signal and persists the token.
- On logout, sets the signal to `null` and removes the token.

**CartService**
- `cart = signal<CartItem[]>([])` — the full cart item list.
- `itemCount = computed(() => cart().reduce((sum, i) => sum + i.quantity, 0))` — a derived signal for the navbar badge, recomputed automatically whenever cart changes.

Signals propagate changes synchronously through the component tree via Angular's change detection, eliminating the need for manual `subscribe`/`unsubscribe` lifecycle management in components.

### 2.3 Lazy-Loaded Routes

All page-level components are lazy-loaded using the `loadComponent` pattern. Each route definition passes a dynamic `import()` function:

```
{ path: 'products', loadComponent: () =>
    import('./pages/products/products.component')
    .then(m => m.ProductsComponent) }
```

This means the initial JavaScript bundle downloaded by the browser contains only the app shell (navbar, footer, routing infrastructure). Page chunks are fetched on demand when the user navigates to that route. The full route table:

| Path | Guard | Lazy Chunk |
|---|---|---|
| `/` | none | `home` |
| `/products` | none | `products` |
| `/products/:slug` | none | `product-detail` |
| `/cart` | `authGuard` | `cart` |
| `/checkout` | `authGuard` | `checkout` |
| `/orders` | `authGuard` | `orders` |
| `/auth/login` | none | `login` |
| `/auth/register` | none | `register` |
| `/admin` | `authGuard`, `adminGuard` | `admin` |
| `**` | — | redirect to `/` |

### 2.4 Auth Interceptor Flow

Every outbound HTTP request is processed by `authInterceptor` before it leaves the browser:

```
HTTP request
    |
    v
authInterceptor (functional interceptor registered in provideHttpClient)
    |-- reads JWT from localStorage
    |-- if token present: clones request, adds Authorization: Bearer <token>
    |-- passes modified request to next handler
    v
Backend API
```

The interceptor is a functional interceptor (not a class-based `HttpInterceptor`), registered via `withInterceptors([authInterceptor])` in `provideHttpClient`. This is the Angular 17 preferred approach and avoids the need for an `HTTP_INTERCEPTORS` multi-provider token.

### 2.5 Route Guards

- **`authGuard`**: Checks `AuthService.currentUser()` signal. If null (not authenticated), redirects to `/auth/login`. Implemented as a functional guard returning a boolean or `UrlTree`.
- **`adminGuard`**: Checks `currentUser().role === 'admin'`. If the user is authenticated but not admin, redirects to `/`. Applied after `authGuard` in the `canActivate` array for `/admin`.

### 2.6 Component Hierarchy

```
AppComponent
├── NavbarComponent         (shared, always rendered)
│   └── [cart badge via CartService.itemCount signal]
├── <router-outlet>
│   ├── HomeComponent       (lazy)
│   ├── ProductsComponent   (lazy)
│   │   └── ProductCardComponent (shared, rendered per product)
│   ├── ProductDetailComponent (lazy)
│   ├── CartComponent       (lazy, auth-guarded)
│   ├── CheckoutComponent   (lazy, auth-guarded)
│   ├── OrdersComponent     (lazy, auth-guarded)
│   ├── LoginComponent      (lazy)
│   ├── RegisterComponent   (lazy)
│   └── AdminComponent      (lazy, auth+admin guarded)
└── FooterComponent         (shared, always rendered)
```

---

## 3. Backend Architecture

### 3.1 Express Layered Architecture

The backend follows a strict three-layer separation within the Express application:

```
HTTP Request
     |
     v
[ index.ts ] — app bootstrap, CORS, body parsing, global error handler
     |
     v
[ routes/index.ts ] — mounts sub-routers at /api/*
     |
     +---> [ routes/auth.ts ]      → POST /auth/login, POST /auth/register, GET /auth/me
     +---> [ routes/products.ts ]  → GET /products, GET /products/categories, GET /products/:slug
     +---> [ routes/cart.ts ]      → GET/POST/PUT/DELETE /cart/:itemId
     +---> [ routes/orders.ts ]    → GET/POST /orders
     +---> [ routes/admin.ts ]     → admin-scoped CRUD operations
     |
     v (each route applies middleware then delegates)
[ middleware/auth.ts ]
     |-- authenticate(req, res, next)   → verifies JWT, attaches req.user
     |-- requireAdmin(req, res, next)   → checks req.user.role === 'admin'
     |
     v
[ controllers/* ] — business logic, query construction, response shaping
     |
     v
[ config/db.ts ] — pool.query() / pool.connect() for transactions
     |
     v
[ PostgreSQL 16 ]
```

### 3.2 No-ORM Design Decision and Rationale

The backend accesses PostgreSQL exclusively through the `pg` library using raw parameterized SQL queries. There is no ORM (no Sequelize, Prisma, TypeORM, or similar).

This choice has several practical consequences:
- Queries are explicit and predictable. Developers read exactly what SQL is sent to the database.
- The `ON CONFLICT ... DO UPDATE` upsert pattern for cart items and the `FOR UPDATE` locking pattern for stock checks are trivially expressed in SQL, whereas ORMs often require escape hatches or raw query APIs for these constructs.
- Migration is handled by a custom `migrate.ts` utility that executes `.sql` files directly, keeping schema definition in standard SQL rather than ORM-specific migration DSLs.
- The tradeoff is that there is no automatic relationship loading or model-level validation — all constraints are enforced by the database schema and controller logic.

### 3.3 Parameterized Queries Pattern

All user-supplied values are passed as positional parameters (`$1`, `$2`, ...) to `pool.query(text, params)`. No string interpolation of user data into query text is ever performed. Example from `productController.ts`:

```sql
SELECT p.*, c.name AS category_name
FROM products p LEFT JOIN categories c ON p.category_id = c.id
WHERE p.slug = $1 AND p.is_active = TRUE
```

The parameter index builder in `getProducts` dynamically constructs the `WHERE` clause by incrementing a counter `pi` and pushing values to a `params` array, then appending `LIMIT $n OFFSET $n+1` for pagination — all without concatenating user input into the query string.

### 3.4 JWT Auth Middleware Chain

Protected routes stack middleware in order:

```
router.get('/cart', authenticate, cartController.getCart)
router.post('/admin/products', authenticate, requireAdmin, createProduct)
```

**`authenticate` middleware flow**:
1. Extract `Authorization` header, strip `Bearer ` prefix.
2. If absent → `401 Authentication required`.
3. Call `jwt.verify(token, env.JWT_SECRET)`.
4. On success → attach `{ id, email, role }` payload to `req.user`, call `next()`.
5. On failure (expired, tampered) → `401 Invalid or expired token`.

**`requireAdmin` middleware flow**:
1. Check `req.user?.role === 'admin'`.
2. If not admin → `403 Admin access required`.
3. If admin → call `next()`.

`AuthRequest` extends `express.Request` with an optional `user` property typed as `{ id: string; email: string; role: string }`. This provides full TypeScript type safety in controllers that access `req.user`.

### 3.5 Transaction Pattern for Orders

Order creation is the most complex write operation and requires ACID guarantees across four tables. The `createOrder` function acquires a dedicated client from the pool and manually manages a transaction:

```
BEGIN
  1. SELECT cart items for the user (join with products for name/price/image)
  2. SELECT ... FOR UPDATE on all product rows (acquires row-level locks)
  3. Validate each item's quantity against locked stock values
  4. INSERT into orders (returns new order id)
  5. For each item:
       INSERT into order_items (price snapshot)
       UPDATE products SET stock_quantity = stock_quantity - $qty
  6. DELETE FROM cart_items WHERE user_id = $user
COMMIT
```

If any step fails, `ROLLBACK` is called in the `catch` block and the client is released in `finally`. The `FOR UPDATE` lock on product rows at step 2 prevents two concurrent checkout requests from both reading the same stock value and independently concluding stock is sufficient, which would cause overselling.

---

## 4. Database Design

### 4.1 Schema Overview

The database contains six tables covering users, product catalog, shopping carts, and orders.

```
users
  id (UUID PK)
  name, email (UNIQUE), password_hash
  role CHECK IN ('customer', 'admin')
  created_at, updated_at

categories
  id (SERIAL PK)
  name, slug (UNIQUE)
  description, image_url
  created_at

products
  id (UUID PK)
  category_id (FK → categories, SET NULL on delete)
  name, slug (UNIQUE)
  description, price (DECIMAL 12,2 >= 0)
  stock_quantity (INTEGER >= 0)
  images (JSONB array of URLs)
  attributes (JSONB object: color, material, dimensions, weight)
  is_active (BOOLEAN, soft-delete flag)
  created_at, updated_at

cart_items
  id (UUID PK)
  user_id (FK → users, CASCADE delete)
  product_id (FK → products, CASCADE delete)
  quantity (INTEGER > 0)
  UNIQUE (user_id, product_id)
  created_at, updated_at

orders
  id (UUID PK)
  user_id (FK → users, RESTRICT delete)
  status CHECK IN ('pending','processing','shipped','delivered','cancelled')
  total_amount (DECIMAL 12,2)
  shipping_address (JSONB: fullName, phone, address, city, note)
  created_at, updated_at

order_items
  id (UUID PK)
  order_id (FK → orders, CASCADE delete)
  product_id (FK → products, SET NULL on delete) -- nullable snapshot reference
  product_name (VARCHAR, snapshot)
  product_image (VARCHAR, snapshot)
  unit_price (DECIMAL 12,2, snapshot)
  quantity (INTEGER > 0)
  subtotal (DECIMAL 12,2)
```

### 4.2 Table Relationships

```
categories ──< products >── cart_items >── users
                  |
                  └── order_items >── orders >── users
```

- One category has many products (`categories 1:N products`).
- One user has many cart items; each cart item references one product (`users 1:N cart_items N:1 products`).
- One user has many orders (`users 1:N orders`).
- One order has many order items; each order item references one product (`orders 1:N order_items N:1 products`).
- The `UNIQUE (user_id, product_id)` constraint on `cart_items` enforces a single cart row per user-product combination, enabling the upsert (`ON CONFLICT DO UPDATE`) pattern.

### 4.3 Key Indexes and Rationale

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `idx_products_category` | products | category_id | Speeds up category-filtered product listing queries |
| `idx_products_is_active` | products | is_active | Filters soft-deleted products efficiently; most queries include `WHERE is_active = TRUE` |
| `idx_products_slug` | products | slug | Fast single-product lookup by URL slug (used on product detail page) |
| `idx_cart_items_user` | cart_items | user_id | Retrieves all cart items for a user quickly |
| `idx_orders_user` | orders | user_id | Customer order history lookup |
| `idx_orders_status` | orders | status | Admin order management filtered by status |
| `idx_order_items_order` | order_items | order_id | Fetches line items for a given order |

Primary key indexes on UUID columns are created automatically by PostgreSQL. The `slug` and `email` columns also have implicit unique indexes from their `UNIQUE NOT NULL` constraints.

### 4.4 Trigger Usage

A single PL/pgSQL trigger function `update_updated_at()` is applied via four `BEFORE UPDATE` triggers:

- `trg_users_updated_at`
- `trg_products_updated_at`
- `trg_cart_items_updated_at`
- `trg_orders_updated_at`

The function sets `NEW.updated_at = NOW()` before any update is written. This ensures `updated_at` is always accurate without relying on application code to set the value on every `UPDATE` statement.

### 4.5 Data Integrity Constraints

| Constraint | Location | Effect |
|---|---|---|
| `price >= 0` | products.price | No negative prices |
| `stock_quantity >= 0` | products.stock_quantity | No negative stock |
| `quantity > 0` | cart_items.quantity, order_items.quantity | No zero-quantity line items |
| `role IN ('customer','admin')` | users.role | Enum-like role restriction |
| `status IN (...)` | orders.status | Valid status transitions only |
| `ON DELETE CASCADE` | cart_items, order_items | Removing user cascades their cart; removing order cascades its items |
| `ON DELETE RESTRICT` | orders.user_id | Cannot delete a user who has orders (preserves order history) |
| `ON DELETE SET NULL` | products.category_id | Deleting a category does not delete products |
| `ON DELETE SET NULL` | order_items.product_id | Product can be deleted; snapshot fields (name, price, image) preserve the historical record |

### 4.6 JSONB Column Design

Two product columns use JSONB:

- **`images`** — an ordered array of image URL strings. The first image (`images->0`) is extracted in the cart query for display in the order summary. Storing images as JSONB avoids a separate `product_images` join table for a simple list.
- **`attributes`** — a flexible key-value object (`color`, `material`, `dimensions`, `weight`) that varies by product type. Using JSONB allows different furniture categories to carry different attribute sets without schema changes.

The `shipping_address` on orders is also JSONB, capturing the address as it existed at order time (snapshot semantics).

---

## 5. Security Architecture

### 5.1 JWT Flow

```
1. ISSUE (POST /api/auth/login or /api/auth/register)
   - Server validates credentials
   - Calls jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
   - Returns { token, user } in response body

2. STORE (frontend)
   - authInterceptor / AuthService stores token in localStorage
   - AuthService decodes payload (without verification) to populate currentUser signal

3. SEND (every authenticated request)
   - authInterceptor clones the outbound request
   - Adds header: Authorization: Bearer <token>

4. VERIFY (backend authenticate middleware)
   - Extracts token from Authorization header
   - Calls jwt.verify(token, JWT_SECRET) — this verifies signature AND expiry
   - On success: attaches { id, email, role } to req.user
   - On failure: 401 response, request is rejected
```

Token expiry defaults to `7d` (configurable via `JWT_EXPIRES_IN` env var). There is no token refresh mechanism; the user must log in again after expiry. The secret is loaded from environment via `requireEnv('JWT_SECRET')` which throws at startup if absent.

### 5.2 CORS Configuration

CORS is configured in `index.ts` with an explicit origin allowlist:

```typescript
app.use(cors({ origin: env.FRONTEND_URL }));
```

`FRONTEND_URL` is a required environment variable (validated by `requireEnv` at startup). In production this is set to the actual domain (e.g., `https://yourdomain.com`), which means requests from any other origin are rejected at the CORS preflight stage. In local development it is set to `http://localhost:4200`.

This prevents cross-origin API calls from unauthorized browser origins. Note that CORS is a browser-enforced protection; it does not prevent direct API calls from non-browser clients, which is acceptable since the API also validates JWT on protected routes.

### 5.3 SQL Injection Prevention

All database queries use the `pg` library's parameterized query interface:

```typescript
await pool.query(
  'SELECT * FROM products WHERE slug = $1 AND is_active = TRUE',
  [req.params.slug]
);
```

The `pg` library sends the query text and parameters to PostgreSQL separately using the extended query protocol. PostgreSQL parses and plans the query before substituting parameters, making it structurally impossible for parameter values to alter the query logic. No string template literals containing user input are ever used in query construction.

### 5.4 Password Hashing Strategy

Passwords are stored in `users.password_hash`. The `authController` uses `bcrypt` for hashing (industry standard for passwords):
- On registration: `bcrypt.hash(password, saltRounds)` produces a hash stored in `password_hash`.
- On login: `bcrypt.compare(password, user.password_hash)` verifies the plaintext against the stored hash.
- Plain-text passwords are never stored or logged.

### 5.5 Environment Variable Management

`config/env.ts` implements a startup validation pattern using `requireEnv`:

```typescript
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}
```

Required variables (`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`) cause the process to throw and exit immediately on startup if absent. Optional variables (`NODE_ENV`, `PORT`, `DATABASE_SSL`, `JWT_EXPIRES_IN`) have safe defaults. This fail-fast approach prevents the server from running in a partially configured state where it might accept connections but fail silently or operate with weak defaults.

### 5.6 Nginx Security Headers

The production Nginx configuration adds three HTTP security headers to all responses:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking by disallowing the site being embedded in iframes from other origins |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing; browsers must respect the declared `Content-Type` |
| `X-XSS-Protection` | `1; mode=block` | Enables browser's built-in XSS filter (legacy browsers) |

---

## 6. Deployment Architecture

### 6.1 Docker Compose Topology

Two Compose files cover the two deployment environments:

**Local development (`docker-compose.yml`)**

```
fs_postgres  (postgres:16-alpine)
  - port 5432 exposed to host (for direct DB access with GUI tools)
  - named volume: postgres_data
  - healthcheck: pg_isready

fs_backend  (built from ./backend Dockerfile, builder stage)
  - command: npm run dev (nodemon hot-reload)
  - port 3000 exposed to host (for direct API testing)
  - source volume mount: ./backend/src:/app/src (live reload)
  - depends_on postgres (condition: service_healthy)

fs_frontend  (node:20-alpine, not a custom image)
  - command: npm start -- --host 0.0.0.0
  - port 4200 exposed to host
  - source volume mount: ./frontend:/app (live reload)
  - depends_on backend
```

In development, all three services are exposed to the host. The frontend dev server proxies are not used — the Angular app calls the backend directly on `localhost:3000`. Hot reload works through volume mounts for both backend (nodemon) and frontend (Webpack dev server file watching).

**Production (`docker-compose.prod.yml`)**

```
fs_postgres  (postgres:16-alpine)
  - NO port exposed to host
  - env vars from shell (GitHub Secrets injected via .env file)
  - network: internal only
  - restart: unless-stopped

fs_backend  (ghcr.io/ndlong75/furniture-shop/backend:latest)
  - NO port exposed to host
  - network: internal only
  - depends_on postgres (condition: service_healthy)
  - restart: unless-stopped

fs_nginx  (ghcr.io/ndlong75/furniture-shop/frontend:latest)
  - ports 80:80, 443:443 exposed to host (the ONLY public entry point)
  - mounts: nginx.prod.conf, /etc/letsencrypt (read-only), certbot_www
  - network: internal
  - restart: unless-stopped

networks:
  internal: bridge driver (private, not accessible from host)

volumes:
  postgres_data   (persistent DB data)
  certbot_www     (certbot ACME challenge files)
```

### 6.2 Nginx as Reverse Proxy and Static Server

The production frontend Docker image bundles the Angular production build (`dist/furniture-shop/browser/`) into the Nginx image. Nginx serves two responsibilities from a single server block:

**Static file serving (Angular SPA)**
```
root /usr/share/nginx/html;
location / {
    try_files $uri $uri/ /index.html;
}
```
`try_files` attempts to serve an actual file at the requested URI; if no file is found, it falls back to `index.html`. This is the standard Nginx configuration for HTML5 pushState-based SPA routing — any deep link (e.g., `/products/ghe-sofa-123`) is served by the Angular app which then activates the correct route client-side.

**API reverse proxy**
```
location /api/ {
    proxy_pass http://backend:3000/api/;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
Requests to `/api/*` are forwarded to the backend container over the internal Docker network. The backend hostname `backend` resolves via Docker's embedded DNS to the `fs_backend` container's internal IP. The `X-Forwarded-For` and `X-Forwarded-Proto` headers allow the backend to reconstruct the real client IP and protocol if needed.

**SSL/TLS**
```
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
```
Certificates are issued by Let's Encrypt using `certbot`. The `/etc/letsencrypt` directory from the VPS host is bind-mounted read-only into the Nginx container. HTTP port 80 redirects unconditionally to HTTPS.

**Static asset caching**
```
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
Angular's production build generates asset filenames with content hashes (e.g., `main.abc123.js`). Since the hash changes when content changes, assets can be cached indefinitely (1 year). This dramatically reduces repeat-visit load times.

### 6.3 Container Networking

```
Host OS (Ubuntu 22.04 VPS)
  |
  +-- Docker bridge: "internal"
      |
      +-- fs_nginx     (172.x.x.2) — ONLY container on host ports 80/443
      +-- fs_backend   (172.x.x.3) — reachable by hostname "backend"
      +-- fs_postgres  (172.x.x.4) — reachable by hostname "postgres"
```

All three containers share the `internal` bridge network. Inter-container communication uses Docker DNS service discovery (hostname = container name). PostgreSQL is not reachable from outside the Docker network, enforcing database-level network isolation without firewall rules on individual ports.

### 6.4 Volume Strategy

| Volume | Type | Contents | Persistence |
|---|---|---|---|
| `postgres_data` | Named volume | PostgreSQL data directory | Persistent across container restarts and image upgrades |
| `/etc/letsencrypt` | Bind mount (read-only) | SSL certificates from certbot | Managed by host certbot; container gets read access |
| `certbot_www` | Named volume | ACME challenge files | Temporary; used during certificate renewal |
| `./backend/src` | Bind mount (dev only) | Backend TypeScript sources | Development hot reload |
| `./frontend` | Bind mount (dev only) | Angular source tree | Development hot reload |

In production, application code is baked into Docker images at build time. Only `postgres_data` and the SSL certificate bind mount require persistence beyond container lifecycle.

### 6.5 CI/CD Pipeline

The GitHub Actions workflow triggers on push to `main`:

```
Trigger: push to main
  |
  Step 1: Test
    - backend: npm test (Jest)
    - frontend: npm test (Karma/Jasmine, headless)
  |
  Step 2: Build Docker images
    - docker build backend → ghcr.io/.../backend:latest
    - docker build frontend (ng build:prod + nginx) → ghcr.io/.../frontend:latest
    - docker push both images to GHCR
  |
  Step 3: Deploy to VPS via SSH
    - SSH into VPS using VPS_SSH_KEY secret
    - docker compose -f docker-compose.prod.yml pull
    - docker compose -f docker-compose.prod.yml up -d
```

GitHub Secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `FRONTEND_URL`) are injected at deploy time and never appear in the repository or Docker images.

---

## 7. Key Design Decisions (ADR Style)

### ADR-001: No ORM — Raw pg with Parameterized SQL

**Context**: The backend needs to read and write a PostgreSQL database. The team evaluated ORMs (Sequelize, Prisma, TypeORM) and the raw `pg` driver.

**Decision**: Use the `pg` library directly with raw parameterized SQL queries. No ORM is used.

**Rationale**:
- The data model is stable (six tables, no dynamic schema requirements) and does not benefit greatly from ORM migration generation.
- The `createOrder` transaction requires `SELECT ... FOR UPDATE`, upsert with `ON CONFLICT`, and `json_agg` aggregations — operations that are natural in SQL but require ORM escape hatches.
- SQL is explicit: developers reading controller code see exactly what queries run, making debugging, query optimization, and code review straightforward.
- The `pg` library is the official Node.js PostgreSQL driver and has minimal abstraction overhead.

**Consequences**:
- Positive: Full SQL expressiveness, no N+1 query risk from lazy loading, no ORM version mismatch issues.
- Negative: No automatic schema-from-model generation, no built-in model validation, manual query construction for dynamic filters (as seen in `getProducts`).

---

### ADR-002: JWT Stored in localStorage (vs. HttpOnly Cookie)

**Context**: The frontend needs to persist the authentication token across page refreshes and send it with API requests.

**Decision**: Store the JWT in `localStorage`. The `authInterceptor` reads it and adds `Authorization: Bearer <token>` to requests.

**Rationale**:
- `localStorage` is simpler to implement in an Angular SPA interceptor pattern.
- The API is consumed only by the Angular SPA (same domain in production), reducing XSS attack surface relative to a multi-tenant API.
- Cookie-based storage would require additional backend configuration (cookie parsing, CSRF protection with `SameSite=Strict` or CSRF tokens), adding complexity.

**Consequences**:
- Positive: Simple implementation, works naturally with `Authorization` header-based auth.
- Negative: XSS vulnerabilities in the Angular app could allow token theft. `HttpOnly` cookies are immune to JavaScript access and would be a more secure alternative for higher-risk deployments.
- Mitigation: Angular's template engine auto-escapes output, reducing XSS risk. CSP headers (not currently implemented) would further reduce risk.

---

### ADR-003: Server-Side Cart (vs. Client-Side / localStorage Cart)

**Context**: Shopping cart data could be stored client-side (localStorage/sessionStorage) or server-side in the database.

**Decision**: Cart items are stored server-side in the `cart_items` table, associated with the authenticated user.

**Rationale**:
- A server-side cart persists across devices and browsers — a user can add items on mobile and complete purchase on desktop.
- Stock validation at checkout operates on the same database as the cart, enabling accurate availability checks within the same transaction.
- Client-side carts require cart merge logic when a user logs in with a pre-existing cart, adding complexity.
- The `UNIQUE (user_id, product_id)` constraint and `ON CONFLICT DO UPDATE` upsert pattern make server-side cart operations atomic and idempotent.

**Consequences**:
- Positive: Multi-device persistence, consistent stock validation, no cart-merge complexity.
- Negative: Cart operations require network round trips; guest shopping (without login) is not supported with this design (users must register to add items).

---

### ADR-004: Angular Standalone Components (No NgModules)

**Context**: Angular historically required `NgModule` to organize and compile components. Angular 15+ introduced stable standalone component support.

**Decision**: All components in FurnitureShop are standalone (`standalone: true`). No `NgModule` declarations are used. The app bootstraps via `bootstrapApplication`.

**Rationale**:
- Standalone components have simpler mental model — each component is self-contained with explicit imports.
- Better tree-shaking: Angular's compiler can statically analyze which directives and pipes are reachable from each component without resolving module boundaries.
- `withComponentInputBinding()` and functional guards/interceptors are modern Angular APIs that integrate naturally with the standalone model.
- Angular's official guidance as of v17 recommends standalone as the default.

**Consequences**:
- Positive: Smaller bundles, cleaner architecture, easier code splitting.
- Negative: Cannot easily integrate third-party NgModule-based libraries without wrapping. Team members familiar only with NgModule pattern face a learning curve.

---

### ADR-005: Soft Delete for Products (is_active Flag)

**Context**: When an admin removes a product, historical orders reference that product via `order_items.product_id`. Hard deleting the product would break referential integrity or require `SET NULL` on the FK.

**Decision**: Products are never hard-deleted. The `DELETE /api/admin/products/:id` endpoint sets `is_active = FALSE`. All customer-facing queries include `WHERE is_active = TRUE`. `order_items.product_id` is set to `SET NULL ON DELETE` as a safety net, but actual deletion is prevented by the soft-delete pattern.

**Rationale**:
- Preserves referential integrity for order history.
- Allows admins to reactivate a product without data loss.
- `order_items` carries price, name, and image snapshots, so historical order display does not depend on the product row — the snapshot fields are the source of truth for historical orders.

**Consequences**:
- Positive: Full order history preservation, reversible product removal.
- Negative: `is_active = TRUE` must be included in every product query (could be enforced by a database view as a future improvement). Database storage is not reclaimed on product removal.

---

### ADR-006: JSONB for Product Attributes and Images

**Context**: Furniture products have variable attributes (a sofa has `color`, `material`, `dimensions`; a desk lamp may have `wattage`, `bulb_type`). Images are an ordered list of URLs.

**Decision**: Use PostgreSQL JSONB columns for `products.attributes` (object) and `products.images` (array).

**Rationale**:
- Avoids an EAV (Entity-Attribute-Value) pattern which would require complex joins for attribute retrieval.
- Avoids over-engineering a separate `product_images` table for a simple ordered URL list.
- JSONB is stored in a binary-decomposed format, supports GIN indexing for containment queries, and allows `->` / `->>` operators for field extraction in SQL (used for `images->0` in the order controller).
- The product catalog schema is unlikely to require attribute-level filtering (e.g., "find all products where color='red'") in the current feature set.

**Consequences**:
- Positive: Flexible schema per product type, simple queries for full attribute retrieval.
- Negative: No column-level constraints on attribute fields (e.g., can't enforce that `dimensions` is a number). If attribute-level filtering or indexing becomes necessary, GIN indexes or schema refactoring would be required.

---

## 8. Performance Considerations

### 8.1 Pagination Strategy

The product listing API implements offset-based pagination:

```sql
SELECT ... FROM products p ...
ORDER BY p.created_at DESC
LIMIT $n OFFSET $m
```

Parameters are computed from the `page` and `limit` query string values:

```
offset = (page - 1) * limit
```

The response includes a `pagination` object:
```json
{
  "products": [...],
  "pagination": {
    "total": 120,
    "page": 2,
    "limit": 12,
    "pages": 10
  }
}
```

The total count is obtained via a separate `COUNT(*)` query on the same `WHERE` clause before the data fetch. This allows the frontend to render page navigation controls.

**Limitation**: Offset pagination degrades for very large offsets (e.g., page 500 of 1000) because PostgreSQL must scan and discard offset rows. For the current product catalog size this is not a concern. Keyset pagination (cursor-based) would be a future improvement for high-volume catalogs.

### 8.2 Database Indexing and Query Performance

The following query patterns are covered by dedicated indexes:

| Query Pattern | Covering Index |
|---|---|
| `WHERE is_active = TRUE` on all product listings | `idx_products_is_active` |
| `WHERE category_id = $n` for category filter | `idx_products_category` |
| `WHERE slug = $1` for product detail | `idx_products_slug` (also UNIQUE) |
| `WHERE user_id = $1` on cart_items | `idx_cart_items_user` |
| `WHERE user_id = $1` on orders | `idx_orders_user` |
| `WHERE order_id = $1` on order_items | `idx_order_items_order` |
| `WHERE status = $1` on orders (admin filter) | `idx_orders_status` |

The composite product listing query joins `products` and `categories` and filters on `is_active`, `category_id`, and optionally `price` range. The query planner will use `idx_products_is_active` or `idx_products_category` depending on selectivity. For most catalogs, the category index is more selective and will be chosen when a category filter is applied.

### 8.3 FOR UPDATE Locking Pattern

The order creation transaction uses `SELECT ... FOR UPDATE` to prevent race conditions on stock:

```sql
SELECT id, name, stock_quantity
FROM products
WHERE id = ANY($1)
FOR UPDATE
```

This acquires exclusive row-level locks on each product row involved in the order. If two users simultaneously check out with the same product:

1. Transaction A acquires `FOR UPDATE` lock on the product row.
2. Transaction B issues `FOR UPDATE` and blocks (waits).
3. Transaction A validates stock, creates the order, decrements stock, commits, releases lock.
4. Transaction B proceeds, re-reads the now-decremented stock value, validates again.
5. If stock is now insufficient, Transaction B rolls back with a `400 Insufficient stock` response.

This prevents overselling without requiring application-level optimistic locking or retry loops. The locks are held only for the duration of the transaction, which is brief (a few milliseconds of in-memory computation + sequential inserts).

### 8.4 Connection Pool

`config/db.ts` creates a single `Pool` instance shared across the process lifetime. The `pg.Pool` maintains a pool of reusable connections (default maximum: 10). Controller functions that do not need transactions call the shared `query(text, params)` wrapper, which acquires a connection from the pool, executes the query, and returns the connection. The `createOrder` controller uses `pool.connect()` to acquire a dedicated connection for the transaction duration.

In development mode, the `query` wrapper logs query text (truncated to 80 chars), execution duration, and row count to the console, providing visibility into slow queries during development.

### 8.5 Nginx gzip Compression

The production Nginx configuration enables gzip compression for text-based content types:

```
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
gzip_min_length 1024;
```

Angular's production JavaScript bundles typically compress to 20-30% of their original size under gzip, significantly reducing transfer time for first-time visitors. The `gzip_min_length 1024` threshold avoids compressing small responses where compression overhead exceeds savings.

### 8.6 Angular Production Build Optimizations

`npm run build:prod` invokes `ng build` with production optimizations:
- **Tree-shaking**: Dead code from unused Angular features and third-party libraries is eliminated.
- **Minification**: JavaScript and CSS are minified.
- **Content hashing**: Asset filenames include a hash of their content (e.g., `main.a1b2c3d4.js`), enabling the 1-year immutable cache policy in Nginx.
- **Ahead-of-Time (AOT) compilation**: Angular templates are compiled at build time rather than at runtime in the browser, eliminating the template compiler from the production bundle and reducing startup time.

---

*End of Architecture Document*

*This document reflects the system as of version 1.0 (2026-03-05). It should be updated when significant architectural changes are made to the system.*
