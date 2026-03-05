# FurnitureShop — Requirements Specification

**Version**: 1.0
**Date**: 2026-03-05
**Author**: Business Analyst Agent
**Status**: Approved

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Functional Requirements](#2-functional-requirements)
   - 2.1 Authentication & User Management
   - 2.2 Product Catalog
   - 2.3 Shopping Cart
   - 2.4 Order Management
   - 2.5 Admin Panel
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [Data Model](#4-data-model)
5. [API Specification](#5-api-specification)
6. [User Flows](#6-user-flows)
7. [Constraints & Assumptions](#7-constraints--assumptions)

---

## 1. Introduction

### 1.1 Purpose

This Requirements Specification document defines the complete functional and non-functional requirements for the **FurnitureShop** e-commerce platform. It serves as the authoritative reference for development, testing, and stakeholder validation. All features described herein represent the Minimum Viable Product (MVP) scope for the initial production release.

### 1.2 Scope

FurnitureShop is a web-based e-commerce platform that enables customers to browse, search, and purchase furniture products online. The system supports two distinct user roles:

- **Customer**: Browses catalog, manages personal cart, places orders, and tracks order history.
- **Admin**: Manages the product catalog (create, update, soft-delete), and manages all customer orders (status updates).

The platform is a Single Page Application (SPA) with a RESTful backend API, backed by a relational database. It is deployed on a cloud VPS with HTTPS enforcement and automatic CI/CD via GitHub Actions.

Out of scope for this version:
- Payment gateway integration (orders are created without real-time payment processing)
- Product reviews and ratings
- Discount codes and promotions
- Multi-vendor / marketplace support
- Mobile native application

### 1.3 Intended Audience

| Audience | Purpose |
|---|---|
| Frontend Developers | Understand UI behavior, data contracts, and user flows |
| Backend Developers | Implement API endpoints, business logic, and data persistence |
| QA Engineers | Derive test cases from acceptance criteria and business rules |
| DevOps Engineers | Understand deployment requirements and infrastructure constraints |
| Product Owner / PM | Validate scope, prioritize backlog, and track feature completion |
| Business Stakeholders | Review functionality and sign off on feature completeness |

### 1.4 Definitions and Acronyms

| Term | Definition |
|---|---|
| SPA | Single Page Application — a web app that loads once and updates dynamically |
| JWT | JSON Web Token — a signed token used for stateless authentication |
| CRUD | Create, Read, Update, Delete — standard data operations |
| SKU | Stock Keeping Unit — unique identifier for a product variant |
| Slug | URL-friendly string derived from a name (e.g., "ghe-sofa-boc-nhung") |
| OOS | Out of Stock — a product with `stock_quantity = 0` |
| Soft Delete | Marking a record as inactive (`is_active = false`) rather than physically removing it |
| AC | Acceptance Criteria — conditions that must be met for a user story to be complete |
| BR | Business Rule — a constraint or policy enforced by the system |
| UUID | Universally Unique Identifier — used as primary keys for users, products, etc. |
| VNĐ | Vietnamese Dong — the currency used for all prices on the platform |
| Admin | A user with `role = 'admin'` who has elevated privileges |
| Customer | A registered user with `role = 'customer'` |

### 1.5 References

- `CLAUDE.md` — Project architecture and development guide
- `.claude/agents/ba.md` — Business Analyst agent role definition
- `database/migrations/001_init.sql` — Canonical database schema
- Angular 17 Standalone Component documentation
- Express.js API documentation

---

## 2. Functional Requirements

### 2.1 Authentication & User Management

#### 2.1.1 Feature Description

The authentication module allows users to create accounts, log in, and maintain sessions across browser sessions. The system uses JWT-based stateless authentication. Tokens are stored in `localStorage` and automatically attached to all API requests via an HTTP interceptor. On application initialization, the stored token is decoded to restore the session without requiring a re-login.

Two roles exist: `customer` (default for all registrations) and `admin` (seeded directly into the database). There is no self-service admin registration flow — admins are provisioned manually.

#### 2.1.2 User Stories

**US-AUTH-01: User Registration**

```
Given a visitor is on the registration page
  And they provide a valid name, email address, and password
When they submit the registration form
Then the system creates a new user account with role = 'customer'
  And returns a JWT token and user object
  And the user is redirected to the home page as a logged-in user
```

**US-AUTH-02: User Login**

```
Given a registered user is on the login page
  And they enter their correct email and password
When they submit the login form
Then the system validates the credentials
  And returns a JWT token and user object
  And stores the token in localStorage
  And updates the Angular AuthService.currentUser signal
  And redirects the user to the home page (or the originally requested protected page)
```

**US-AUTH-03: Duplicate Email Prevention**

```
Given a visitor attempts to register
  And the provided email address already exists in the system
When they submit the registration form
Then the system rejects the request with HTTP 409 Conflict
  And displays an error message: "Email nay da duoc su dung"
  And the user remains on the registration page
```

**US-AUTH-04: Session Restoration on App Load**

```
Given a user has previously logged in and a JWT is present in localStorage
When the Angular application initializes
Then the system decodes the stored JWT
  And restores the currentUser signal without an additional API call
  And the user sees their authenticated state (navbar shows name, cart count, etc.)
```

**US-AUTH-05: Authentication State for Protected Routes**

```
Given an unauthenticated visitor attempts to navigate to /cart, /orders, or /checkout
When the Angular router evaluates the route guard (authGuard)
Then the user is redirected to /login
  And after successful login, they are redirected back to the originally requested URL
```

#### 2.1.3 Acceptance Criteria

1. `POST /api/auth/register` accepts `{ name, email, password }` and returns `{ token, user }` with HTTP 201.
2. `POST /api/auth/login` accepts `{ email, password }` and returns `{ token, user }` with HTTP 200.
3. Passwords are never stored in plaintext; they are hashed using bcrypt with a minimum work factor of 10.
4. JWT tokens contain the payload `{ id, email, role }` and are signed with `JWT_SECRET`.
5. Registering with a duplicate email returns HTTP 409 with a descriptive error message.
6. Logging in with an incorrect password returns HTTP 401.
7. `GET /api/auth/me` with a valid JWT returns the current user object (excluding `password_hash`).
8. `GET /api/auth/me` with an expired or invalid JWT returns HTTP 401.
9. The Angular `authGuard` redirects unauthenticated users to `/login`.
10. The Angular `adminGuard` redirects non-admin authenticated users to `/` (home).
11. The `authInterceptor` automatically appends `Authorization: Bearer <token>` to all outgoing HTTP requests when a token is present in `localStorage`.
12. Logging out clears `localStorage` and resets `AuthService.currentUser` to `null`.

#### 2.1.4 Business Rules

- BR-AUTH-01: Email addresses must be unique across all users.
- BR-AUTH-02: Passwords must be at least 8 characters long (enforced on the frontend; backend validates non-empty).
- BR-AUTH-03: All newly registered users receive the `customer` role. Admin role can only be assigned via database seeding or direct DB update.
- BR-AUTH-04: JWTs do not have a refresh mechanism in v1; a new login is required after expiry.
- BR-AUTH-05: User accounts cannot be deleted via any API endpoint in this version (referential integrity — orders reference users with `ON DELETE RESTRICT`).

---

### 2.2 Product Catalog

#### 2.2.1 Feature Description

The product catalog allows all visitors (authenticated or not) to browse, search, and filter furniture products. Products are organized into categories. Each product has a unique URL slug, price, stock quantity, images stored as a JSONB array, and flexible attributes (color, material, dimensions, weight) stored as JSONB. Soft-deleted products (`is_active = false`) are excluded from all public-facing queries.

#### 2.2.2 User Stories

**US-PROD-01: Browse Products with Pagination**

```
Given any visitor is on the /products page
When the page loads
Then the system displays a paginated list of all active products
  And each product card shows the product image, name, price, and category
  And pagination controls allow navigation between pages (default: 12 products per page)
```

**US-PROD-02: Filter Products by Category**

```
Given a visitor is on the /products page
When they select a category from the category filter
Then the product list updates to show only products belonging to that category
  And the page resets to page 1
  And the URL query string reflects the selected category (e.g., ?category=ghe-sofa)
```

**US-PROD-03: Search Products by Keyword**

```
Given a visitor types a keyword into the search box
When they submit the search (press Enter or click search icon)
Then the system performs a case-insensitive search on product name and description
  And the filtered results are displayed
  And an empty state message is shown if no products match
```

**US-PROD-04: Filter by Price Range**

```
Given a visitor sets a minimum and/or maximum price filter
When they apply the filter
Then only products within the specified price range are returned
  And the results can be combined with category and keyword filters simultaneously
```

**US-PROD-05: View Product Detail**

```
Given a visitor clicks on a product card
When they navigate to /products/:slug
Then the system displays the full product detail page
  And shows all product images (gallery), full description, price, stock status, and attributes
  And shows an "Add to Cart" button if stock_quantity > 0
  And shows an "Het hang" (out of stock) indicator if stock_quantity = 0
```

**US-PROD-06: View All Categories**

```
Given a visitor is on the home page or products page
When the page loads
Then the system retrieves all categories from the API
  And displays them as navigation filters or category cards
```

#### 2.2.3 Acceptance Criteria

1. `GET /api/products` returns only products where `is_active = true`.
2. `GET /api/products` supports query parameters: `category` (slug), `search` (string), `minPrice` (number), `maxPrice` (number), `page` (integer, default 1), `limit` (integer, default 12).
3. The response from `GET /api/products` includes a `total` count for pagination calculation.
4. `GET /api/products/:slug` returns a single product by its URL slug, including category name.
5. `GET /api/products/:slug` returns HTTP 404 if the slug does not exist or the product is inactive.
6. `GET /api/products/categories` returns all category records including id, name, slug, and image_url.
7. Search is case-insensitive and matches partial strings in both `name` and `description` fields.
8. Price filter returns products where `price >= minPrice AND price <= maxPrice`.
9. Products with `stock_quantity = 0` are still returned in listings but are clearly marked as out of stock on the frontend.
10. Product images are stored as a JSONB array; the first image in the array is the primary display image.
11. Product attributes (color, material, dimensions, weight) are stored in the `attributes` JSONB column and displayed on the product detail page.

#### 2.2.4 Business Rules

- BR-PROD-01: Every product must belong to one category. If a category is deleted, `category_id` is set to NULL (ON DELETE SET NULL) and the product remains visible.
- BR-PROD-02: Product slugs must be globally unique and URL-safe (lowercase, hyphens only).
- BR-PROD-03: Price must be greater than or equal to 0.
- BR-PROD-04: Stock quantity must be greater than or equal to 0 and cannot go negative.
- BR-PROD-05: Soft-deleted products (`is_active = false`) are invisible to customers but retained in the database to preserve order history integrity.
- BR-PROD-06: The default sort order for product listings is by `created_at DESC` (newest first).

---

### 2.3 Shopping Cart

#### 2.3.1 Feature Description

The shopping cart is server-side, persisted in the `cart_items` table, and tied to the authenticated user's account. This means the cart persists across devices and browser sessions. Adding the same product multiple times updates the quantity rather than creating duplicate entries (upsert behavior). The cart is automatically cleared after a successful order placement.

#### 2.3.2 User Stories

**US-CART-01: Add Item to Cart**

```
Given an authenticated customer is viewing a product detail page
  And the product has stock_quantity > 0
When they click the "Them vao gio hang" button
Then the system adds the product to the user's cart with quantity 1
  And if the product already exists in the cart, its quantity is incremented
  And the navbar cart item count badge updates reactively
  And a success notification is displayed
```

**US-CART-02: View Cart Contents**

```
Given an authenticated customer navigates to /cart
When the page loads
Then the system fetches the user's cart from the API
  And displays each cart item with: product image, name, unit price, quantity, and line subtotal
  And displays the cart total at the bottom
  And shows an empty cart message if no items are present
```

**US-CART-03: Update Item Quantity**

```
Given an authenticated customer is on the /cart page
  And they change the quantity input for a cart item
When they confirm the quantity change
Then the system sends a PUT request to update the cart item quantity
  And the line subtotal and cart total recalculate immediately
  And if the new quantity is 0, the item is removed from the cart
```

**US-CART-04: Remove Item from Cart**

```
Given an authenticated customer is on the /cart page
When they click the remove/delete button for a cart item
Then the system sends a DELETE request for that cart item
  And the item is removed from the cart display
  And the cart total recalculates
  And the navbar cart count badge decrements
```

**US-CART-05: Cart Persistence Across Sessions**

```
Given an authenticated customer added items to their cart during a previous session
When they log in again (from any device or browser)
Then the system retrieves their cart from the server
  And displays all previously added items with correct quantities
```

**US-CART-06: Prevent Adding OOS Items**

```
Given a customer attempts to add a product to their cart
  And the product has stock_quantity = 0
When the add-to-cart action is triggered
Then the system rejects the request with an appropriate error
  And the "Add to Cart" button is disabled or hidden on the product detail page
```

#### 2.3.3 Acceptance Criteria

1. `GET /api/cart` requires JWT authentication; returns HTTP 401 if not authenticated.
2. `GET /api/cart` returns all cart items for the authenticated user, including full product details (name, price, image).
3. `POST /api/cart` accepts `{ productId, quantity }` and uses an upsert strategy: if the product already exists in the user's cart, the quantity is summed.
4. `PUT /api/cart/:itemId` accepts `{ quantity }` and updates the specified cart item.
5. `DELETE /api/cart/:itemId` removes the specified item from the cart.
6. All cart operations are scoped to the authenticated user; users cannot access or modify another user's cart items.
7. Adding an out-of-stock product to the cart returns HTTP 400 with error `"San pham het hang"`.
8. Cart item quantity must be a positive integer (minimum 1).
9. The `cart_items` table enforces a unique constraint on `(user_id, product_id)` to prevent duplicate entries.
10. The Angular `CartService.itemCount` signal reflects the total number of cart line items and is displayed in the navbar.

#### 2.3.4 Business Rules

- BR-CART-01: Only authenticated users can have a cart. Unauthenticated users attempting cart operations are redirected to login.
- BR-CART-02: Cart is not quantity-validated against stock on add; stock is validated at order placement time.
- BR-CART-03: The server-side upsert uses `ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity`.
- BR-CART-04: When an order is placed, the entire cart is cleared atomically within the same database transaction.
- BR-CART-05: Deleting a user account (not currently supported) would cascade-delete all their cart items.

---

### 2.4 Order Management

#### 2.4.1 Feature Description

Order placement converts the user's current cart into a permanent, immutable order record. During placement, the system atomically: (1) creates the order with a shipping address snapshot, (2) inserts order items capturing the product name, image, and price at the time of purchase, (3) decrements stock for each ordered product, and (4) clears the cart. Orders cannot be modified after creation. Status transitions are managed exclusively by admins.

#### 2.4.2 User Stories

**US-ORDER-01: Place an Order (Checkout)**

```
Given an authenticated customer has items in their cart
  And they navigate to /checkout
When they fill in the shipping address (full name, phone, address, city, optional note)
  And they click "Dat hang"
Then the system validates all required shipping fields
  And creates an order with status 'pending'
  And snapshots the product name, image, and unit price for each item
  And decrements the stock quantity for each product ordered
  And clears the user's cart
  And redirects the customer to their orders page with a success message
```

**US-ORDER-02: View Order History**

```
Given an authenticated customer navigates to /orders
When the page loads
Then the system retrieves all of the user's orders ordered by created_at DESC
  And displays each order with: order ID (or number), date, status, and total amount
  And each order can be expanded or linked to show the full item list
```

**US-ORDER-03: Order Status Lifecycle (Admin)**

```
Given an admin is on the order management page
  And an order has status 'pending'
When the admin updates the order status to 'processing'
Then the system persists the new status
  And the updated status is visible to both admin and the customer in their order list
```

**US-ORDER-04: Out-of-Stock Validation at Checkout**

```
Given a customer attempts to place an order
  And one or more products in their cart have insufficient stock
When the checkout is submitted
Then the system rejects the order with HTTP 400
  And returns an error message identifying the out-of-stock product(s)
  And no stock is decremented and no order is created
```

**US-ORDER-05: Empty Cart Checkout Prevention**

```
Given an authenticated customer navigates to /checkout
  And their cart is empty
When they attempt to place the order
Then the system returns HTTP 400 with error "Gio hang trong"
  And no order record is created
```

#### 2.4.3 Acceptance Criteria

1. `POST /api/orders` requires JWT authentication and a non-empty cart.
2. `POST /api/orders` accepts a `shippingAddress` object: `{ fullName, phone, address, city, note? }`.
3. All required shipping address fields (`fullName`, `phone`, `address`, `city`) must be present; otherwise HTTP 400 is returned.
4. Order creation runs inside a single PostgreSQL transaction; if any step fails, the entire transaction is rolled back.
5. `order_items` records capture `product_name`, `product_image`, `unit_price`, and `quantity` as snapshots independent of future product edits.
6. `subtotal` in `order_items` equals `unit_price * quantity`.
7. `total_amount` in `orders` equals the sum of all `order_items.subtotal` values.
8. Stock quantity for each product is decremented by the ordered quantity within the transaction.
9. If any product's stock would go below 0 after decrement, the order is rejected with HTTP 400.
10. The user's `cart_items` are deleted within the same transaction as order creation.
11. `GET /api/orders` returns only the authenticated user's own orders.
12. Order status must follow the allowed values: `pending`, `processing`, `shipped`, `delivered`, `cancelled`.
13. `PUT /api/admin/orders/:id/status` is restricted to admin users.
14. The response from `POST /api/orders` includes the newly created order's `id` and `status`.

#### 2.4.4 Business Rules

- BR-ORDER-01: Orders are immutable once created. No endpoint exists for customers to modify or cancel an order in v1.
- BR-ORDER-02: Price is snapshotted at order time. Subsequent price changes to a product do not affect historical orders.
- BR-ORDER-03: Stock is decremented at order placement, not at payment confirmation (since no payment gateway exists in v1).
- BR-ORDER-04: The allowed status progression is: `pending` → `processing` → `shipped` → `delivered`. `cancelled` can be set from any status by admin.
- BR-ORDER-05: Users cannot delete their account if they have existing orders (enforced by `ON DELETE RESTRICT` on `orders.user_id`).
- BR-ORDER-06: All monetary values are stored as `DECIMAL(12, 2)` representing Vietnamese Dong (VNĐ) with 2 decimal places.

---

### 2.5 Admin Panel

#### 2.5.1 Feature Description

The admin panel is a protected area accessible only to users with `role = 'admin'`. It provides tools for managing the product catalog and monitoring/updating customer orders. Admin access is enforced at both the Angular route level (via `adminGuard`) and the API level (via `requireAdmin` middleware).

#### 2.5.2 User Stories

**US-ADMIN-01: Create a New Product**

```
Given an admin is logged in and navigates to the admin product management page
When they fill out the product form (name, category, description, price, stock, images, attributes)
  And submit the form
Then the system creates a new product record with a generated UUID and slug
  And the product is immediately visible in the public product catalog
  And the admin is shown a success confirmation
```

**US-ADMIN-02: Update an Existing Product**

```
Given an admin selects a product to edit
When they modify any product field (price, stock, description, etc.)
  And submit the update
Then the system persists the changes to the product record
  And the updated_at timestamp is refreshed via database trigger
  And the changes are immediately reflected in the public catalog
```

**US-ADMIN-03: Soft Delete a Product**

```
Given an admin selects a product to delete
When they confirm the delete action
Then the system sets is_active = false on the product record
  And the product no longer appears in any public-facing API responses
  And the product data is retained in the database to preserve historical order_items references
```

**US-ADMIN-04: View All Customer Orders**

```
Given an admin navigates to the order management section
When the page loads
Then the system retrieves all orders across all customers from the API
  And displays orders sorted by created_at DESC
  And shows order ID, customer name/email, total, status, and creation date
```

**US-ADMIN-05: Update Order Status**

```
Given an admin is viewing an order with status 'pending'
When they change the status to 'processing' (or any other valid status)
  And save the change
Then the system updates the order status in the database
  And the new status is reflected in both the admin view and the customer's order history
```

**US-ADMIN-06: Access Control Enforcement**

```
Given an authenticated user with role = 'customer' attempts to access /admin
When the Angular router evaluates the adminGuard
Then the user is redirected to the home page
  And any direct API call to /api/admin/* by a customer JWT returns HTTP 403 Forbidden
```

#### 2.5.3 Acceptance Criteria

1. `POST /api/admin/products` creates a product and returns HTTP 201 with the created product object.
2. `PUT /api/admin/products/:id` updates specified fields and returns HTTP 200 with the updated product.
3. `DELETE /api/admin/products/:id` sets `is_active = false` and returns HTTP 200.
4. `GET /api/admin/orders` returns all orders from all users, including customer name and email joined from the users table.
5. `PUT /api/admin/orders/:id/status` accepts `{ status }` and validates against allowed status values.
6. All `/api/admin/*` endpoints return HTTP 401 if no JWT is present.
7. All `/api/admin/*` endpoints return HTTP 403 if the JWT belongs to a `customer` role user.
8. The Angular `adminGuard` redirects non-admin users navigating to `/admin/**` routes to `/`.
9. Admin product form validation: name (required), price (required, >= 0), category (required), stock (required, >= 0).
10. Slug is auto-generated from the product name on the backend (URL-safe, lowercase, hyphenated).

#### 2.5.4 Business Rules

- BR-ADMIN-01: Admin credentials are seeded via `database/seeds/` scripts. Default: `admin@furnitureshop.vn` / `Admin@123`.
- BR-ADMIN-02: There is no UI for creating admin accounts. Admin provisioning is an operational task.
- BR-ADMIN-03: Soft deletion is irreversible via the API in v1 (no restore endpoint). Restoration requires direct database intervention.
- BR-ADMIN-04: The admin can update order status in any direction (e.g., `shipped` back to `processing`) to handle corrections. No strict state machine is enforced at the API level.

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Requirement | Target |
|---|---|
| API response time (p95) | < 500ms under normal load |
| Product list page load | < 2 seconds (including Angular hydration) |
| Database queries | All high-frequency queries use appropriate indexes |
| Concurrent users | System handles up to 100 concurrent users without degradation |
| Image loading | Product images are served from CDN or object storage (future); current: external URLs |

- NFR-PERF-01: The `GET /api/products` endpoint uses indexed columns (`category_id`, `is_active`, `slug`) to avoid full table scans.
- NFR-PERF-02: PostgreSQL connection pooling is enabled via the `pg` Pool to avoid connection overhead per request.
- NFR-PERF-03: Angular lazy-loaded routes ensure the initial bundle size is minimized; admin module is not downloaded by customers.

### 3.2 Security

- NFR-SEC-01: All API communication is over HTTPS (enforced by Nginx in production with Let's Encrypt SSL certificates).
- NFR-SEC-02: Passwords are hashed with bcrypt (minimum rounds: 10) before storage. Plaintext passwords are never logged or stored.
- NFR-SEC-03: All database queries use parameterized queries (via the `pg` library) to prevent SQL injection.
- NFR-SEC-04: JWT tokens are signed with a strong `JWT_SECRET` stored as an environment variable, never in source code.
- NFR-SEC-05: CORS is configured on the backend to allow requests only from the configured `FRONTEND_URL`.
- NFR-SEC-06: The `requireAdmin` middleware validates both the presence of a valid JWT and the `role = 'admin'` claim.
- NFR-SEC-07: Sensitive environment variables (`POSTGRES_PASSWORD`, `JWT_SECRET`, `VPS_SSH_KEY`) are stored as GitHub Secrets and never committed to the repository.
- NFR-SEC-08: HTTP security headers (e.g., `X-Content-Type-Options`, `X-Frame-Options`) are configured via Nginx.
- NFR-SEC-09: User `password_hash` is never returned in any API response.

### 3.3 Scalability

- NFR-SCALE-01: The stateless JWT authentication model allows horizontal scaling of the backend without shared session state.
- NFR-SCALE-02: The Docker Compose architecture supports moving to Docker Swarm or Kubernetes with minimal configuration changes.
- NFR-SCALE-03: The database schema uses UUIDs for primary keys on high-write tables (users, products, cart_items, orders) to avoid sequence contention in a distributed environment.
- NFR-SCALE-04: Category IDs use SERIAL (integer sequences) as they are low-frequency and admin-only write operations.

### 3.4 Availability

- NFR-AVAIL-01: The production system targets 99.5% monthly uptime.
- NFR-AVAIL-02: The CI/CD pipeline deploys with zero-downtime rolling updates (Docker Compose pull → up with `--no-deps`).
- NFR-AVAIL-03: A health check endpoint (`GET /api/health`) is available for uptime monitoring tools to probe.
- NFR-AVAIL-04: PostgreSQL data is persisted on a named Docker volume to survive container restarts.
- NFR-AVAIL-05: Nginx acts as a reverse proxy, buffering requests and providing a layer of protection against backend restarts.

### 3.5 Usability

- NFR-USE-01: The UI is in Vietnamese, targeting Vietnamese-speaking customers. All error messages, labels, and notifications are in Vietnamese.
- NFR-USE-02: The application is responsive and must function correctly on screens wider than 375px (mobile), 768px (tablet), and 1024px+ (desktop).
- NFR-USE-03: Form validation errors are displayed inline next to the relevant field, not only as a top-level alert.
- NFR-USE-04: Loading states (spinners) are shown during API calls to communicate system activity to the user.
- NFR-USE-05: Empty states (no products, empty cart, no orders) display a helpful message with a call-to-action link.
- NFR-USE-06: The cart item count badge in the navbar updates immediately (without a page reload) upon cart modifications.
- NFR-USE-07: The application uses Angular signals for reactive state to ensure the UI stays consistent with the underlying data without manual change detection calls.

### 3.6 Maintainability

- NFR-MAINT-01: Backend code is written in TypeScript with strict type checking enabled.
- NFR-MAINT-02: Database schema changes are managed via numbered migration files in `database/migrations/`.
- NFR-MAINT-03: Seed data is separate from migration scripts, allowing database re-initialization without re-running seeds.
- NFR-MAINT-04: The backend follows a Controller → Route → Express pattern with a clear separation of concerns.

---

## 4. Data Model

### 4.1 Entity Descriptions

#### 4.1.1 users

Stores all user accounts for both customers and administrators.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| name | VARCHAR(100) | NOT NULL | User's display name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email address |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash of the password |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'customer', CHECK IN ('customer','admin') | User role |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp (auto-updated via trigger) |

#### 4.1.2 categories

Organizes products into named groups for filtering and navigation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | SERIAL | PK | Auto-incrementing integer ID |
| name | VARCHAR(100) | NOT NULL | Display name (e.g., "Ghe Sofa") |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe identifier (e.g., "ghe-sofa") |
| description | TEXT | — | Optional category description |
| image_url | VARCHAR(500) | — | URL to category banner/icon image |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

#### 4.1.3 products

Core catalog entity containing all purchasable furniture items.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| category_id | INTEGER | FK → categories(id) ON DELETE SET NULL | Product category |
| name | VARCHAR(255) | NOT NULL | Product display name |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | URL-safe identifier for routing |
| description | TEXT | — | Full product description |
| price | DECIMAL(12,2) | NOT NULL, CHECK >= 0 | Sale price in VNĐ |
| stock_quantity | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | Available inventory count |
| images | JSONB | DEFAULT '[]' | Array of image URL strings |
| attributes | JSONB | DEFAULT '{}' | Key-value pairs: color, material, dimensions, weight |
| is_active | BOOLEAN | DEFAULT TRUE | Soft-delete flag |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp (auto-updated via trigger) |

#### 4.1.4 cart_items

Persists the contents of each user's shopping cart server-side.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Owning user |
| product_id | UUID | NOT NULL, FK → products(id) ON DELETE CASCADE | Referenced product |
| quantity | INTEGER | NOT NULL, DEFAULT 1, CHECK > 0 | Number of units in cart |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | When item was first added |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | When quantity was last changed |
| — | UNIQUE | (user_id, product_id) | Prevents duplicate product rows per user |

#### 4.1.5 orders

Represents a completed purchase. Immutable after creation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE RESTRICT | Customer who placed the order |
| status | VARCHAR(30) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','processing','shipped','delivered','cancelled') | Order lifecycle status |
| total_amount | DECIMAL(12,2) | NOT NULL | Sum of all order_items.subtotal values |
| shipping_address | JSONB | NOT NULL | Snapshot: { fullName, phone, address, city, note } |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Order placement timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last status change timestamp |

#### 4.1.6 order_items

Line items belonging to an order. Stores price and product data as a snapshot at purchase time.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique identifier |
| order_id | UUID | NOT NULL, FK → orders(id) ON DELETE CASCADE | Parent order |
| product_id | UUID | FK → products(id) ON DELETE SET NULL | Original product (nullable if deleted) |
| product_name | VARCHAR(255) | NOT NULL | Snapshot of product name at purchase time |
| product_image | VARCHAR(500) | — | Snapshot of primary product image URL |
| unit_price | DECIMAL(12,2) | NOT NULL | Snapshot of product price at purchase time |
| quantity | INTEGER | NOT NULL, CHECK > 0 | Number of units purchased |
| subtotal | DECIMAL(12,2) | NOT NULL | unit_price * quantity |

### 4.2 Entity-Relationship Diagram

```
+------------------+       +---------------------+       +------------------+
|     categories   |       |      products        |       |      users       |
+------------------+       +---------------------+       +------------------+
| PK id (SERIAL)   |<------| PK id (UUID)         |       | PK id (UUID)     |
|    name          |  FK   | FK category_id       |       |    name          |
|    slug          |       |    name              |       |    email (UNIQUE)|
|    description   |       |    slug (UNIQUE)     |       |    password_hash |
|    image_url     |       |    description       |       |    role          |
|    created_at    |       |    price             |       |    created_at    |
+------------------+       |    stock_quantity    |       |    updated_at    |
                           |    images (JSONB)    |       +------------------+
                           |    attributes (JSONB)|              |         |
                           |    is_active         |              |         |
                           |    created_at        |              |         |
                           |    updated_at        |              |         |
                           +---------------------+               |         |
                                    |                            |         |
                          +---------+----------+    +-----------+    +----+--------+
                          |     cart_items     |    |                |    orders    |
                          +--------------------+    |                +--------------+
                          | PK id (UUID)       |<---+  FK user_id   | PK id (UUID) |
                          | FK user_id  -------+--------------------| FK user_id   |
                          | FK product_id      |                    |    status    |
                          |    quantity        |                    | total_amount |
                          |    created_at      |                    | shipping_    |
                          |    updated_at      |                    |   address    |
                          | UNIQUE(user,prod)  |                    |   (JSONB)    |
                          +--------------------+                    | created_at   |
                                                                    | updated_at   |
                                                                    +--------------+
                                                                           |
                                                              +------------+-----------+
                                                              |       order_items      |
                                                              +------------------------+
                                                              | PK id (UUID)           |
                                                              | FK order_id            |
                                                              | FK product_id (nullable)|
                                                              |    product_name (snap) |
                                                              |    product_image (snap)|
                                                              |    unit_price (snap)   |
                                                              |    quantity            |
                                                              |    subtotal            |
                                                              +------------------------+
```

### 4.3 Index Summary

| Index Name | Table | Column(s) | Purpose |
|---|---|---|---|
| idx_products_category | products | category_id | Fast category filter queries |
| idx_products_is_active | products | is_active | Fast active product filter |
| idx_products_slug | products | slug | Fast product detail lookup by slug |
| idx_cart_items_user | cart_items | user_id | Fast cart retrieval per user |
| idx_orders_user | orders | user_id | Fast order history per user |
| idx_orders_status | orders | status | Fast admin order filtering by status |
| idx_order_items_order | order_items | order_id | Fast order item retrieval per order |

---

## 5. API Specification

### 5.1 Global Conventions

- **Base URL**: `/api`
- **Content-Type**: All requests and responses use `application/json`
- **Authentication**: Protected endpoints require `Authorization: Bearer <JWT>` header
- **Error format**: `{ "error": "<message string>" }`
- **Success format**: Varies per endpoint (see below)
- **Timestamps**: ISO 8601 format with timezone (`2026-03-05T10:30:00.000Z`)

### 5.2 HTTP Status Code Reference

| Code | Meaning | Common Scenarios |
|---|---|---|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Missing required fields, validation failure, OOS |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT but insufficient role (customer accessing admin) |
| 404 | Not Found | Resource does not exist or is inactive |
| 409 | Conflict | Duplicate email on registration |
| 500 | Internal Server Error | Unhandled server-side error |

### 5.3 Endpoint Reference

#### Authentication Endpoints

---

**POST /api/auth/register**

| Field | Value |
|---|---|
| Auth Required | No |
| Description | Register a new customer account |

Request Body:
```json
{
  "name": "Nguyen Van A",
  "email": "nguyenvana@example.com",
  "password": "MatKhau@123"
}
```

Success Response (201):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-v4",
    "name": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "role": "customer",
    "created_at": "2026-03-05T10:00:00.000Z"
  }
}
```

Error Responses:
- `400` — `{ "error": "Name, email, and password are required" }`
- `409` — `{ "error": "Email nay da duoc su dung" }`

---

**POST /api/auth/login**

| Field | Value |
|---|---|
| Auth Required | No |
| Description | Authenticate and receive a JWT token |

Request Body:
```json
{
  "email": "nguyenvana@example.com",
  "password": "MatKhau@123"
}
```

Success Response (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-v4",
    "name": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "role": "customer"
  }
}
```

Error Responses:
- `400` — `{ "error": "Email and password are required" }`
- `401` — `{ "error": "Email hoac mat khau khong dung" }`

---

**GET /api/auth/me**

| Field | Value |
|---|---|
| Auth Required | JWT (customer or admin) |
| Description | Get the currently authenticated user's profile |

Success Response (200):
```json
{
  "user": {
    "id": "uuid-v4",
    "name": "Nguyen Van A",
    "email": "nguyenvana@example.com",
    "role": "customer",
    "created_at": "2026-03-05T10:00:00.000Z"
  }
}
```

Error Responses:
- `401` — `{ "error": "Unauthorized" }`

---

#### Product Endpoints

---

**GET /api/products**

| Field | Value |
|---|---|
| Auth Required | No |
| Description | List active products with optional filtering and pagination |

Query Parameters:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| category | string | No | — | Category slug to filter by |
| search | string | No | — | Keyword search on name and description |
| minPrice | number | No | — | Minimum price (inclusive) |
| maxPrice | number | No | — | Maximum price (inclusive) |
| page | integer | No | 1 | Page number (1-indexed) |
| limit | integer | No | 12 | Items per page |

Success Response (200):
```json
{
  "products": [
    {
      "id": "uuid-v4",
      "name": "Ghe Sofa Boc Nhung",
      "slug": "ghe-sofa-boc-nhung",
      "price": "5990000.00",
      "stock_quantity": 15,
      "images": ["https://example.com/img1.jpg"],
      "category_id": 1,
      "category_name": "Ghe Sofa",
      "is_active": true
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 12,
  "totalPages": 4
}
```

---

**GET /api/products/categories**

| Field | Value |
|---|---|
| Auth Required | No |
| Description | List all product categories |

Success Response (200):
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Ghe Sofa",
      "slug": "ghe-sofa",
      "description": "Cac loai ghe sofa cao cap",
      "image_url": "https://example.com/sofa.jpg"
    }
  ]
}
```

---

**GET /api/products/:slug**

| Field | Value |
|---|---|
| Auth Required | No |
| Description | Get full product detail by slug |

Success Response (200):
```json
{
  "product": {
    "id": "uuid-v4",
    "name": "Ghe Sofa Boc Nhung",
    "slug": "ghe-sofa-boc-nhung",
    "description": "Ghe sofa cao cap...",
    "price": "5990000.00",
    "stock_quantity": 15,
    "images": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    "attributes": {
      "color": "Xanh Navy",
      "material": "Nhung cao cap",
      "dimensions": "200x90x85 cm",
      "weight": "45 kg"
    },
    "category_id": 1,
    "category_name": "Ghe Sofa",
    "is_active": true,
    "created_at": "2026-01-15T08:00:00.000Z",
    "updated_at": "2026-02-20T14:30:00.000Z"
  }
}
```

Error Responses:
- `404` — `{ "error": "San pham khong ton tai" }`

---

#### Cart Endpoints

---

**GET /api/cart**

| Field | Value |
|---|---|
| Auth Required | JWT (customer) |
| Description | Retrieve the authenticated user's cart with product details |

Success Response (200):
```json
{
  "items": [
    {
      "id": "cart-item-uuid",
      "product_id": "product-uuid",
      "product_name": "Ghe Sofa Boc Nhung",
      "product_image": "https://example.com/img1.jpg",
      "unit_price": "5990000.00",
      "quantity": 2,
      "subtotal": "11980000.00"
    }
  ],
  "total": "11980000.00"
}
```

---

**POST /api/cart**

| Field | Value |
|---|---|
| Auth Required | JWT (customer) |
| Description | Add a product to the cart (upsert by product) |

Request Body:
```json
{
  "productId": "product-uuid",
  "quantity": 1
}
```

Success Response (200 or 201):
```json
{
  "message": "Da them vao gio hang",
  "item": {
    "id": "cart-item-uuid",
    "product_id": "product-uuid",
    "quantity": 3
  }
}
```

Error Responses:
- `400` — `{ "error": "San pham het hang" }`
- `400` — `{ "error": "productId and quantity are required" }`
- `404` — `{ "error": "San pham khong ton tai" }`

---

**PUT /api/cart/:itemId**

| Field | Value |
|---|---|
| Auth Required | JWT (customer) |
| Description | Update quantity of a cart item |

Request Body:
```json
{
  "quantity": 3
}
```

Success Response (200):
```json
{
  "message": "Cap nhat thanh cong",
  "item": {
    "id": "cart-item-uuid",
    "quantity": 3
  }
}
```

Error Responses:
- `400` — `{ "error": "quantity must be a positive integer" }`
- `404` — `{ "error": "Cart item not found" }`

---

**DELETE /api/cart/:itemId**

| Field | Value |
|---|---|
| Auth Required | JWT (customer) |
| Description | Remove an item from the cart |

Success Response (200):
```json
{
  "message": "Da xoa khoi gio hang"
}
```

Error Responses:
- `404` — `{ "error": "Cart item not found" }`

---

#### Order Endpoints

---

**POST /api/orders**

| Field | Value |
|---|---|
| Auth Required | JWT (customer) |
| Description | Place an order from the current cart contents |

Request Body:
```json
{
  "shippingAddress": {
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "address": "123 Duong Le Loi",
    "city": "Ho Chi Minh City",
    "note": "Giao gio hanh chinh"
  }
}
```

Success Response (201):
```json
{
  "message": "Dat hang thanh cong",
  "order": {
    "id": "order-uuid",
    "status": "pending",
    "total_amount": "11980000.00",
    "created_at": "2026-03-05T10:00:00.000Z"
  }
}
```

Error Responses:
- `400` — `{ "error": "Gio hang trong" }`
- `400` — `{ "error": "fullName, phone, address, city are required" }`
- `400` — `{ "error": "San pham 'Ghe Sofa Boc Nhung' da het hang" }`

---

**GET /api/orders**

| Field | Value |
|---|---|
| Auth Required | JWT (customer) |
| Description | Retrieve the authenticated user's order history |

Success Response (200):
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "status": "processing",
      "total_amount": "11980000.00",
      "shipping_address": {
        "fullName": "Nguyen Van A",
        "phone": "0901234567",
        "address": "123 Duong Le Loi",
        "city": "Ho Chi Minh City",
        "note": ""
      },
      "items": [
        {
          "product_name": "Ghe Sofa Boc Nhung",
          "product_image": "https://example.com/img1.jpg",
          "unit_price": "5990000.00",
          "quantity": 2,
          "subtotal": "11980000.00"
        }
      ],
      "created_at": "2026-03-05T10:00:00.000Z"
    }
  ]
}
```

---

#### Admin Endpoints

---

**POST /api/admin/products**

| Field | Value |
|---|---|
| Auth Required | JWT (admin role) |
| Description | Create a new product |

Request Body:
```json
{
  "name": "Ban An Go Soi",
  "categoryId": 2,
  "description": "Ban an go soi nguyen khoi...",
  "price": 8500000,
  "stockQuantity": 10,
  "images": ["https://example.com/ban-an.jpg"],
  "attributes": {
    "color": "Mau go tu nhien",
    "material": "Go soi",
    "dimensions": "160x80x75 cm",
    "weight": "60 kg"
  }
}
```

Success Response (201):
```json
{
  "product": {
    "id": "new-product-uuid",
    "slug": "ban-an-go-soi",
    "name": "Ban An Go Soi",
    "price": "8500000.00",
    "stock_quantity": 10,
    "is_active": true
  }
}
```

Error Responses:
- `400` — `{ "error": "name, categoryId, price, and stockQuantity are required" }`
- `403` — `{ "error": "Forbidden: Admin access required" }`

---

**PUT /api/admin/products/:id**

| Field | Value |
|---|---|
| Auth Required | JWT (admin role) |
| Description | Update an existing product |

Request Body (all fields optional — partial update):
```json
{
  "price": 9000000,
  "stockQuantity": 8,
  "description": "Updated description..."
}
```

Success Response (200):
```json
{
  "product": {
    "id": "product-uuid",
    "price": "9000000.00",
    "stock_quantity": 8,
    "updated_at": "2026-03-05T11:00:00.000Z"
  }
}
```

Error Responses:
- `404` — `{ "error": "San pham khong ton tai" }`

---

**DELETE /api/admin/products/:id**

| Field | Value |
|---|---|
| Auth Required | JWT (admin role) |
| Description | Soft-delete a product (sets is_active = false) |

Success Response (200):
```json
{
  "message": "Da xoa san pham"
}
```

Error Responses:
- `404` — `{ "error": "San pham khong ton tai" }`

---

**GET /api/admin/orders**

| Field | Value |
|---|---|
| Auth Required | JWT (admin role) |
| Description | Retrieve all orders from all customers |

Success Response (200):
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "status": "pending",
      "total_amount": "11980000.00",
      "customer_name": "Nguyen Van A",
      "customer_email": "nguyenvana@example.com",
      "created_at": "2026-03-05T10:00:00.000Z"
    }
  ]
}
```

---

**PUT /api/admin/orders/:id/status**

| Field | Value |
|---|---|
| Auth Required | JWT (admin role) |
| Description | Update the status of an order |

Request Body:
```json
{
  "status": "processing"
}
```

Success Response (200):
```json
{
  "message": "Cap nhat trang thai don hang thanh cong",
  "order": {
    "id": "order-uuid",
    "status": "processing",
    "updated_at": "2026-03-05T11:30:00.000Z"
  }
}
```

Error Responses:
- `400` — `{ "error": "Invalid status value" }`
- `404` — `{ "error": "Don hang khong ton tai" }`

---

**GET /api/health**

| Field | Value |
|---|---|
| Auth Required | No |
| Description | Health check for uptime monitoring |

Success Response (200):
```json
{
  "status": "ok",
  "timestamp": "2026-03-05T10:00:00.000Z"
}
```

---

## 6. User Flows

### 6.1 Register and Login Flow

```
[Visitor]
    |
    v
 Open Browser --> Load FurnitureShop SPA
                         |
                    App initializes
                    AuthService checks localStorage for JWT
                         |
             +-----------+----------+
             |                      |
         JWT found             No JWT found
         Decode payload        (Guest mode)
         Restore session            |
             |                      |
             v                      v
    [Authenticated Home]    [Unauthenticated Home]
                                    |
                           User clicks "Dang ky"
                                    |
                            /auth/register
                                    |
                      Fill: name, email, password
                                    |
                            Submit form
                                    |
                    +---------------+---------------+
                    |                               |
              Validation OK                  Validation Error
                    |                         (inline errors)
                    v                               |
         POST /api/auth/register <-----------------+
                    |
         +----------+----------+
         |                     |
       201 OK               409 Conflict
       Save JWT              Show "Email da ton tai"
       Set currentUser             |
         |                    Stay on register page
         v
    Redirect to /
    [Authenticated Home]

---

[Registered User on /auth/login]
    |
    v
  Fill: email, password
    |
  Submit
    |
  POST /api/auth/login
    |
  +-------+--------+
  |                |
200 OK          401 Unauthorized
Save JWT        Show "Email hoac mat khau sai"
Set currentUser       |
  |             Stay on login page
  v
Redirect to / or originally requested URL
[Authenticated Home]
```

### 6.2 Browse and Purchase Flow

```
[Customer]
    |
    v
/products (Product Listing Page)
    |
    +-- GET /api/products/categories --> Display category filter sidebar
    +-- GET /api/products?page=1&limit=12 --> Display product grid
    |
    |   [Optional Filters]
    |   |-- Select category   --> ?category=ghe-sofa
    |   |-- Type search term  --> ?search=sofa
    |   |-- Set price range   --> ?minPrice=1000000&maxPrice=10000000
    |   `-- Change page       --> ?page=2
    |
    v
Click on Product Card
    |
    v
/products/:slug (Product Detail Page)
    |
    +-- GET /api/products/:slug
    |
    +---[OOS check]
    |   |-- stock_quantity = 0 --> Show "Het hang" badge, disable Add to Cart
    |   `-- stock_quantity > 0 --> Show "Them vao gio hang" button
    |
    v
Click "Them vao gio hang"
    |
    +---[Auth check]
    |   `-- Not logged in --> Redirect to /login (authGuard)
    |
    v
POST /api/cart { productId, quantity: 1 }
    |
    +-- Success --> Navbar cart count badge +1
    |              Show toast notification "Da them vao gio hang"
    |
    v
Navigate to /cart
    |
    +-- GET /api/cart --> Display cart items, subtotals, total
    |
    |   [Cart Operations]
    |   |-- Change quantity --> PUT /api/cart/:itemId
    |   `-- Remove item    --> DELETE /api/cart/:itemId
    |
    v
Click "Thanh toan" --> /checkout
    |
    v
Fill Shipping Address Form:
    |-- Ho va ten (full name)
    |-- So dien thoai (phone)
    |-- Dia chi (address)
    |-- Thanh pho (city)
    `-- Ghi chu (note, optional)
    |
    v
Click "Dat hang"
    |
    v
POST /api/orders { shippingAddress }
    |
    +--[Transaction begins]
    |   |-- Validate cart not empty
    |   |-- Validate stock for each item
    |   |-- Create order record
    |   |-- Insert order_items (price snapshots)
    |   |-- Decrement stock_quantity for each product
    |   `-- Clear cart_items for user
    +--[Transaction commits]
    |
    +---[Success]                    [Failure]
    |    |                               |
    |   201 Created                  400 Bad Request
    |   Redirect to /orders          Show error message
    |   Show "Dat hang thanh cong"   User stays on /checkout
    v
/orders (Order History)
    |
    +-- GET /api/orders --> Display list of user's orders
                           Each order: ID, date, status, total, items
```

### 6.3 Admin Product Management Flow

```
[Admin User]
    |
    v
Login at /auth/login (role = 'admin')
    |
    v
Redirect to / (home)
    |
    v
Navigate to /admin
    |
    +-- adminGuard checks: currentUser.role === 'admin' --> PASS
    |   (if role = 'customer' --> redirect to /)
    |
    v
Admin Dashboard / Product Management Page
    |
    +-- Display current product list
    |
    +========== CREATE PRODUCT ==========+
    |                                    |
    Click "Them san pham moi"            |
         |                              |
    Fill product form:                  |
    |-- Name                            |
    |-- Category (dropdown)             |
    |-- Description                     |
    |-- Price (VNĐ)                    |
    |-- Stock Quantity                  |
    |-- Images (URLs)                   |
    `-- Attributes (color, material,    |
         dimensions, weight)            |
         |                              |
    Submit --> POST /api/admin/products |
         |                              |
    201 Created                         |
    Product appears in catalog          |
    |                                   |
    +========== UPDATE PRODUCT ==========+
    |                                    |
    Click Edit on product               |
         |                              |
    Pre-fill form with current values   |
    Modify fields                       |
    Submit --> PUT /api/admin/products/:id
         |
    200 OK
    Changes reflected in catalog
    |
    +========== DELETE PRODUCT ==========+
    |
    Click Delete on product
         |
    Confirmation dialog: "Ban co chac muon xoa?"
         |
    Confirm --> DELETE /api/admin/products/:id
         |
    200 OK (is_active = false)
    Product removed from public catalog
    Order history preserved

---

[Admin Order Management]
    |
    v
Navigate to /admin/orders
    |
    GET /api/admin/orders --> All orders, all customers
    |
    Display order list:
    |-- Order ID, customer name/email
    |-- Total amount, status badge
    `-- Creation date
    |
    Click on order to expand --> Show order_items
    |
    Change status dropdown:
    |-- pending --> processing
    |-- processing --> shipped
    |-- shipped --> delivered
    `-- any --> cancelled
    |
    PUT /api/admin/orders/:id/status { status }
    |
    200 OK
    Status badge updates in real-time
    Customer sees updated status in /orders
```

---

## 7. Constraints & Assumptions

### 7.1 Technical Constraints

- **TC-01**: The backend does not use an ORM. All database interactions use raw parameterized SQL queries via the `pg` Node.js library. This is a deliberate architectural decision for performance and query transparency.
- **TC-02**: The frontend is built with Angular 17. It uses the standalone component API and signal-based reactivity (`signal()`, `computed()`). No NgModules are used.
- **TC-03**: The system is deployed as Docker containers orchestrated by Docker Compose. The production setup uses `docker-compose.prod.yml` with pre-built images pulled from GitHub Container Registry (GHCR).
- **TC-04**: Database schema migrations are run manually via `npm run migrate` (or `node dist/utils/migrate.js` in production). There is no automatic migration-on-startup mechanism.
- **TC-05**: SSL/TLS is handled entirely by Nginx using Let's Encrypt certificates. The backend and frontend containers do not handle TLS directly.
- **TC-06**: JWT tokens do not have a refresh mechanism. Token expiry requires the user to log in again. Token lifetime must be balanced between security and user experience.
- **TC-07**: The `pg` pool configuration governs the maximum number of simultaneous database connections. This limits maximum throughput on a single-node PostgreSQL instance.
- **TC-08**: File/image uploads are out of scope for v1. Product images are referenced by external URLs stored in the `images` JSONB array.
- **TC-09**: The Angular application targets modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+). Internet Explorer is not supported.
- **TC-10**: The backend TypeScript code must be compiled to JavaScript (`dist/`) before running in production. The production Docker image runs the compiled output, not `ts-node`.

### 7.2 Business Assumptions

- **BA-01**: The primary target market is Vietnamese customers. All UI text, error messages, notifications, and product data are in Vietnamese.
- **BA-02**: All prices are denominated in Vietnamese Dong (VNĐ) and stored as `DECIMAL(12, 2)`. Fractional Dong values are supported in the data model but are typically not used in practice (prices are whole numbers).
- **BA-03**: No payment gateway is integrated in v1. The checkout flow creates an order with `status = 'pending'` without processing any actual payment. Payment collection is assumed to occur offline (e.g., COD — Cash on Delivery) or will be added in a future release.
- **BA-04**: Shipping cost calculation is out of scope for v1. The `total_amount` on an order represents the merchandise total only, without shipping fees.
- **BA-05**: There is a single admin user seeded by default (`admin@furnitureshop.vn`). The business assumption is that the shop is operated by a small team where one admin account is sufficient for v1.
- **BA-06**: Product inventory is managed solely through the admin panel (manual stock updates). There is no integration with a physical inventory management system.
- **BA-07**: Customers are assumed to have a stable internet connection. The system does not implement offline capabilities or service workers for v1.
- **BA-08**: Email notifications (order confirmation, status updates) are out of scope for v1. Customers must manually check `/orders` for order status.
- **BA-09**: The 12 seed products across multiple categories represent typical furniture categories for a Vietnamese market: sofas, dining tables, beds, wardrobes, office desks, etc.
- **BA-10**: Order cancellation by customers is not supported in v1. Only admins can set an order's status to `cancelled`. This is a business policy decision to manage operational complexity.
- **BA-11**: Return and refund workflows are entirely out of scope for v1.
- **BA-12**: A "product" in this system represents a single, non-variant item. Product variants (e.g., different colors or sizes of the same model as distinct SKUs) are not modeled in v1; each variant would be a separate product record.

### 7.3 Deployment Assumptions

- **DA-01**: The production VPS runs Ubuntu 22.04 LTS with Docker and Docker Compose Plugin installed.
- **DA-02**: A domain name is configured and DNS is pointed to the VPS IP before SSL certificate provisioning.
- **DA-03**: The `main` branch on GitHub represents production-ready code. All deployments are triggered by pushes to `main`.
- **DA-04**: GitHub Secrets are correctly configured before the first CI/CD run. Missing secrets will cause deployment failure.
- **DA-05**: The PostgreSQL data volume is persistent across deployments. Running migrations multiple times is safe (migrations use `IF NOT EXISTS` guards or idempotent SQL).

---

*End of Requirements Specification — FurnitureShop v1.0*

*Document maintained by the BA Agent. For updates, raise a requirements change request via the PM agent.*
