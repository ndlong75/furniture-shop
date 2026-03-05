# FurnitureShop — Test Strategy & Test Cases

**Phiên bản**: 1.0
**Ngày**: 2026-03-05
**Tác giả**: QA Engineer
**Dự án**: FurnitureShop (Angular 17 + Node.js/Express + PostgreSQL)

---

## 1. Test Strategy Overview

### 1.1 Mục tiêu kiểm thử (Testing Objectives)

1. Xác minh tất cả API endpoints hoạt động đúng theo spec của BA.
2. Đảm bảo toàn bộ luồng nghiệp vụ quan trọng (đăng ký, mua hàng, quản lý đơn hàng) không có lỗi.
3. Phát hiện lỗi bảo mật: SQL injection, JWT manipulation, unauthorized access.
4. Kiểm tra tính nhất quán dữ liệu trong các thao tác đồng thời (concurrent checkout).
5. Đảm bảo UI hiển thị đúng, responsive, và thân thiện với người dùng tiếng Việt.
6. Đạt coverage tối thiểu: **80% backend unit**, **70% frontend unit**, **100% critical path e2e**.

### 1.2 Phạm vi kiểm thử (Test Scope)

**Trong phạm vi:**
- Tất cả API endpoints liệt kê trong CLAUDE.md
- Angular components, services, guards, interceptors
- Luồng xác thực (JWT lifecycle)
- Nghiệp vụ giỏ hàng và đặt hàng
- Chức năng admin (CRUD sản phẩm, cập nhật trạng thái đơn hàng)
- Bảo mật và phân quyền

**Ngoài phạm vi:**
- Tích hợp cổng thanh toán thực (mock only trong Sprint hiện tại)
- Load testing quy mô lớn (>1000 concurrent users)
- Kiểm thử giao diện trên IE11

### 1.3 Cấp độ kiểm thử (Testing Levels)

```
+----------------------------+
|  E2E Tests (Cypress)       |  ← Critical user journeys
+----------------------------+
|  Integration Tests         |  ← API + DB (Jest + Supertest)
+----------------------------+
|  Unit Tests                |  ← Components, Services, Utils
|  (Jest / Karma+Jasmine)    |
+----------------------------+
```

| Cấp độ | Công cụ | Mục tiêu coverage | Chạy khi nào |
|---|---|---|---|
| Unit (Backend) | Jest | 80% | Mỗi commit |
| Unit (Frontend) | Karma + Jasmine | 70% | Mỗi commit |
| Integration (API) | Jest + Supertest | 100% happy path | Mỗi PR |
| E2E | Cypress | Critical paths | Trước mỗi release |
| Performance | k6 | Baseline metrics | Release milestone |
| Security | Manual + OWASP ZAP | Checklist | Sprint cuối |

### 1.4 Môi trường kiểm thử (Test Environments)

| Môi trường | Mô tả | Database | URL |
|---|---|---|---|
| Local | Docker Compose, developer machine | PostgreSQL test DB (isolated) | http://localhost:4200 |
| CI | GitHub Actions runner | PostgreSQL service container | N/A (automated) |
| Staging | VPS, production-like | Seeded staging DB | https://staging.furnitureshop.vn |
| Production | VPS live | Production DB (smoke tests only) | https://furnitureshop.vn |

### 1.5 Chiến lược dữ liệu kiểm thử (Test Data Strategy)

- **Backend integration tests**: Chạy migration + seed trên PostgreSQL test instance riêng biệt. Mỗi test suite chạy `BEGIN` / `ROLLBACK` để cô lập dữ liệu.
- **Frontend unit tests**: Mock `HttpClient` bằng `HttpClientTestingModule`. Mock services bằng Jasmine spies.
- **E2E tests**: Seed cố định (Cypress fixtures) + API commands để tạo trạng thái ban đầu.
- **Không bao giờ** dùng database production cho automated tests.

### 1.6 Định nghĩa mức độ ưu tiên (Priority Levels)

| Mức | Ý nghĩa | Thời gian fix |
|---|---|---|
| P1 - Critical | Chặn toàn bộ chức năng, data loss | Trong ngày |
| P2 - High | Chức năng chính bị lỗi, có workaround khó | 1-2 ngày |
| P3 - Medium | Chức năng phụ bị lỗi, UX kém | Sprint hiện tại |
| P4 - Low | Lỗi nhỏ, cosmetic, nice-to-have | Backlog |

---

## 2. Backend Test Cases

> Tất cả integration test chạy với Jest + Supertest trên `http://localhost:3000`.
> Base URL: `/api`

### 2.1 Auth API (`/api/auth`)

---

#### TC-AUTH-001: Đăng ký thành công (Happy Path)

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-001 |
| **Module** | Auth / Register |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:**
- Database sạch, không có user với email `testuser@example.com`
- Server đang chạy

**Steps:**
1. Gửi `POST /api/auth/register` với body:
   ```json
   {
     "name": "Nguyen Van A",
     "email": "testuser@example.com",
     "password": "SecurePass@123"
   }
   ```
2. Kiểm tra HTTP status code
3. Kiểm tra response body
4. Kiểm tra database: user đã được tạo

**Expected Result:**
- HTTP 201 Created
- Response chứa `{ token: <jwt_string>, user: { id, name, email, role: "customer" } }`
- `token` là JWT hợp lệ, decode được với payload đúng
- Password được hash trong DB (không lưu plain text)
- `role` mặc định là `"customer"`

---

#### TC-AUTH-002: Đăng ký với email đã tồn tại

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-002 |
| **Module** | Auth / Register |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:**
- Đã tồn tại user với email `existing@example.com` trong DB

**Steps:**
1. Gửi `POST /api/auth/register` với body:
   ```json
   {
     "name": "Nguyen Van B",
     "email": "existing@example.com",
     "password": "SecurePass@123"
   }
   ```

**Expected Result:**
- HTTP 409 Conflict
- Response: `{ error: "Email đã được sử dụng" }` (hoặc tương đương)
- Không tạo thêm bản ghi trong bảng `users`

---

#### TC-AUTH-003: Đăng ký thiếu trường bắt buộc

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-003 |
| **Module** | Auth / Register |
| **Priority** | P2 |
| **Type** | Integration |

**Preconditions:** Server đang chạy

**Steps:**
1. Gửi `POST /api/auth/register` với body thiếu `password`:
   ```json
   { "name": "Test", "email": "test@example.com" }
   ```
2. Gửi `POST /api/auth/register` với body thiếu `email`:
   ```json
   { "name": "Test", "password": "Pass@123" }
   ```
3. Gửi `POST /api/auth/register` với body rỗng: `{}`

**Expected Result (mỗi case):**
- HTTP 400 Bad Request
- Response chứa thông báo lỗi validation rõ ràng
- Không tạo bản ghi mới trong DB

---

#### TC-AUTH-004: Đăng ký với email không đúng định dạng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-004 |
| **Module** | Auth / Register |
| **Priority** | P2 |
| **Type** | Integration |

**Steps:**
1. Gửi `POST /api/auth/register` với `email: "notanemail"`
2. Gửi với `email: "missing@domain"`
3. Gửi với `email: "@nodomain.com"`

**Expected Result:**
- HTTP 400 Bad Request cho cả 3 case
- Thông báo lỗi xác định rõ `email` không hợp lệ

---

#### TC-AUTH-005: Đăng nhập thành công

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-005 |
| **Module** | Auth / Login |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:**
- User `user@example.com` / `SecurePass@123` đã tồn tại trong DB

**Steps:**
1. Gửi `POST /api/auth/login`:
   ```json
   { "email": "user@example.com", "password": "SecurePass@123" }
   ```

**Expected Result:**
- HTTP 200 OK
- Response: `{ token: <jwt>, user: { id, name, email, role } }`
- JWT decode được, `exp` hợp lệ (chưa hết hạn)

---

#### TC-AUTH-006: Đăng nhập sai mật khẩu

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-006 |
| **Module** | Auth / Login |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** User `user@example.com` tồn tại

**Steps:**
1. Gửi `POST /api/auth/login`:
   ```json
   { "email": "user@example.com", "password": "WrongPassword" }
   ```

**Expected Result:**
- HTTP 401 Unauthorized
- Response: thông báo lỗi chung (không tiết lộ "email đúng nhưng pass sai")
- Không trả về token

---

#### TC-AUTH-007: Đăng nhập với email không tồn tại

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-007 |
| **Module** | Auth / Login |
| **Priority** | P1 |
| **Type** | Integration |

**Steps:**
1. Gửi `POST /api/auth/login`:
   ```json
   { "email": "nonexistent@example.com", "password": "AnyPass@123" }
   ```

**Expected Result:**
- HTTP 401 Unauthorized
- Response message giống TC-AUTH-006 (không phân biệt email vs password sai — security best practice)

---

#### TC-AUTH-008: Truy cập route bảo vệ không có token

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-008 |
| **Module** | Auth / Middleware |
| **Priority** | P1 |
| **Type** | Integration |

**Steps:**
1. Gửi `GET /api/auth/me` không có `Authorization` header
2. Gửi `GET /api/cart` không có token
3. Gửi `POST /api/orders` không có token

**Expected Result:**
- HTTP 401 Unauthorized cho tất cả requests
- Response: `{ error: "Không có token xác thực" }` (hoặc tương đương)

---

#### TC-AUTH-009: Truy cập route bảo vệ với token hết hạn

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-009 |
| **Module** | Auth / Middleware |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Có JWT đã hết hạn (tạo với `exp` trong quá khứ)

**Steps:**
1. Gửi `GET /api/auth/me` với header:
   `Authorization: Bearer <expired_jwt_token>`

**Expected Result:**
- HTTP 401 Unauthorized
- Response chứa thông báo token hết hạn hoặc không hợp lệ
- Không trả về user data

---

#### TC-AUTH-010: Truy cập admin route với token user thường

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-AUTH-010 |
| **Module** | Auth / Authorization |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Đăng nhập bằng tài khoản customer, có token hợp lệ

**Steps:**
1. Gửi `POST /api/admin/products` với token của customer
2. Gửi `GET /api/admin/orders` với token của customer

**Expected Result:**
- HTTP 403 Forbidden cho cả 2 requests
- Response: thông báo không có quyền admin

---

### 2.2 Products API (`/api/products`)

---

#### TC-PROD-001: Lấy danh sách sản phẩm (mặc định)

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-001 |
| **Module** | Products / List |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** DB có ít nhất 12 sản phẩm (từ seed)

**Steps:**
1. Gửi `GET /api/products`

**Expected Result:**
- HTTP 200 OK
- Response: `{ products: [...], total: <number>, page: 1, limit: <default> }`
- Mỗi product có: `id, name, slug, price, stock, category, images`
- Chỉ trả về sản phẩm `is_deleted = false`

---

#### TC-PROD-002: Lọc sản phẩm theo category

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-002 |
| **Module** | Products / Filter |
| **Priority** | P2 |
| **Type** | Integration |

**Steps:**
1. Gửi `GET /api/products?category=ghe` (slug của category "Ghế")
2. Kiểm tra tất cả sản phẩm trả về thuộc category "Ghế"
3. Gửi với category không tồn tại: `GET /api/products?category=xxx`

**Expected Result:**
- Step 1-2: HTTP 200, tất cả sản phẩm trong response thuộc đúng category
- Step 3: HTTP 200, `products: []`, `total: 0`

---

#### TC-PROD-003: Tìm kiếm sản phẩm theo từ khóa

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-003 |
| **Module** | Products / Search |
| **Priority** | P2 |
| **Type** | Integration |

**Steps:**
1. Gửi `GET /api/products?search=sofa`
2. Gửi `GET /api/products?search=SOFA` (kiểm tra case-insensitive)
3. Gửi `GET /api/products?search=<script>alert(1)</script>` (XSS attempt)
4. Gửi `GET /api/products?search='; DROP TABLE products; --` (SQL injection)

**Expected Result:**
- Step 1: HTTP 200, sản phẩm chứa "sofa" trong tên/mô tả
- Step 2: Kết quả giống step 1 (case-insensitive)
- Step 3: HTTP 200, không thực thi script, trả về kết quả rỗng hoặc escaped
- Step 4: HTTP 200, không xảy ra SQL injection, parameterized query an toàn

---

#### TC-PROD-004: Lọc sản phẩm theo khoảng giá

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-004 |
| **Module** | Products / Filter |
| **Priority** | P2 |
| **Type** | Integration |

**Steps:**
1. Gửi `GET /api/products?minPrice=1000000&maxPrice=5000000`
2. Gửi `GET /api/products?minPrice=999999999` (giá cao hơn tất cả sản phẩm)
3. Gửi `GET /api/products?minPrice=abc` (giá trị không hợp lệ)

**Expected Result:**
- Step 1: HTTP 200, tất cả sản phẩm có `price >= 1000000` và `price <= 5000000`
- Step 2: HTTP 200, `products: []`
- Step 3: HTTP 400 hoặc bỏ qua filter và trả về tất cả (tùy quyết định BA)

---

#### TC-PROD-005: Phân trang sản phẩm

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-005 |
| **Module** | Products / Pagination |
| **Priority** | P2 |
| **Type** | Integration |

**Steps:**
1. Gửi `GET /api/products?page=1&limit=5`
2. Gửi `GET /api/products?page=2&limit=5`
3. Gửi `GET /api/products?page=999&limit=5`

**Expected Result:**
- Step 1: HTTP 200, trả về tối đa 5 sản phẩm, `page: 1`
- Step 2: HTTP 200, trả về 5 sản phẩm tiếp theo (không trùng với step 1)
- Step 3: HTTP 200, `products: []` (page vượt quá tổng số)

---

#### TC-PROD-006: Lấy sản phẩm theo slug

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-006 |
| **Module** | Products / Detail |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Sản phẩm với slug `sofa-goc-l-hien-dai` tồn tại trong DB

**Steps:**
1. Gửi `GET /api/products/sofa-goc-l-hien-dai`
2. Gửi `GET /api/products/slug-khong-ton-tai`

**Expected Result:**
- Step 1: HTTP 200, trả về đầy đủ thông tin sản phẩm bao gồm category, images, stock
- Step 2: HTTP 404 Not Found, response có thông báo lỗi rõ ràng

---

#### TC-PROD-007: Lấy danh sách categories

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-007 |
| **Module** | Products / Categories |
| **Priority** | P2 |
| **Type** | Integration |

**Steps:**
1. Gửi `GET /api/products/categories`

**Expected Result:**
- HTTP 200 OK
- Response: mảng categories, mỗi item có `id, name, slug`
- Ít nhất có các category từ seed data

---

#### TC-PROD-008: Admin tạo sản phẩm mới

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-008 |
| **Module** | Admin / Products |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Đăng nhập với tài khoản admin, có token admin hợp lệ

**Steps:**
1. Gửi `POST /api/admin/products` với header `Authorization: Bearer <admin_token>`:
   ```json
   {
     "name": "Bàn Làm Việc Gỗ Sồi",
     "description": "Bàn làm việc chắc chắn, phong cách hiện đại",
     "price": 3500000,
     "stock": 15,
     "category_id": 1,
     "images": ["ban-lam-viec.jpg"]
   }
   ```

**Expected Result:**
- HTTP 201 Created
- Response chứa sản phẩm vừa tạo với `id`, `slug` tự động generate
- Sản phẩm xuất hiện trong `GET /api/products`
- `is_deleted = false` trong DB

---

#### TC-PROD-009: Admin tạo sản phẩm thiếu trường bắt buộc

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-009 |
| **Module** | Admin / Products |
| **Priority** | P2 |
| **Type** | Integration |

**Steps:**
1. Gửi `POST /api/admin/products` thiếu `price`
2. Gửi `POST /api/admin/products` thiếu `name`
3. Gửi `POST /api/admin/products` với `price: -1000`

**Expected Result:**
- HTTP 400 Bad Request cho tất cả cases
- Thông báo lỗi chỉ rõ trường nào không hợp lệ

---

#### TC-PROD-010: Admin cập nhật sản phẩm

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-010 |
| **Module** | Admin / Products |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Sản phẩm ID=1 tồn tại, có token admin

**Steps:**
1. Gửi `PUT /api/admin/products/1`:
   ```json
   { "price": 4000000, "stock": 20 }
   ```

**Expected Result:**
- HTTP 200 OK
- Response chứa sản phẩm đã cập nhật với `price: 4000000`, `stock: 20`
- `GET /api/products/1` phản ánh giá mới

---

#### TC-PROD-011: Admin xóa mềm sản phẩm (Soft Delete)

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PROD-011 |
| **Module** | Admin / Products |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Sản phẩm ID=5 tồn tại, có token admin

**Steps:**
1. Gửi `DELETE /api/admin/products/5`
2. Gửi `GET /api/products` để kiểm tra sản phẩm đã bị ẩn
3. Kiểm tra DB trực tiếp: `is_deleted = true`

**Expected Result:**
- Step 1: HTTP 200 OK hoặc 204 No Content
- Step 2: Sản phẩm ID=5 không xuất hiện trong danh sách
- Step 3: Bản ghi vẫn tồn tại trong DB với `is_deleted = true` (không xóa vật lý)

---

### 2.3 Cart API (`/api/cart`)

---

#### TC-CART-001: Lấy giỏ hàng của user

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-001 |
| **Module** | Cart / Get |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Đăng nhập với user, giỏ hàng có 2 sản phẩm

**Steps:**
1. Gửi `GET /api/cart` với token hợp lệ

**Expected Result:**
- HTTP 200 OK
- Response: `{ items: [...], total: <number> }`
- Mỗi item có: `id, product (name, price, images, stock), quantity, subtotal`
- `total` bằng tổng `subtotal` của tất cả items

---

#### TC-CART-002: Thêm sản phẩm mới vào giỏ hàng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-002 |
| **Module** | Cart / Add |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** User đã đăng nhập, sản phẩm ID=3 có `stock >= 5`, không có trong giỏ hàng

**Steps:**
1. Gửi `POST /api/cart`:
   ```json
   { "productId": 3, "quantity": 2 }
   ```
2. Gửi `GET /api/cart` để kiểm tra

**Expected Result:**
- Step 1: HTTP 201 Created hoặc 200 OK
- Step 2: Giỏ hàng có sản phẩm ID=3 với `quantity: 2`

---

#### TC-CART-003: Thêm sản phẩm đã có trong giỏ (Upsert)

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-003 |
| **Module** | Cart / Add (Upsert) |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Sản phẩm ID=3 đã có trong giỏ với `quantity: 2`, sản phẩm có `stock >= 5`

**Steps:**
1. Gửi `POST /api/cart`:
   ```json
   { "productId": 3, "quantity": 3 }
   ```
2. Gửi `GET /api/cart`

**Expected Result:**
- Step 1: HTTP 200 OK
- Step 2: Sản phẩm ID=3 trong giỏ có `quantity: 5` (2 + 3) HOẶC `quantity: 3` (replace) — tùy thiết kế, cần nhất quán
- Không tạo 2 bản ghi riêng trong `cart_items`

---

#### TC-CART-004: Thêm sản phẩm hết hàng vào giỏ

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-004 |
| **Module** | Cart / Add |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Sản phẩm ID=7 có `stock: 0`

**Steps:**
1. Gửi `POST /api/cart`:
   ```json
   { "productId": 7, "quantity": 1 }
   ```

**Expected Result:**
- HTTP 400 Bad Request
- Response: `{ error: "Sản phẩm đã hết hàng" }` (hoặc tương đương)
- Không thêm vào bảng `cart_items`

---

#### TC-CART-005: Thêm số lượng vượt quá tồn kho

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-005 |
| **Module** | Cart / Add |
| **Priority** | P2 |
| **Type** | Integration |

**Preconditions:** Sản phẩm ID=4 có `stock: 3`

**Steps:**
1. Gửi `POST /api/cart`:
   ```json
   { "productId": 4, "quantity": 10 }
   ```

**Expected Result:**
- HTTP 400 Bad Request
- Response thông báo số lượng yêu cầu vượt quá tồn kho
- Gợi ý số lượng tối đa có thể mua

---

#### TC-CART-006: Cập nhật số lượng item trong giỏ hàng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-006 |
| **Module** | Cart / Update |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Cart item ID=10 tồn tại với `quantity: 2`

**Steps:**
1. Gửi `PUT /api/cart/10`:
   ```json
   { "quantity": 5 }
   ```

**Expected Result:**
- HTTP 200 OK
- Cart item ID=10 có `quantity: 5`
- `GET /api/cart` phản ánh số lượng mới

---

#### TC-CART-007: Cập nhật số lượng về 0 (tự động xóa)

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-007 |
| **Module** | Cart / Update |
| **Priority** | P2 |
| **Type** | Integration |

**Preconditions:** Cart item ID=10 tồn tại

**Steps:**
1. Gửi `PUT /api/cart/10`:
   ```json
   { "quantity": 0 }
   ```
2. Gửi `GET /api/cart`

**Expected Result:**
- Step 1: HTTP 200 OK hoặc 204 No Content
- Step 2: Cart item ID=10 không còn trong giỏ hàng
- Bản ghi bị xóa khỏi `cart_items`

---

#### TC-CART-008: Xóa item khỏi giỏ hàng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-008 |
| **Module** | Cart / Delete |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Cart item ID=11 tồn tại và thuộc về user đang đăng nhập

**Steps:**
1. Gửi `DELETE /api/cart/11`
2. Gửi `GET /api/cart`

**Expected Result:**
- Step 1: HTTP 200 OK hoặc 204 No Content
- Step 2: Item ID=11 không còn trong giỏ

---

#### TC-CART-009: Xóa item của user khác (Authorization)

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-CART-009 |
| **Module** | Cart / Delete (Security) |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Cart item ID=20 thuộc về userB, đang đăng nhập bằng userA

**Steps:**
1. Gửi `DELETE /api/cart/20` với token của userA

**Expected Result:**
- HTTP 403 Forbidden hoặc 404 Not Found
- Item ID=20 không bị xóa khỏi DB

---

### 2.4 Orders API (`/api/orders`)

---

#### TC-ORD-001: Tạo đơn hàng thành công từ giỏ hàng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-ORD-001 |
| **Module** | Orders / Create |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:**
- User đăng nhập, giỏ hàng có 2 sản phẩm (stock đủ)
- Sản phẩm A: quantity=2, price=1.500.000 VND
- Sản phẩm B: quantity=1, price=3.000.000 VND

**Steps:**
1. Gửi `POST /api/orders` với token hợp lệ
2. Kiểm tra response
3. Gửi `GET /api/cart` để kiểm tra giỏ hàng đã xóa
4. Kiểm tra DB: stock đã giảm, order_items đã tạo

**Expected Result:**
- Step 1: HTTP 201 Created
- Response: `{ order: { id, status: "pending", total_amount: 6000000, items: [...] } }`
- `total_amount = 2*1500000 + 1*3000000 = 6000000`
- Step 3: Giỏ hàng rỗng (đã xóa sau khi đặt hàng)
- Step 4: `stock` giảm đúng số lượng, `order_items` có `price` snapshot từ thời điểm đặt hàng

---

#### TC-ORD-002: Tạo đơn hàng từ giỏ hàng rỗng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-ORD-002 |
| **Module** | Orders / Create |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** User đăng nhập, giỏ hàng rỗng

**Steps:**
1. Gửi `POST /api/orders`

**Expected Result:**
- HTTP 400 Bad Request
- Response: `{ error: "Giỏ hàng trống" }` (hoặc tương đương)
- Không tạo bản ghi trong bảng `orders`

---

#### TC-ORD-003: Tạo đơn hàng khi sản phẩm hết hàng (trong lúc checkout)

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-ORD-003 |
| **Module** | Orders / Create (Edge Case) |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Sản phẩm X có `stock: 1`, giỏ hàng chứa sản phẩm X với `quantity: 2`

**Steps:**
1. Gửi `POST /api/orders`

**Expected Result:**
- HTTP 400 Bad Request
- Response: thông báo sản phẩm không đủ hàng
- Transaction rollback: không tạo order, không thay đổi stock, giỏ hàng không bị xóa

---

#### TC-ORD-004: Race condition — 2 user cùng mua sản phẩm cuối cùng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-ORD-004 |
| **Module** | Orders / Concurrency |
| **Priority** | P1 |
| **Type** | Integration (Concurrency) |

**Preconditions:**
- Sản phẩm Y có `stock: 1`
- UserA và userB đều có sản phẩm Y (quantity=1) trong giỏ hàng

**Steps:**
1. Gửi đồng thời 2 requests `POST /api/orders` từ userA và userB
2. Kiểm tra kết quả cả 2 responses
3. Kiểm tra DB: `stock` của sản phẩm Y

**Expected Result:**
- Đúng 1 request thành công (HTTP 201), 1 request thất bại (HTTP 400)
- `stock` sau cùng = 0, không phải -1
- Tính nhất quán dữ liệu được đảm bảo (PostgreSQL transaction + FOR UPDATE lock)

---

#### TC-ORD-005: Lấy danh sách đơn hàng của user

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-ORD-005 |
| **Module** | Orders / List |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** User đã có 3 đơn hàng trong DB

**Steps:**
1. Gửi `GET /api/orders` với token hợp lệ

**Expected Result:**
- HTTP 200 OK
- Response: mảng 3 đơn hàng, sắp xếp theo thời gian mới nhất
- Mỗi đơn: `id, status, total_amount, created_at, items_count`
- Không trả về đơn hàng của user khác

---

#### TC-ORD-006: Admin lấy tất cả đơn hàng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-ORD-006 |
| **Module** | Admin / Orders |
| **Priority** | P2 |
| **Type** | Integration |

**Preconditions:** Đăng nhập với tài khoản admin

**Steps:**
1. Gửi `GET /api/admin/orders` với token admin

**Expected Result:**
- HTTP 200 OK
- Trả về đơn hàng của tất cả users
- Mỗi đơn hàng có thông tin user (name, email)

---

#### TC-ORD-007: Admin cập nhật trạng thái đơn hàng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-ORD-007 |
| **Module** | Admin / Orders |
| **Priority** | P1 |
| **Type** | Integration |

**Preconditions:** Đơn hàng ID=5 đang ở trạng thái `pending`

**Steps:**
1. Gửi `PUT /api/admin/orders/5/status`:
   ```json
   { "status": "processing" }
   ```
2. Gửi `PUT /api/admin/orders/5/status`:
   ```json
   { "status": "shipped" }
   ```
3. Gửi `PUT /api/admin/orders/5/status`:
   ```json
   { "status": "invalid_status" }
   ```

**Expected Result:**
- Step 1: HTTP 200, `status: "processing"`
- Step 2: HTTP 200, `status: "shipped"`
- Step 3: HTTP 400 Bad Request, thông báo trạng thái không hợp lệ

---

#### TC-ORD-008: Admin thử chuyển ngược trạng thái đơn hàng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-ORD-008 |
| **Module** | Admin / Orders (Business Rule) |
| **Priority** | P2 |
| **Type** | Integration |

**Preconditions:** Đơn hàng ID=6 đang ở trạng thái `delivered`

**Steps:**
1. Gửi `PUT /api/admin/orders/6/status`:
   ```json
   { "status": "pending" }
   ```

**Expected Result:**
- HTTP 400 Bad Request (nếu business rule không cho phép chuyển ngược)
- Hoặc HTTP 200 (nếu admin có quyền chuyển tự do) — cần BA xác nhận
- Tài liệu này ghi nhận đây là ambiguity cần clarify

---

## 3. Frontend Test Cases

### 3.1 AuthService Unit Tests

> Tool: Karma + Jasmine + HttpClientTestingModule

---

#### TC-FE-AUTH-001: Login method gửi đúng request và lưu token

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-AUTH-001 |
| **Module** | AuthService |
| **Priority** | P1 |
| **Type** | Unit |

**Setup:**
```typescript
TestBed.configureTestingModule({
  imports: [HttpClientTestingModule],
  providers: [AuthService]
});
```

**Steps:**
1. Gọi `authService.login('user@example.com', 'pass')`
2. Mock HTTP response: `{ token: 'jwt123', user: { id: 1, name: 'Test', role: 'customer' } }`
3. Kiểm tra `localStorage.getItem('token')`
4. Kiểm tra `authService.currentUser()` signal

**Expected Result:**
- HTTP POST được gửi đến `/api/auth/login` với đúng body
- Token được lưu vào `localStorage`
- `currentUser` signal cập nhật với user data
- Observable hoàn thành không có lỗi

---

#### TC-FE-AUTH-002: Logout xóa token và reset state

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-AUTH-002 |
| **Module** | AuthService |
| **Priority** | P1 |
| **Type** | Unit |

**Steps:**
1. Set `localStorage.setItem('token', 'jwt123')`
2. Gọi `authService.logout()`
3. Kiểm tra localStorage và signal

**Expected Result:**
- `localStorage.getItem('token')` trả về `null`
- `authService.currentUser()` trả về `null`
- `authService.isLoggedIn()` trả về `false`

---

#### TC-FE-AUTH-003: App init khôi phục session từ localStorage

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-AUTH-003 |
| **Module** | AuthService / Init |
| **Priority** | P1 |
| **Type** | Unit |

**Steps:**
1. Set valid JWT trong localStorage trước khi khởi tạo service
2. Khởi tạo `AuthService`
3. Kiểm tra `currentUser()` signal

**Expected Result:**
- `currentUser()` được khôi phục từ JWT payload
- `isLoggedIn()` trả về `true`
- Không cần gọi API để check session

---

### 3.2 CartService Unit Tests

---

#### TC-FE-CART-001: Thêm item cập nhật itemCount signal

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-CART-001 |
| **Module** | CartService |
| **Priority** | P1 |
| **Type** | Unit |

**Steps:**
1. Mock `POST /api/cart` trả về success
2. Gọi `cartService.addToCart(productId, quantity)`
3. Mock `GET /api/cart` trả về cart với 1 item
4. Kiểm tra `cartService.itemCount()`

**Expected Result:**
- `itemCount()` signal cập nhật đúng số lượng items
- `cart()` signal chứa item vừa thêm

---

#### TC-FE-CART-002: Xóa item khỏi giỏ hàng cập nhật state

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-CART-002 |
| **Module** | CartService |
| **Priority** | P1 |
| **Type** | Unit |

**Steps:**
1. Mock cart với 2 items
2. Gọi `cartService.removeItem(itemId)`
3. Mock `DELETE /api/cart/:itemId` trả về 204
4. Kiểm tra cart state

**Expected Result:**
- `cart()` không còn item bị xóa
- `itemCount()` giảm đi 1

---

### 3.3 Component Render Tests

---

#### TC-FE-COMP-001: ProductCard hiển thị đúng thông tin sản phẩm

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-COMP-001 |
| **Module** | ProductCard Component |
| **Priority** | P2 |
| **Type** | Unit |

**Steps:**
1. Tạo `ProductCardComponent` với input:
   ```typescript
   { name: "Sofa Góc L", price: 15000000, images: ["sofa.jpg"], stock: 3 }
   ```
2. Kiểm tra DOM

**Expected Result:**
- Tên sản phẩm "Sofa Góc L" hiển thị đúng
- Giá "15.000.000 ₫" được format đúng (locale vi-VN)
- Image src = "sofa.jpg"
- Nút "Thêm vào giỏ" visible và enabled

---

#### TC-FE-COMP-002: ProductCard hiển thị badge hết hàng khi stock = 0

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-COMP-002 |
| **Module** | ProductCard Component |
| **Priority** | P2 |
| **Type** | Unit |

**Steps:**
1. Tạo component với input `stock: 0`
2. Kiểm tra DOM

**Expected Result:**
- Badge "Hết hàng" hiển thị
- Nút "Thêm vào giỏ" disabled hoặc ẩn
- CSS class `out-of-stock` được áp dụng

---

#### TC-FE-COMP-003: Navbar hiển thị menu đúng theo trạng thái đăng nhập

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-COMP-003 |
| **Module** | Navbar Component |
| **Priority** | P2 |
| **Type** | Unit |

**Steps:**
1. Mock `AuthService.currentUser()` = `null` → kiểm tra navbar
2. Mock `AuthService.currentUser()` = `{ role: 'customer' }` → kiểm tra navbar
3. Mock `AuthService.currentUser()` = `{ role: 'admin' }` → kiểm tra navbar

**Expected Result:**
- Step 1: Hiển thị "Đăng nhập" / "Đăng ký", không có link giỏ hàng
- Step 2: Hiển thị tên user, icon giỏ hàng với `itemCount`, link "Đơn hàng"
- Step 3: Thêm link "Quản trị" trong menu

---

#### TC-FE-GUARD-001: AuthGuard redirect đến login khi chưa đăng nhập

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-GUARD-001 |
| **Module** | authGuard |
| **Priority** | P1 |
| **Type** | Unit |

**Steps:**
1. Mock `AuthService.isLoggedIn()` = `false`
2. Điều hướng đến `/cart` (route được bảo vệ)

**Expected Result:**
- Guard trả về `UrlTree` redirect đến `/auth/login`
- Không cho phép truy cập `/cart`

---

#### TC-FE-GUARD-002: AdminGuard chặn user thường truy cập trang admin

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-FE-GUARD-002 |
| **Module** | adminGuard |
| **Priority** | P1 |
| **Type** | Unit |

**Steps:**
1. Mock `AuthService.currentUser()` = `{ role: 'customer' }`
2. Điều hướng đến `/admin`

**Expected Result:**
- Guard redirect về `/` hoặc `/403`
- Không cho phép truy cập trang admin

---

## 4. E2E Test Scenarios

> Tool: Cypress
> Base URL: `http://localhost:4200`
> Trước mỗi test suite: chạy seed script để reset DB về trạng thái chuẩn

---

#### TC-E2E-001: Toàn bộ luồng mua hàng (Happy Path)

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-E2E-001 |
| **Module** | Full Purchase Flow |
| **Priority** | P1 |
| **Type** | E2E |
| **Thời gian ước tính** | 3-4 phút |

**Preconditions:** DB đã seed, email `newcustomer@test.vn` chưa tồn tại

**Steps:**
1. Mở `http://localhost:4200`
2. Click "Đăng ký" → Điền form: name, email, password → Submit
3. Xác nhận redirect đến trang chủ, navbar hiển thị tên user
4. Click "Sản phẩm" → Browse danh sách
5. Click vào sản phẩm "Sofa Góc L Hiện Đại"
6. Kiểm tra trang chi tiết: ảnh, mô tả, giá, tồn kho
7. Click "Thêm vào giỏ hàng", chọn quantity=2
8. Navbar cập nhật `itemCount = 2`
9. Tiếp tục thêm 1 sản phẩm khác vào giỏ
10. Click icon giỏ hàng → Kiểm tra tổng tiền đúng
11. Click "Tiến hành thanh toán"
12. Điền địa chỉ giao hàng
13. Click "Đặt hàng"
14. Xác nhận trang xác nhận đơn hàng hiển thị
15. Click "Đơn hàng của tôi" → Đơn hàng mới xuất hiện với status "Chờ xử lý"

**Expected Result:**
- Toàn bộ flow hoàn thành không có lỗi
- Đơn hàng tạo thành công
- Giỏ hàng rỗng sau khi đặt hàng
- Email xác nhận được gửi (nếu feature có)
- Stock giảm đúng số lượng

---

#### TC-E2E-002: Luồng Admin — Thêm sản phẩm mới

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-E2E-002 |
| **Module** | Admin Flow |
| **Priority** | P1 |
| **Type** | E2E |

**Steps:**
1. Mở `http://localhost:4200/auth/login`
2. Đăng nhập: `admin@furnitureshop.vn` / `Admin@123`
3. Xác nhận redirect, menu "Quản trị" xuất hiện
4. Click "Quản trị" → "Quản lý sản phẩm"
5. Click "Thêm sản phẩm mới"
6. Điền form: Tên, Mô tả, Giá=2.500.000, Tồn kho=10, Category=Bàn
7. Upload ảnh sản phẩm
8. Click "Lưu"
9. Xác nhận sản phẩm xuất hiện trong danh sách admin
10. Mở tab khách vào `/products` → Tìm kiếm sản phẩm vừa tạo

**Expected Result:**
- Sản phẩm được tạo thành công
- Xuất hiện trong danh sách public `/products`
- Slug tự động tạo đúng từ tên sản phẩm

---

#### TC-E2E-003: Luồng Admin — Cập nhật trạng thái đơn hàng

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-E2E-003 |
| **Module** | Admin / Order Management |
| **Priority** | P1 |
| **Type** | E2E |

**Preconditions:** Có đơn hàng ID=1 đang ở trạng thái `pending`

**Steps:**
1. Đăng nhập admin
2. Vào "Quản lý đơn hàng"
3. Tìm đơn hàng ID=1
4. Chọn "Cập nhật trạng thái" → "Đang xử lý"
5. Xác nhận thay đổi
6. Đăng xuất, đăng nhập với tài khoản customer đã đặt đơn hàng đó
7. Vào "Đơn hàng của tôi" → Kiểm tra trạng thái

**Expected Result:**
- Trạng thái đơn hàng cập nhật thành công
- Customer thấy trạng thái mới trên trang đơn hàng của họ

---

#### TC-E2E-004: Tìm kiếm và lọc sản phẩm

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-E2E-004 |
| **Module** | Product Search & Filter |
| **Priority** | P2 |
| **Type** | E2E |

**Steps:**
1. Mở `/products`
2. Nhập "sofa" vào ô tìm kiếm
3. Kiểm tra kết quả chỉ hiện sản phẩm liên quan đến "sofa"
4. Filter theo category "Ghế"
5. Kéo slider giá: 1.000.000 - 5.000.000
6. Xác nhận sản phẩm lọc đúng
7. Click "Xóa bộ lọc" → danh sách về trạng thái ban đầu

**Expected Result:**
- Tìm kiếm hoạt động real-time hoặc khi nhấn Enter
- Filter category cộng dồn với search
- Price range filter chính xác
- Pagination hoạt động đúng với filter

---

#### TC-E2E-005: Session hết hạn giữa chừng khi checkout

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-E2E-005 |
| **Module** | Session Expiry (Edge Case) |
| **Priority** | P1 |
| **Type** | E2E |

**Steps:**
1. Đăng nhập, thêm sản phẩm vào giỏ
2. Vào trang giỏ hàng
3. Xóa JWT khỏi localStorage (simulate token expiry):
   `cy.clearLocalStorage('token')`
4. Click "Tiến hành thanh toán"

**Expected Result:**
- Redirect đến trang đăng nhập
- Thông báo "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"
- Sau khi đăng nhập lại, giỏ hàng vẫn còn nguyên (server-side cart)

---

#### TC-E2E-006: Guest không thể truy cập trang giỏ hàng và checkout

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-E2E-006 |
| **Module** | Route Guards / Guest |
| **Priority** | P1 |
| **Type** | E2E |

**Steps:**
1. Không đăng nhập
2. Điều hướng trực tiếp đến `/cart`
3. Điều hướng đến `/checkout`
4. Điều hướng đến `/orders`

**Expected Result:**
- Tất cả 3 routes redirect đến `/auth/login`
- Sau khi đăng nhập, redirect lại đúng route đã yêu cầu (return URL)

---

## 5. Performance Test Scenarios

> Tool: k6
> Môi trường: Staging server

---

#### TC-PERF-001: Danh sách sản phẩm dưới tải đồng thời

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PERF-001 |
| **Module** | Products / Performance |
| **Priority** | P2 |
| **Type** | Performance |

**Kịch bản k6:**
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // ramp up
    { duration: '1m', target: 100 },   // steady state
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95th percentile < 500ms
    http_req_failed: ['rate<0.01'],    // error rate < 1%
  },
};

export default function () {
  const res = http.get('https://staging.furnitureshop.vn/api/products');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

**Acceptance Criteria:**
- p95 response time < 500ms với 100 concurrent users
- Error rate < 1%
- Không có memory leak sau 1 phút steady state

---

#### TC-PERF-002: Concurrent Checkout — Race Condition với tồn kho

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PERF-002 |
| **Module** | Orders / Concurrency |
| **Priority** | P1 |
| **Type** | Performance + Correctness |

**Setup:**
- Sản phẩm Z có `stock: 10`
- 20 users đồng thời cùng đặt hàng 1 sản phẩm Z

**Kịch bản:**
```javascript
export const options = {
  vus: 20,
  duration: '10s',
};

export default function () {
  // Mỗi VU đã có cart với sản phẩm Z
  const res = http.post('/api/orders', null, { headers: { Authorization: `Bearer ${TOKEN}` } });
  check(res, {
    'created or conflict': (r) => r.status === 201 || r.status === 400,
  });
}
```

**Acceptance Criteria:**
- Tổng số đơn hàng thành công = 10 (đúng bằng stock)
- `stock` cuối cùng = 0, không phải số âm
- Không có đơn hàng nào tạo thành công khi stock đã hết
- Tất cả transactions đều commit hoặc rollback sạch

---

#### TC-PERF-003: Health check endpoint

| Thuộc tính | Giá trị |
|---|---|
| **ID** | TC-PERF-003 |
| **Module** | Health Check |
| **Priority** | P3 |
| **Type** | Performance |

**Steps:**
1. Gửi `GET /api/health` với 200 concurrent requests

**Expected Result:**
- HTTP 200 OK
- Response time < 50ms p99
- Response: `{ status: "ok", db: "connected" }`

---

## 6. Security Test Checklist

### 6.1 SQL Injection

| ID | Test Case | Method | Expected |
|---|---|---|---|
| SEC-SQL-001 | Search parameter: `'; DROP TABLE products; --` | GET /api/products?search= | 200 OK, không xảy ra lỗi DB, parameterized query bảo vệ |
| SEC-SQL-002 | Search: `' OR '1'='1` | GET /api/products?search= | Trả về kết quả bình thường, không expose tất cả records |
| SEC-SQL-003 | Login email: `admin'--` | POST /api/auth/login | 401 Unauthorized, không bypass auth |
| SEC-SQL-004 | Login email: `' OR 1=1--` | POST /api/auth/login | 401 Unauthorized |
| SEC-SQL-005 | Product slug: `sofa' OR '1'='1` | GET /api/products/:slug | 404 Not Found, không trả dữ liệu ngẫu nhiên |

**Verification method**: Xem query logs PostgreSQL, đảm bảo tất cả queries dùng `$1, $2` placeholders (parameterized).

---

### 6.2 JWT Manipulation

| ID | Test Case | Expected |
|---|---|---|
| SEC-JWT-001 | Thay đổi payload JWT (base64 decode → edit role="admin" → re-encode) | 401 Invalid signature |
| SEC-JWT-002 | Dùng JWT với chữ ký bị cắt bớt | 401 Unauthorized |
| SEC-JWT-003 | Dùng JWT với `alg: "none"` (algorithm confusion attack) | 401 Unauthorized |
| SEC-JWT-004 | Dùng JWT của user khác để truy cập endpoint | 401 hoặc 403 |
| SEC-JWT-005 | JWT với `exp` bị sửa sang tương lai | 401 Invalid signature |

**Test command:**
```bash
# Tạo JWT với alg:none
echo '{"alg":"none","typ":"JWT"}' | base64 | tr -d '='
echo '{"id":1,"role":"admin"}' | base64 | tr -d '='
# Send: header.payload. (chữ ký rỗng)
```

---

### 6.3 Unauthorized Admin Access

| ID | Test Case | Expected |
|---|---|---|
| SEC-AUTHZ-001 | Customer token → `POST /api/admin/products` | 403 Forbidden |
| SEC-AUTHZ-002 | Customer token → `GET /api/admin/orders` | 403 Forbidden |
| SEC-AUTHZ-003 | Customer token → `PUT /api/admin/orders/:id/status` | 403 Forbidden |
| SEC-AUTHZ-004 | Customer token → `DELETE /api/admin/products/:id` | 403 Forbidden |
| SEC-AUTHZ-005 | Không có token → tất cả admin endpoints | 401 Unauthorized |
| SEC-AUTHZ-006 | Customer chỉ thấy đơn hàng của chính mình | `GET /api/orders` không trả đơn của người khác |

---

### 6.4 XSS (Cross-Site Scripting)

| ID | Test Case | Expected |
|---|---|---|
| SEC-XSS-001 | Admin tạo sản phẩm với `name: "<script>alert('xss')</script>"` | Tên được escape khi render, không thực thi script |
| SEC-XSS-002 | Admin tạo sản phẩm với `description: "<img src=x onerror=alert(1)>"` | Attribute bị sanitize hoặc loại bỏ |
| SEC-XSS-003 | User tìm kiếm: `<script>document.cookie='stolen='+document.cookie</script>` | Search input được escape, không thực thi |
| SEC-XSS-004 | Tên user khi đăng ký: `<b>Hello</b>` | Render plain text, không render HTML |

**Verification**: Sử dụng Angular's built-in sanitization (`DomSanitizer`). Kiểm tra với Chrome DevTools console không có alerts.

---

### 6.5 Các kiểm tra bảo mật khác

| ID | Test Case | Expected |
|---|---|---|
| SEC-MISC-001 | Kiểm tra CORS headers | Chỉ cho phép origin từ FRONTEND_URL |
| SEC-MISC-002 | Kiểm tra rate limiting trên login endpoint | Sau 10 lần sai → 429 Too Many Requests |
| SEC-MISC-003 | Kiểm tra password không được lưu plain text trong DB | `SELECT password FROM users` → bcrypt hash |
| SEC-MISC-004 | Kiểm tra HTTPS redirect trong production | HTTP 301 redirect sang HTTPS |
| SEC-MISC-005 | Kiểm tra sensitive data trong error messages | Lỗi không expose DB schema, stack trace |
| SEC-MISC-006 | Kiểm tra `Authorization` header không được log | Logs backend không chứa JWT token |

---

## 7. Bug Report Template & Sample Bug Reports

### 7.1 Bug Report Template

```
**Title**: [Module] Mô tả ngắn gọn vấn đề
**Bug ID**: BUG-XXX
**Reported By**: [Tên QA]
**Date**: YYYY-MM-DD
**Severity**: Critical / High / Medium / Low
**Priority**: P1 / P2 / P3 / P4
**Status**: New / In Progress / Fixed / Verified / Closed

**Environment**:
- OS: [Windows/Linux/macOS]
- Browser: [Chrome 120 / Firefox 121]
- Backend: [local / staging / production]
- Version/Commit: [git commit hash]

**Steps to Reproduce**:
1. [Bước 1]
2. [Bước 2]
3. [Bước 3]

**Expected Result**:
[Mô tả kết quả mong muốn]

**Actual Result**:
[Mô tả kết quả thực tế]

**Root Cause** (nếu đã biết):
[Phân tích nguyên nhân]

**Screenshots/Logs**:
[Đính kèm ảnh, logs liên quan]

**Workaround** (nếu có):
[Cách tạm thời giải quyết]

**Fix Suggestion** (tùy chọn):
[Gợi ý hướng fix]
```

---

### 7.2 BUG-001: Race Condition — Stock âm khi 2 user đồng thời checkout

```
**Title**: [Orders] Stock sản phẩm bị âm khi nhiều user đồng thời checkout
**Bug ID**: BUG-001
**Reported By**: QA Engineer
**Date**: 2026-03-05
**Severity**: Critical
**Priority**: P1
**Status**: New

**Environment**:
- Backend: staging
- Database: PostgreSQL 16
- Version/Commit: main@a3f2c1d

**Steps to Reproduce**:
1. Tạo sản phẩm "Ghế Xoay Văn Phòng" với stock = 1
2. Tạo 2 tài khoản: userA và userB
3. Cả 2 user thêm sản phẩm trên vào giỏ hàng (quantity=1)
4. Dùng script gửi đồng thời 2 requests POST /api/orders:
   curl -X POST http://localhost:3000/api/orders -H "Authorization: Bearer $TOKEN_A" &
   curl -X POST http://localhost:3000/api/orders -H "Authorization: Bearer $TOKEN_B" &
5. Sau khi cả 2 hoàn thành, kiểm tra DB:
   SELECT stock FROM products WHERE id = <id>;

**Expected Result**:
- Đúng 1 trong 2 requests thành công (HTTP 201)
- Request còn lại thất bại với HTTP 400 "Sản phẩm không đủ hàng"
- stock = 0 trong DB

**Actual Result**:
- Cả 2 requests đều trả về HTTP 201 Created
- 2 đơn hàng được tạo thành công
- stock = -1 trong DB (DATA INTEGRITY VIOLATION)

**Root Cause**:
Trong createOrder controller, câu lệnh kiểm tra stock và câu lệnh UPDATE stock
không nằm trong cùng một transaction với lệnh SELECT FOR UPDATE.
Query hiện tại:
  1. SELECT stock FROM products WHERE id=$1  ← không lock
  2. (kiểm tra stock trong Node.js)
  3. UPDATE products SET stock=stock-$qty WHERE id=$1
Trong khoảng thời gian giữa bước 1 và bước 3, user kia cũng đọc được stock=1,
cả 2 đều pass kiểm tra và cùng update stock.

**Screenshots/Logs**:
[Xem logs/concurrent-checkout-test.log]

**Workaround**:
Không có workaround an toàn. Cần fix ngay trước khi deploy production.

**Fix Suggestion**:
Thêm SELECT ... FOR UPDATE trong transaction:
  BEGIN;
  SELECT stock FROM products WHERE id=$1 FOR UPDATE;  -- lock row
  -- kiểm tra stock
  UPDATE products SET stock=stock-$qty WHERE id=$1;
  -- tạo order, order_items
  COMMIT;
PostgreSQL sẽ block transaction thứ 2 cho đến khi transaction thứ nhất commit/rollback.
```

---

### 7.3 BUG-002: JWT Token Không Bị Invalidate Sau Khi Đăng Xuất

```
**Title**: [Auth] JWT token vẫn hoạt động sau khi user đăng xuất
**Bug ID**: BUG-002
**Reported By**: QA Engineer
**Date**: 2026-03-05
**Severity**: High
**Priority**: P2
**Status**: New

**Environment**:
- Backend: local + staging
- Browser: Chrome 120
- Version/Commit: main@a3f2c1d

**Steps to Reproduce**:
1. Đăng nhập với tài khoản user@example.com
2. Copy JWT token từ localStorage (F12 → Application → Local Storage → token)
3. Click "Đăng xuất" trong UI
4. Xác nhận đã đăng xuất (redirect về trang chủ, nút "Đăng nhập" hiển thị)
5. Dùng Postman hoặc curl gửi request với token đã copy:
   GET http://localhost:3000/api/auth/me
   Authorization: Bearer <copied_token>
6. Xem response

**Expected Result**:
- HTTP 401 Unauthorized
- Token đã đăng xuất không còn hiệu lực
- Response: "Token đã hết hạn hoặc không hợp lệ"

**Actual Result**:
- HTTP 200 OK
- API trả về user data bình thường
- Token vẫn hoạt động cho đến khi hết hạn tự nhiên (giả sử 7 ngày)

**Root Cause**:
Backend chỉ verify chữ ký JWT mà không có cơ chế token blacklist.
Logout hiện tại chỉ xóa token ở phía client (localStorage), không invalidate ở server.
Nếu attacker đánh cắp được token trước khi logout, họ vẫn có thể dùng trong 7 ngày.

**Workaround**:
Rút ngắn JWT expiry time về 15-30 phút (kết hợp refresh token).

**Fix Suggestion**:
Phương án 1 (ngắn hạn): Lưu token vào Redis blacklist khi logout,
  middleware authenticate kiểm tra blacklist trước khi validate.
Phương án 2 (dài hạn): Implement refresh token pattern.
  - Access token: 15 phút
  - Refresh token: 7 ngày, lưu trong DB
  - Logout: xóa refresh token khỏi DB
```

---

### 7.4 BUG-003: Giá Sản Phẩm Không Được Snapshot Khi Thêm Vào Giỏ Hàng

```
**Title**: [Cart/Orders] Thay đổi giá sản phẩm sau khi thêm vào giỏ ảnh hưởng đến tổng tiền hiển thị
**Bug ID**: BUG-003
**Reported By**: QA Engineer
**Date**: 2026-03-05
**Severity**: Medium
**Priority**: P2
**Status**: New

**Environment**:
- Frontend: Angular 17
- Backend: Express, local
- Version/Commit: main@a3f2c1d

**Steps to Reproduce**:
1. Đăng nhập với tài khoản customer
2. Thêm sản phẩm "Bàn Trà Gỗ" (giá: 2.000.000 VND) vào giỏ hàng
3. Đăng nhập với tài khoản admin (tab khác)
4. Admin cập nhật giá sản phẩm "Bàn Trà Gỗ" lên 3.500.000 VND
5. Quay lại tab customer, mở giỏ hàng
6. Quan sát giá hiển thị và tổng tiền

**Expected Result**:
- Giỏ hàng hiển thị giá 2.000.000 VND (giá tại thời điểm thêm vào giỏ)
- Hoặc có cảnh báo: "Giá sản phẩm đã thay đổi từ 2.000.000 lên 3.500.000"
- User có thể chọn tiếp tục hoặc xóa khỏi giỏ

**Actual Result**:
- Giỏ hàng ngay lập tức hiển thị giá mới 3.500.000 VND
- Không có cảnh báo nào
- Tổng tiền thay đổi mà user không hay biết

**Root Cause**:
API GET /api/cart join trực tiếp với bảng products để lấy giá hiện tại:
  SELECT ci.*, p.price, p.name FROM cart_items ci JOIN products p ON ci.product_id = p.id
Giỏ hàng không lưu giá tại thời điểm thêm vào (không có cột price trong cart_items).
Chỉ khi tạo order, giá mới được snapshot vào order_items.price.

**Impact**:
- UX kém: user có thể bị sốc khi thấy tổng tiền thay đổi
- Pháp lý: có thể gây tranh chấp nếu giá tăng mạnh
- Positive case: Nếu giá giảm thì user được lợi — acceptable

**Workaround**:
User nên checkout ngay sau khi thêm vào giỏ để tránh biến động giá.

**Fix Suggestion**:
Phương án 1: Thêm cột `price_at_add` vào bảng `cart_items`, lưu giá khi thêm.
  Khi hiển thị giỏ hàng, so sánh với giá hiện tại và hiển thị cảnh báo nếu khác.
Phương án 2: Chấp nhận behavior hiện tại nhưng thêm thông báo:
  "Giá có thể thay đổi. Tổng tiền cuối cùng được xác nhận khi đặt hàng."
Phương án 3 (BA quyết định): Định nghĩa rõ business rule trong spec.
```

---

## 8. Test Execution & Reporting

### 8.1 Test Execution Plan

| Sprint | Giai đoạn | Loại test | Ai thực hiện |
|---|---|---|---|
| Sprint 1 | Development | Unit tests (tự động) | Developer |
| Sprint 1 | Code review | Unit tests review | QA + Dev |
| Sprint 1 | End of sprint | Integration tests | QA |
| Sprint 2 | Feature complete | E2E tests | QA |
| Sprint 2 | Pre-release | Security checklist | QA + DevOps |
| Sprint 2 | Staging | Performance tests | QA + DevOps |
| Release | Production | Smoke tests | DevOps |

### 8.2 Definition of Done (Kiểm thử)

Một user story được coi là "Done" khi:
- [ ] Unit tests đã viết và pass (coverage >= 80%)
- [ ] Integration tests cho API endpoints liên quan pass
- [ ] Test cases trong tài liệu này đã được chạy và pass
- [ ] Không có bug P1/P2 mở
- [ ] E2E test cho critical path liên quan pass
- [ ] Code review đã approval
- [ ] QA sign-off

### 8.3 Regression Test Suite

Trước mỗi release, chạy full regression:

```bash
# Backend unit + integration tests
cd backend && npm test -- --coverage

# Frontend unit tests
cd frontend && npm test -- --watch=false --code-coverage

# E2E tests (Cypress)
cd frontend && npx cypress run --spec "cypress/e2e/**/*.cy.ts"

# Generate combined report
npm run test:report
```

### 8.4 CI/CD Integration

Trong `.github/workflows/deploy.yml`, pipeline phải bao gồm:

```yaml
test-backend:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_DB: furniture_test
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
  steps:
    - run: cd backend && npm ci && npm test -- --ci --coverage
    - uses: codecov/codecov-action@v3

test-frontend:
  runs-on: ubuntu-latest
  steps:
    - run: cd frontend && npm ci && npm test -- --watch=false --browsers=ChromeHeadless
```

**Deploy chỉ được phép chạy nếu tất cả test jobs pass.**

---

*Tài liệu này do QA Engineer tạo và duy trì. Cập nhật khi có thay đổi yêu cầu từ BA hoặc phát sinh bug mới.*
*Phiên bản tiếp theo: thêm test cases cho tính năng wishlist, product review, coupon codes.*
