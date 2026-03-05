# FurnitureShop — Project Plan

**Phiên bản**: 1.0
**Ngay cap nhat**: 2026-03-05
**Trang thai**: Active
**Chu du an**: ndlong75
**Repository**: github.com/ndlong75/furniture-shop

---

## Muc luc

1. [Project Overview](#1-project-overview)
2. [Scope](#2-scope)
3. [Tech Stack & Rationale](#3-tech-stack--rationale)
4. [Team & SDLC Agents](#4-team--sdlc-agents)
5. [Sprint Roadmap](#5-sprint-roadmap)
6. [Milestones & Timeline](#6-milestones--timeline)
7. [Risks & Mitigations](#7-risks--mitigations)
8. [Definition of Done](#8-definition-of-done)

---

## 1. Project Overview

### 1.1 Gioi thieu du an

**FurnitureShop** la mot nen tang thuong mai dien tu chuyen ban do noi that truc tuyen, duoc xay dung nham phuc vu nhu cau mua sam noi that cua nguoi Viet Nam. Nguoi dung co the duyet san pham, tim kiem, loc theo danh muc va gia, them vao gio hang, dat don hang va theo doi lich su mua hang — tat ca trong mot giao dien web hien dai, nhanh chong va than thien.

**FurnitureShop** is an online furniture retail platform built with a modern full-stack architecture (Angular 17 + Node.js/Express + PostgreSQL), containerized with Docker and deployed to a VPS via automated CI/CD. The platform targets Vietnamese customers shopping for home furniture, offering a seamless experience from product discovery through checkout and order tracking.

### 1.2 Muc tieu kinh doanh (Business Goals)

| # | Muc tieu | Thanh cong khi |
|---|----------|---------------|
| 1 | Cung cap nen tang mua sam noi that truc tuyen | Khach hang hoan thanh don hang trong < 5 phut |
| 2 | Quan ly hang ton kho hieu qua | Admin cap nhat san pham va theo doi ton kho theo thoi gian thuc |
| 3 | Xay dung long tin cua khach hang | Thong tin san pham ro rang, thanh toan bao mat, theo doi don hang minh bach |
| 4 | Mo rong san pham linh hoat | He thong category co the them moi khong can thay doi code |
| 5 | Trien khai nhanh chong, on dinh | CI/CD tu dong, zero-downtime deployment |

### 1.3 Nguoi dung muc tieu (Target Users)

**Khach hang (End Customer)**
- Nguoi Viet Nam trong do tuoi 22–45, dang tim mua noi that cho can ho/nha o
- Quen su dung cac nen tang e-commerce: Shopee, Lazada, Tiki
- Mong muon: tim kiem nhanh, gia ca ro rang, dat hang don gian, giao hang dang tin cay

**Quan tri vien (Admin)**
- Nhan vien cua hang hoac chu shop
- Can quan ly danh muc san pham, theo doi va cap nhat trang thai don hang
- Khong yeu cau ky nang lap trinh — giao dien admin phai truc quan va de su dung

### 1.4 Gia tri kinh doanh (Business Value)

- **Chi phi thap**: Su dung cong nghe open-source (Angular, Node.js, PostgreSQL), deploy tren VPS don gian, khong phu thuoc vao dich vu cloud dat tien
- **Time-to-market nhanh**: Bo cong cu SDLC AI (PM, BA, QA, DevOps, Customer agents) giup giam thoi gian lap ke hoach, viet tai lieu va review code
- **Kha nang mo rong**: Kien truc ro rang, tach biet frontend/backend, de dang them tinh nang moi (thanh toan online, danh gia san pham, chuong trinh khuyen mai)
- **Chat luong cao**: CI/CD voi automated tests dam bao moi thay doi duoc kiem tra truoc khi len production

---

## 2. Scope

### 2.1 In-Scope: MVP Features (Pham vi du an — Giai doan dau)

#### 2.1.1 Quan ly tai khoan nguoi dung

- **Dang ky tai khoan**: Nguoi dung moi dang ky bang ten, email va mat khau
- **Dang nhap / Dang xuat**: Xac thuc bang JWT, phien lam viec duoc duy tri 7 ngay
- **Xem thong tin ca nhan**: Endpoint `/api/auth/me` tra ve thong tin nguoi dung hien tai
- **Phan quyen**: Hai vai tro — `customer` va `admin`

#### 2.1.2 Danh muc va san pham

- **Danh muc san pham**: Sofa, Ghe, Ban, Giuong, Ke tu, Trang tri
- **Trang danh sach san pham**: Phan trang, loc theo danh muc, khoang gia, tim kiem theo tu khoa
- **Trang chi tiet san pham**: Ten, mo ta, gia, ton kho, anh san pham, danh muc
- **Slug-based URL**: San pham duoc truy cap qua URL than thien (`/products/sofa-goc-l-3-cho`)

#### 2.1.3 Gio hang (Cart)

- **Them san pham vao gio**: Upsert — neu san pham da co trong gio, cap nhat so luong
- **Xem gio hang**: Hien thi danh sach san pham, so luong, gia don vi, tong gia
- **Cap nhat so luong**: Tang/giam so luong tung san pham
- **Xoa san pham khoi gio**: Xoa theo item ID
- **Gio hang server-side**: Luu trong database, khong mat khi nguoi dung dong trinh duyet

#### 2.1.4 Dat hang va quan ly don hang

- **Dat hang**: Chuyen gio hang thanh don hang, ghi nhan gia tai thoi diem mua, tru ton kho, xoa gio hang
- **Lich su don hang**: Nguoi dung xem cac don hang da dat
- **Trang thai don hang**: `pending` → `processing` → `shipped` → `delivered`
- **Giao dich atomic**: Su dung PostgreSQL transaction dam bao tinh nhat quan du lieu

#### 2.1.5 Admin Panel

- **Quan ly san pham**: Them, sua, xoa mem (soft delete) san pham
- **Quan ly don hang**: Xem tat ca don hang, cap nhat trang thai
- **Bao ve route admin**: Chi admin moi truy cap duoc cac chuc nang nay

#### 2.1.6 Infrastructure & DevOps

- **Docker Compose**: Trien khai toan bo he thong (Postgres + Backend + Frontend + Nginx) voi mot lenh
- **CI/CD**: GitHub Actions tu dong test → build Docker images → deploy len VPS khi push len `main`
- **HTTPS/SSL**: Let's Encrypt certificate qua Certbot
- **Health check endpoint**: `/api/health` cho monitoring

### 2.2 Out-of-Scope (Khong nam trong pham vi hien tai)

Cac tinh nang sau KHONG duoc xay dung trong giai doan MVP. Se duoc xem xet cho cac phien ban tiep theo:

| Tinh nang | Ly do chua lam | Phien ban du kien |
|-----------|---------------|------------------|
| Thanh toan truc tuyen (VNPay, Momo, Stripe) | Do phuc tap tich hop, can giay phep kinh doanh | v2.0 |
| Danh gia san pham (rating/review) | Ngu canh tat ca san pham moi, chua co du lieu rating | v2.0 |
| Chuong trinh khuyen mai / coupon | Quy tac kinh doanh phuc tap, can BA spec chi tiet | v2.0 |
| Tinh nang live chat / ho tro khach hang | Can tich hop third-party (Zendesk, Tawk.to) | v2.0 |
| App mobile native (iOS/Android) | Chua co du lieu ve nhu cau mobile-first | v3.0 |
| Multi-vendor / marketplace | Thay doi lon ve kien truc va quy tac kinh doanh | v3.0 |
| Quan ly kho hang nang cao (nhieu kho) | Vuot ngoai pham vi ban le nho | v3.0 |
| Analytics / bao cao doanh thu | Can tich hop BI tools | v2.0 |
| Giao hang / tinh phi ship | Phu thuoc vao doi tac giao hang | v2.0 |
| Push notification / email marketing | Can SMTP service va cau hinh rieng | v2.0 |

---

## 3. Tech Stack & Rationale

### 3.1 Frontend: Angular 17

**Ly do chon**:
- **Standalone components**: Loai bo NgModule boilerplate, code ngan gon hon, de doc hon
- **Signals API**: Reactive state management don gian, hieu nang cao, thay the RxJS cho cac truong hop co ban (AuthService.currentUser, CartService.itemCount)
- **Lazy loading**: Chi load route khi can, giam initial bundle size, cai thien LCP
- **TypeScript first-class**: Type safety xuyen suot tu model den component den service
- **Structured project**: Angular CLI tao cau truc thu muc nhat quan, phu hop lam viec nhom
- **Rong rai tai Viet Nam**: Nhieu developer Angular tai VN, de tuyen dung va on-board

**Alternatives considered**: React (thieu structure cho du an lon), Vue.js (ecosystem nho hon), Next.js (SSR khong can thiet cho admin-heavy app nay)

### 3.2 Backend: Node.js + Express + TypeScript

**Ly do chon**:
- **Nhanh va nhe**: Express la minimal framework, khoi dong nhanh, phu hop VPS nho
- **TypeScript**: Type safety cho API contracts va database queries, bat loi som
- **Chia se models**: Frontend va backend co the chia se TypeScript interfaces (Product, User, Cart, Order)
- **Ecosystem phong phu**: npm co moi library can thiet (pg, jsonwebtoken, bcrypt, cors)
- **Controller pattern**: Tach biet ro rang giua routing va business logic

**Alternatives considered**: NestJS (qua phuc tap cho du an nay), Go/Gin (team khong quen), Python/FastAPI (thay doi ngon ngu so voi frontend)

### 3.3 Database: PostgreSQL 16

**Ly do chon**:
- **ACID transactions**: Quan trong cho checkout flow — tru stock, tao order, xoa cart phai atomic
- **Relational integrity**: Foreign keys dam bao du lieu nhat quan (order_items → products, cart_items → users)
- **Raw SQL voi pg**: Khong dung ORM, viet query toi uu truc tiep, tranh N+1 de kiem soat hon
- **Parameterized queries**: Bao ve chong SQL injection theo built-in
- **JSON support**: Co the luu metadata linh hoat neu can (tuong lai)
- **pg library**: Mature, well-tested PostgreSQL client cho Node.js

**Alternatives considered**: MySQL (PostgreSQL tot hon ve JSON, window functions), MongoDB (schema nao de dan den du lieu khong nhat quan trong e-commerce)

### 3.4 Deployment: Docker Compose + Nginx

**Ly do chon**:
- **Portable**: Chay duoc tren bat ky VPS nao co Docker, khong phu thuoc OS
- **Isolation**: Postgres, backend, frontend chay trong container rieng biet, khong xung dot
- **Nginx reverse proxy**: Phuc vu Angular SPA tinh (HTML/JS/CSS), proxy `/api` den backend, xu ly SSL termination
- **docker-compose.prod.yml**: Tach biet cau hinh dev va production ro rang

**Alternatives considered**: Kubernetes (qua phuc tap cho quy mo nay), PM2 (thieu isolation), serverless (cold start bat loi cho e-commerce)

### 3.5 CI/CD: GitHub Actions

**Ly do chon**:
- **Mien phi** cho repo public va muc su dung thap
- **Tich hop san** voi GitHub — khong can cong cu ngoai
- **SSH deployment**: Push to VPS don gian, khong can cloud registry phuc tap
- **Secrets management**: GitHub Secrets luu env vars an toan, khong hard-code

**Workflow**:
```
push main → run tests → build Docker images → SSH to VPS → docker compose up -d → migrate → health check
```

---

## 4. Team & SDLC Agents

FurnitureShop su dung mo hinh **AI-assisted SDLC** voi cac agent chuyen biet. Moi agent co file dinh nghia trong `.claude/agents/` va duoc invoke trong Claude Code.

### 4.1 Project Manager (PM)

**File**: `.claude/agents/pm.md`

**Vai tro va trach nhiem**:
- Dinh nghia va duy tri product backlog va sprint goals
- Chia nho tinh nang thanh cac task co the thuc hien voi acceptance criteria ro rang
- Xac dinh phu thuoc (dependencies) va blocker giua frontend, backend, DevOps
- Theo doi velocity, phat hien scope creep som
- Pho bien ke hoach cho tat ca cac agent, dam bao alignment

**Su dung khi**:
- Can uu tien hoa tinh nang: "Chung ta nen xay dung gi tiep theo?"
- Viet user stories: "Viet user stories cho tinh nang gio hang"
- Danh gia rui ro: "Nhung rui ro khi them tich hop thanh toan la gi?"
- Lap ke hoach sprint: "Lap ke hoach Sprint 2"

### 4.2 Business Analyst (BA)

**File**: `.claude/agents/ba.md`

**Vai tro va trach nhiem**:
- Viet user stories chi tiet voi acceptance criteria (Given/When/Then format)
- Dinh nghia data models va entity relationships
- Xac dinh API contracts (method, path, request/response shape)
- Mo ta wireframe va user flow (ASCII/text)
- Validate implementation so voi business requirements
- Xac dinh edge cases va business rules quan trong

**Quy tac kinh doanh chinh**:
- San pham co the het hang — nguoi dung khong the dat san pham het hang
- Gio hang luu tren server, khong mat khi dong trinh duyet
- Don hang la bat bien sau khi dat — gia duoc snapshot tai thoi diem mua
- Ton kho giam atomic cung voi tao don hang
- Admin co the doi trang thai don hang theo mot chieu: pending → processing → shipped → delivered

**Su dung khi**:
- Viet user stories: "Viet user stories cho loc san pham"
- Dinh nghia API: "Checkout endpoint nen co dang nao?"
- Lam ro nghiep vu: "Dieu gi xay ra khi san pham het hang trong khi thanh toan?"

### 4.3 QA Engineer

**File**: `.claude/agents/qa.md`

**Vai tro va trach nhiem**:
- Dinh nghia chien luoc test (unit, integration, e2e)
- Viet test cases voi steps ro rang va expected results
- Xac dinh va ghi lai bugs voi repro steps
- Review code ve testability va failure scenarios
- Validate API contracts so voi BA spec
- Tao test data / seed scripts

**Pham vi test**:
- **Unit tests**: Angular components + services (Jasmine/Karma), backend utilities (Jest)
- **Integration tests**: API endpoints + real test PostgreSQL (Jest + Supertest)
- **E2E tests**: Happy paths (Cypress/Playwright) — browse → cart → checkout, admin flow

**Edge cases quan trong**:
- Them san pham het hang vao gio
- Doi so luong ve 0 (phai xoa item)
- Dat hang khi JWT het han
- SQL injection trong o tim kiem
- Checkout dong thoi (hai nguoi mua item cuoi cung)

**Su dung khi**:
- Viet test cases: "Viet test cases cho luong dang nhap"
- Review chat luong: "Review cart service ve edge cases"
- Tao bug report: "Viet bug report cho van de het hang"

### 4.4 DevOps Engineer

**File**: `.claude/agents/devops.md`

**Vai tro va trach nhiem**:
- Duy tri Docker Compose (dev va production)
- Cau hinh Nginx reverse proxy va static file serving
- Quan ly GitHub Actions CI/CD pipeline
- Quan ly environment variables va secrets
- Chien luoc backup database
- Monitor application health
- Cai dat SSL/TLS (Let's Encrypt)

**Infrastructure**:
```
VPS (Ubuntu 22.04)
└── Docker Compose
    ├── nginx        (port 80/443)  — serves Angular + proxies /api
    ├── backend      (port 3000)    — Node.js Express API
    └── postgres     (port 5432)    — PostgreSQL database (volume-mounted)
```

**Su dung khi**:
- Review cau hinh deploy: "Kiem tra Docker Compose production co van de gi khong?"
- Debug: "Container backend cu restart — can kiem tra gi?"
- SSL: "Cach cau hinh HTTPS tren VPS?"
- CI/CD: "Cap nhat workflow de chay tests truoc khi deploy"

### 4.5 Customer (End-User Persona)

**File**: `.claude/agents/customer.md`

**Persona**: Minh Anh, 32 tuoi, lan dau mua nha, dang noi that can ho tai TP. Ho Chi Minh. Quen dung Shopee, Lazada, Tiki.

**Vai tro va trach nhiem**:
- Cung cap phan hoi nguoi dung cuoi (plain-language, khong dung thuat ngu ky thuat)
- Xac dinh luong nao gay boi roi hoac kho dung
- Validate rang app dap ung nhu cau thuc su
- Danh gia UX: tim kiem, navigation, checkout, mobile experience
- Viet ban sao thong bao than thien voi nguoi dung

**Mong muon cua khach hang**:
- Tim duoc san pham can nhanh chong (tim kiem, danh muc, loc gia)
- Hinh anh va mo ta du ro de mua online
- Gia ro rang, khong co phi an
- Website trong co chuyen nghiep, bao mat
- Thong tin giao hang minh bach
- De dang doi/tra hang neu co van de

**Su dung khi**:
- Phan hoi nguoi dung: "Review luong checkout tu goc do khach hang"
- Xac thuc UX: "Trang chi tiet san pham co du ro de mua khong?"
- Tim pain points: "Dieu gi co the gay boi roi cho khach hang moi o trang chu?"

### 4.6 Code Reviewer

**File**: `.claude/agents/code-reviewer.md`

**Vai tro va trach nhiem**:
- Review pull requests va code changes tren ca Angular frontend va Node.js backend
- Dam bao security (khong SQL injection, JWT bao mat, auth middleware dung cho)
- Kiem tra code quality (error handling, transactions, no N+1 queries)
- Enforce TypeScript best practices (no `any`, interfaces trong `models/`, strict null)
- Xac nhan database migrations dung chuan (indexes, ON DELETE, updated_at triggers)
- Kiem tra test coverage du cho feature moi

**Cac check bao mat quan trong** (block merge neu vi pham):
- Parameterized queries — khong string interpolation trong SQL
- JWT secret tu `process.env.JWT_SECRET` — khong hardcode
- Password hash KHONG tra ve trong API response
- `authenticate` middleware tren tat ca protected routes
- `requireAdmin` middleware tren tat ca `/api/admin/*` routes

**Su dung khi**:
- Review feature moi: "Review checkout controller"
- Pre-merge check: "Kiem tra toan bo cart service changes"
- Security audit: "Kiem tra tat ca backend routes ve auth middleware"
- Performance review: "Review product listing component"

---

## 5. Sprint Roadmap

Moi sprint dai **2 tuan**. Tong du an: **8 tuan** (4 sprints).

**Ngay bat dau**: 2026-03-05
**Ngay hoan thanh du kien**: 2026-04-30

### Sprint Overview

| Sprint | Ten | Thoi gian | Focus chinh |
|--------|-----|-----------|-------------|
| Sprint 1 | Foundation & Auth | Tuan 1–2 (2026-03-05 → 2026-03-18) | Setup, Auth, Product Catalog |
| Sprint 2 | Commerce Core | Tuan 3–4 (2026-03-19 → 2026-04-01) | Cart, Checkout, Orders |
| Sprint 3 | Admin & Polish | Tuan 5–6 (2026-04-02 → 2026-04-15) | Admin Panel, Search/Filter, UI Polish |
| Sprint 4 | QA & Deployment | Tuan 7–8 (2026-04-16 → 2026-04-29) | Testing, CI/CD, Production Deploy |

---

### Sprint 1: Foundation & Auth (Tuan 1–2)

**Muc tieu Sprint**: Xay dung nen tang du an, xac thuc nguoi dung, va danh sach san pham co ban.

| # | Task | Owner | Priority | Mo ta |
|---|------|-------|----------|-------|
| S1-01 | Project scaffolding | DevOps | P0 | Tao repo, cau truc thu muc, Docker Compose local |
| S1-02 | PostgreSQL schema | BA + Dev | P0 | Tao `001_init.sql` — users, categories, products, cart_items, orders, order_items |
| S1-03 | Backend project setup | Dev | P0 | Express + TypeScript, db pool, error handling middleware |
| S1-04 | Auth API: register + login | Dev | P0 | `POST /api/auth/register`, `POST /api/auth/login` tra ve JWT |
| S1-05 | Auth API: me + middleware | Dev | P0 | `GET /api/auth/me`, `authenticate` middleware, `requireAdmin` middleware |
| S1-06 | Products API: list + detail | Dev | P0 | `GET /api/products` (phan trang), `GET /api/products/:slug` |
| S1-07 | Categories API | Dev | P1 | `GET /api/products/categories` |
| S1-08 | Seed data | Dev | P1 | 6 danh muc, 12 san pham mau, 1 admin user |
| S1-09 | Angular project setup | Dev | P0 | Angular 17 standalone, routing, environment config, authInterceptor |
| S1-10 | Auth pages: Login + Register | Dev | P0 | Trang dang nhap, dang ky, guard redirect |
| S1-11 | Product list page | Dev | P0 | Hien thi danh sach san pham, phan trang co ban |
| S1-12 | Product detail page | Dev | P1 | Hien thi chi tiet san pham, slug-based routing |
| S1-13 | Navbar + Footer | Dev | P1 | Layout chung, hien thi trang thai dang nhap/dang xuat |
| S1-14 | Unit tests: Auth API | QA | P1 | Test register, login, invalid credentials |
| S1-15 | Docker Compose setup review | DevOps | P1 | Xem xet cau hinh, volumes, networks |

**Deliverables Sprint 1**:
- He thong co the chay bang `docker compose up`
- Nguoi dung dang ky, dang nhap, nhan JWT thanh cong
- Danh sach san pham hien thi tren frontend
- Trang chi tiet san pham co the truy cap

**Success Criteria Sprint 1**:
- [ ] `POST /api/auth/login` tra ve JWT hop le trong < 200ms
- [ ] `GET /api/products` tra ve danh sach co phan trang (page, limit)
- [ ] Token duoc luu vao localStorage va gui kem trong Authorization header
- [ ] Route `/login` redirect den `/products` sau khi dang nhap thanh cong
- [ ] Tat ca tests Sprint 1 pass (0 failures)

---

### Sprint 2: Commerce Core (Tuan 3–4)

**Muc tieu Sprint**: Xay dung luong mua hang day du — gio hang, thanh toan, dat hang, xem lich su don hang.

| # | Task | Owner | Priority | Mo ta |
|---|------|-------|----------|-------|
| S2-01 | Cart API: GET cart | Dev | P0 | `GET /api/cart` — tra ve gio hang voi thong tin san pham |
| S2-02 | Cart API: Add item | Dev | P0 | `POST /api/cart` — upsert (ON CONFLICT UPDATE) |
| S2-03 | Cart API: Update quantity | Dev | P0 | `PUT /api/cart/:itemId` — cap nhat so luong |
| S2-04 | Cart API: Remove item | Dev | P0 | `DELETE /api/cart/:itemId` — xoa san pham khoi gio |
| S2-05 | Order API: Create order | Dev | P0 | `POST /api/orders` — transaction: tao order, tru stock, xoa cart |
| S2-06 | Order API: Get user orders | Dev | P0 | `GET /api/orders` — lich su don hang nguoi dung |
| S2-07 | Stock validation | Dev | P0 | Kiem tra ton kho truoc khi them vao gio va truoc khi dat hang |
| S2-08 | Cart page (Angular) | Dev | P0 | Hien thi gio hang, cap nhat so luong, xoa item, tong tien |
| S2-09 | Checkout page (Angular) | Dev | P0 | Trang xac nhan don hang, nut dat hang |
| S2-10 | Order history page (Angular) | Dev | P1 | Danh sach don hang, trang thai, ngay dat |
| S2-11 | Cart service (Angular) | Dev | P0 | CartService voi signals (cart, itemCount), sync voi backend |
| S2-12 | Navbar cart badge | Dev | P1 | Hien thi so luong item trong gio tren navbar |
| S2-13 | Out-of-stock handling | Dev | P1 | An nut "them vao gio" khi het hang, thong bao ro rang |
| S2-14 | Price snapshot on order | Dev | P0 | Luu gia tai thoi diem dat hang trong order_items |
| S2-15 | Integration tests: Cart + Order | QA | P1 | Test add/update/delete cart, tao order, kiem tra stock deduction |
| S2-16 | E2E test: Browse → Cart → Checkout | QA | P1 | Luong happy path toan bo |

**Deliverables Sprint 2**:
- Nguoi dung co the them san pham vao gio hang
- Nguoi dung co the dat hang va xem xac nhan
- Gio hang duoc luu tren server, khong mat sau khi reload
- Ton kho giam chinh xac sau moi don hang

**Success Criteria Sprint 2**:
- [ ] Them san pham vao gio: response < 300ms, badge tren navbar cap nhat ngay lap tuc
- [ ] Dat hang tao PostgreSQL transaction thanh cong, gio hang bi xoa, stock giam dung
- [ ] Khong the dat hang khi san pham het hang (API tra ve 400, UI hien thi thong bao)
- [ ] Gio hang persist qua cac phien lam viec (reload, dong tab, mo lai)
- [ ] Integration tests: 100% pass tren cart CRUD va order creation

---

### Sprint 3: Admin & Polish (Tuan 5–6)

**Muc tieu Sprint**: Xay dung admin panel, nang cao tim kiem/loc san pham, va cai thien UX toan bo.

| # | Task | Owner | Priority | Mo ta |
|---|------|-------|----------|-------|
| S3-01 | Admin: Product CRUD API | Dev | P0 | `POST/PUT/DELETE /api/admin/products` voi requireAdmin middleware |
| S3-02 | Admin: List orders API | Dev | P0 | `GET /api/admin/orders` — tat ca don hang voi filter |
| S3-03 | Admin: Update order status API | Dev | P0 | `PUT /api/admin/orders/:id/status` |
| S3-04 | Admin dashboard page (Angular) | Dev | P0 | Trang quan tri — danh sach san pham, them/sua/xoa |
| S3-05 | Admin: Order management page | Dev | P0 | Danh sach don hang, cap nhat trang thai |
| S3-06 | Admin guard (Angular) | Dev | P0 | Redirect non-admin users khoi `/admin` routes |
| S3-07 | Product search API | Dev | P1 | `?search=` filter — full-text tren ten, mo ta san pham |
| S3-08 | Product filter: category + price | Dev | P1 | `?category=&minPrice=&maxPrice=` query params |
| S3-09 | Search & filter UI (Angular) | Dev | P1 | Search bar, dropdown danh muc, range gia tren trang san pham |
| S3-10 | Loading states | Dev | P1 | Skeleton screens / spinners cho tat ca async operations |
| S3-11 | Error handling UI | Dev | P1 | Thong bao loi than thien bang tieng Viet, khong hien raw server error |
| S3-12 | Mobile responsiveness | Dev | P1 | Kiem tra va fix UI tren man hinh < 768px |
| S3-13 | Product images | Dev | P2 | Hien thi anh san pham, fallback neu anh bi loi |
| S3-14 | Empty states | Dev | P2 | Thong bao khi gio hang trong, ket qua tim kiem rong, khong co don hang |
| S3-15 | Code review: Admin feature | Code Reviewer | P1 | Security audit — tat ca admin routes phai co requireAdmin |
| S3-16 | Customer UX review | Customer Agent | P1 | Review homepage, product listing, checkout tu goc do nguoi dung |
| S3-17 | BA: Validate admin spec | BA | P1 | Xac nhan admin CRUD khop voi yeu cau nghiep vu |

**Deliverables Sprint 3**:
- Admin co the them, sua, xoa san pham qua giao dien
- Admin co the xem va cap nhat trang thai tat ca don hang
- Tim kiem va loc san pham hoat dong dung
- Giao dien da duoc polish voi loading states va error messages thich hop

**Success Criteria Sprint 3**:
- [ ] Admin them san pham moi: hien thi tren danh sach san pham ngay lap tuc
- [ ] Khong the truy cap `/admin/*` khi khong phai admin (redirect den `/` hoac `/login`)
- [ ] Tim kiem: nhan ket qua trong < 500ms, khong co SQL injection (QA verified)
- [ ] Loc theo gia va danh muc hoat dong dung tren ca mobile va desktop
- [ ] Customer agent xac nhan: luong mua hang hoan chinh khong co diem boi roi ro rang

---

### Sprint 4: QA & Deployment (Tuan 7–8)

**Muc tieu Sprint**: Kiem thu toan dien, thiet lap CI/CD hoan chinh va deploy len production VPS.

| # | Task | Owner | Priority | Mo ta |
|---|------|-------|----------|-------|
| S4-01 | CI/CD pipeline: GitHub Actions | DevOps | P0 | Workflow: test → build → push GHCR → SSH deploy → health check |
| S4-02 | Production Docker Compose | DevOps | P0 | `docker-compose.prod.yml` voi GHCR images, env vars tu secrets |
| S4-03 | Nginx production config | DevOps | P0 | SSL termination, SPA routing, /api proxy, gzip, cache headers |
| S4-04 | VPS setup | DevOps | P0 | Ubuntu 22.04, Docker, Certbot, SSL certificate |
| S4-05 | GitHub Secrets setup | DevOps | P0 | VPS_HOST, VPS_USER, VPS_SSH_KEY, POSTGRES_*, JWT_SECRET, FRONTEND_URL |
| S4-06 | Database migration strategy | DevOps | P1 | Migration chay tu dong trong CI/CD, khong mat data khi deploy |
| S4-07 | Database backup | DevOps | P1 | Cron job backup PostgreSQL hang ngay, luu ra file |
| S4-08 | Full regression test | QA | P0 | Test tat ca happy paths va edge cases truoc release |
| S4-09 | Security penetration test | QA + Code Reviewer | P0 | SQL injection, XSS, auth bypass, CORS |
| S4-10 | Performance test | QA | P1 | Load test API endpoints, kiem tra phan trang hoat dong dung khi nhieu data |
| S4-11 | Frontend unit tests | QA | P1 | Test tat ca Angular services va components quan trong |
| S4-12 | Backend integration tests | QA | P1 | Test tat ca API endpoints voi real test database |
| S4-13 | E2E test suite | QA | P1 | 5 critical paths: browse, auth, cart/checkout, orders, admin |
| S4-14 | Production smoke test | QA + DevOps | P0 | Sau khi deploy, verify tat ca tinh nang chinh hoat dong |
| S4-15 | Documentation review | BA + PM | P2 | Xem xet lai CLAUDE.md, API docs, deployment guide |
| S4-16 | Monitoring setup | DevOps | P2 | UptimeRobot hoac tuong tu monitor /api/health |

**Deliverables Sprint 4**:
- CI/CD pipeline hoat dong hoan chinh (push to main → auto-deploy)
- Production site chay o domain that voi HTTPS
- Bao cao test coverage day du
- Khong con bug P0/P1 mo

**Success Criteria Sprint 4**:
- [ ] Push to `main` → site duoc deploy tu dong trong < 5 phut
- [ ] HTTPS hoat dong, certificate hop le
- [ ] `/api/health` tra ve 200 sau khi deploy
- [ ] Regression test: 100% pass cho 5 E2E critical paths
- [ ] Khong co SQL injection vulnerabilities (confirmed boi Code Reviewer)
- [ ] Trang san pham tai < 2 giay tren mang 4G
- [ ] Admin credentials hoat dong sau seed: admin@furnitureshop.vn / Admin@123

---

## 6. Milestones & Timeline

| Milestone | Noi dung | Ngay muc tieu | Trang thai |
|-----------|----------|---------------|------------|
| M0 | Project kickoff, setup repo, CLAUDE.md, agent definitions | 2026-03-05 | Done |
| M1 | Foundation complete — auth + product catalog hoat dong | 2026-03-18 | Planned |
| M2 | Commerce complete — cart + checkout + orders hoat dong | 2026-04-01 | Planned |
| M3 | Admin panel complete — CRUD products + order management | 2026-04-15 | Planned |
| M4 | Production launch — site live voi HTTPS, CI/CD hoat dong | 2026-04-29 | Planned |

### Timeline chi tiet

```
Tuan 1  (03/05 - 03/11): Project setup, database schema, backend skeleton, auth API
Tuan 2  (03/12 - 03/18): Product API, Angular setup, auth pages, product listing [M1]
Tuan 3  (03/19 - 03/25): Cart API (full CRUD), Order API, cart page Angular
Tuan 4  (03/26 - 04/01): Checkout page, order history, stock validation, integration tests [M2]
Tuan 5  (04/02 - 04/08): Admin CRUD API, admin dashboard Angular, admin guards
Tuan 6  (04/09 - 04/15): Search/filter, UX polish, mobile, loading states, error handling [M3]
Tuan 7  (04/16 - 04/22): CI/CD pipeline, Docker prod, Nginx, VPS setup, SSL
Tuan 8  (04/23 - 04/29): Full QA, regression tests, production deploy, smoke test [M4]
```

### Key Decision Points

| Ngay | Quyet dinh can dua ra |
|------|----------------------|
| 2026-03-18 | Go/No-go Sprint 2: Auth va product catalog co on dinh khong? |
| 2026-04-01 | Go/No-go Sprint 3: Commerce core co pass integration tests khong? |
| 2026-04-15 | Feature freeze: Khong them tinh nang moi sau moc nay |
| 2026-04-22 | Go/No-go production: Tat ca P0 tests pass, security clear? |
| 2026-04-29 | Production launch hoac delay 1 tuan |

---

## 7. Risks & Mitigations

### 7.1 Bang rui ro

| # | Rui ro | Xac suat | Tac dong | Muc do | Bien phap giam thieu | Nguoi chiu trach nhiem |
|---|--------|----------|----------|--------|----------------------|------------------------|
| R01 | Concurrent checkout — hai nguoi mua san pham cuoi cung cung luc, dan den stock am | Trung binh | Cao | HIGH | Su dung PostgreSQL `SELECT FOR UPDATE` trong transaction tao don hang; kiem tra stock trong same transaction; tra loi 409 Conflict neu het hang | Dev + QA |
| R02 | JWT token lo (XSS) — token trong localStorage bi lay boi script doc hai | Trung binh | Cao | HIGH | Them Content-Security-Policy headers; sanitize tat ca user input; chi tra ve thong tin can thiet trong API; xem xet HttpOnly cookie thay viet cho v2 | Dev + Code Reviewer |
| R03 | VPS downtime — server di xuong lam mat revenue | Thap | Cao | MEDIUM | Health check monitoring (UptimeRobot); backup PostgreSQL hang ngay; co playbook restart thu cong; xem xet bo sung VPS backup | DevOps |
| R04 | Scope creep — them tinh nang (thanh toan online, delivery tracking) lam tre schedule | Cao | Trung binh | HIGH | Feature freeze sau Sprint 3 (2026-04-15); tat ca yeu cau moi phai duoc PM phe duyet; ghi ro Out-of-scope trong tai lieu nay | PM |
| R05 | SSL certificate het han — site bi bao mat khong an toan | Thap | Cao | MEDIUM | Cau hinh `certbot renew` qua cron job (2x/thang); set up alert neu certificate sap het han; test renewal truoc launch | DevOps |
| R06 | Database migration that bai tren production — deploy lam hong schema | Thap | Cao | HIGH | Test migrations tren staging truoc; migrations chi them, khong xoa cot; backup truoc moi migration; co rollback plan | DevOps + Dev |
| R07 | SQL injection qua search hoac filter — du lieu bi tiet lo hoac xoa | Thap | Rat cao | HIGH | Review 100% SQL queries — tat ca phai dung parameterized form ($1, $2); QA pen test truoc launch; Code Reviewer kiem tra moi PR | Dev + Code Reviewer + QA |
| R08 | Khong du test coverage — bug len production | Trung binh | Trung binh | MEDIUM | Dinh nghia DoD: moi feature phai co happy path + error case test; CI pipeline chay tests truoc deploy; QA review truoc moi sprint release | QA + PM |
| R09 | Image hosting — san pham khong co anh hoac anh cham tai | Trung binh | Thap | LOW | MVP dung URL anh tu internet; planning cho v2 dung cloud storage (S3/Cloudflare R2); always co fallback image | Dev |
| R10 | Team mo rong — onboard developer moi ton thoi gian | Thap | Trung binh | LOW | CLAUDE.md document hoa day du stack, commands, patterns; agents giup giai thich codebase nhanh; code review enforce patterns nhat quan | PM + Code Reviewer |

### 7.2 Risk Response Plan

**Doi voi R01 (Concurrent checkout)**:
```sql
-- Pattern duoc su dung trong createOrder:
BEGIN;
SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE;
-- Kiem tra stock >= requested quantity
-- Neu OK: INSERT order, UPDATE stock, DELETE cart items
COMMIT;
```

**Doi voi R07 (SQL injection)**:
```typescript
// DUNG: Luon luon parameterized
await pool.query('SELECT * FROM products WHERE id = $1', [productId]);

// TUYET DOI KHONG: String interpolation
await pool.query(`SELECT * FROM products WHERE id = '${productId}'`);
```

---

## 8. Definition of Done

Mot tinh nang chi duoc coi la **HOAN THANH** khi DAP UNG TAT CA cac tieu chi sau:

### 8.1 Yeu cau chuc nang (Functional Requirements)

- [ ] Tat ca acceptance criteria trong user story duoc thoa man (Given/When/Then)
- [ ] Happy path hoat dong dung tren ca frontend va backend
- [ ] Edge cases da duoc xu ly: input trong, gia tri biên (boundary), loi server
- [ ] Khong co regression — cac tinh nang hien co van hoat dong binh thuong

### 8.2 Chat luong code (Code Quality)

- [ ] Code review duoc chap thuan boi Code Reviewer Agent (khong con blocker)
- [ ] Khong co `any` type trong TypeScript tru khi co giai thich ro rang
- [ ] Tat ca interfaces dinh nghia trong `models/` — khong co inline type literal cho shared shapes
- [ ] Controller error handling dung chuan: `return res.status(...).json(...)` — khong fall-through
- [ ] Tat ca `async` route handlers duoc bao trong try/catch

### 8.3 Bao mat (Security)

- [ ] Tat ca SQL queries dung parameterized form (`$1`, `$2`) — khong co string interpolation
- [ ] JWT secret lay tu `process.env.JWT_SECRET` — khong hardcode
- [ ] Password hash KHONG duoc tra ve trong bat ky API response nao
- [ ] `authenticate` middleware ap dung cho tat ca protected routes
- [ ] `requireAdmin` middleware ap dung cho tat ca `/api/admin/*` routes
- [ ] User input duoc validate truoc khi luu vao database

### 8.4 Testing (Kiem thu)

- [ ] Moi API endpoint moi phai co it nhat 1 integration test (happy path) va 1 error case
- [ ] Moi Angular service moi phai co unit test voi `HttpClientTestingModule`
- [ ] Edge cases da duoc cover: het hang, JWT het han, input khong hop le
- [ ] Tat ca test chay pass (0 failures) trong CI pipeline

### 8.5 Database (Co so du lieu)

- [ ] Thay doi schema phai co migration file trong `database/migrations/` — khong the thay doi schema truc tiep
- [ ] Index duoc them cho cac column dung trong `WHERE`, `JOIN`, `ORDER BY` thuong xuyen
- [ ] `ON DELETE` behavior duoc xac dinh ro rang tren foreign keys
- [ ] `updated_at` trigger duoc ap dung cho cac bang can theo doi lich su thay doi

### 8.6 Hieu nang (Performance)

- [ ] Product list queries dung `LIMIT`/`OFFSET` — khong fetch tat ca rows khong gioi han
- [ ] Tranh N+1 queries — dung JOIN hoac aggregation thay vi loop DB calls
- [ ] Angular components dung `track` trong `@for` loops
- [ ] Anh san pham dung `loading="lazy"` attribute

### 8.7 UX / Giao dien nguoi dung

- [ ] Thong bao loi hien thi bang tieng Viet, than thien — khong hien raw server error
- [ ] Loading states hien thi trong khi doi API response (spinner hoac skeleton)
- [ ] Trang thai thanh cong ro rang (them vao gio, dat hang thanh cong)
- [ ] Mobile responsive — hoat dong tren man hinh 375px tro len
- [ ] Khong co hardcoded `http://localhost:3000` — luon dung `environment.apiUrl`

### 8.8 DevOps / Deployment

- [ ] Feature moi khong lam be CI pipeline
- [ ] Docker images build thanh cong cho ca dev va production
- [ ] Environment variables moi duoc ghi lai trong `.env.example` va GitHub Secrets guide
- [ ] Health check (`/api/health`) van tra ve 200 sau khi deploy

---

## Phu luc A: API Endpoints Reference

| Method | Path | Auth | Mo ta |
|--------|------|------|-------|
| POST | /api/auth/register | — | Dang ky tai khoan moi |
| POST | /api/auth/login | — | Dang nhap → nhan JWT |
| GET | /api/auth/me | JWT | Thong tin nguoi dung hien tai |
| GET | /api/products | — | Danh sach san pham (loc, phan trang) |
| GET | /api/products/categories | — | Tat ca danh muc |
| GET | /api/products/:slug | — | Chi tiet san pham |
| GET | /api/cart | JWT | Gio hang nguoi dung |
| POST | /api/cart | JWT | Them san pham vao gio |
| PUT | /api/cart/:itemId | JWT | Cap nhat so luong |
| DELETE | /api/cart/:itemId | JWT | Xoa san pham khoi gio |
| POST | /api/orders | JWT | Tao don hang tu gio hang |
| GET | /api/orders | JWT | Lich su don hang |
| POST | /api/admin/products | Admin | Them san pham moi |
| PUT | /api/admin/products/:id | Admin | Sua thong tin san pham |
| DELETE | /api/admin/products/:id | Admin | Xoa mem san pham |
| GET | /api/admin/orders | Admin | Tat ca don hang |
| PUT | /api/admin/orders/:id/status | Admin | Cap nhat trang thai don hang |
| GET | /api/health | — | Health check |

---

## Phu luc B: Data Model Overview

```
users
├── id (SERIAL PK)
├── name (VARCHAR)
├── email (VARCHAR UNIQUE)
├── password_hash (VARCHAR)
├── role ('customer' | 'admin')
└── created_at

categories
├── id (SERIAL PK)
├── name (VARCHAR)
└── slug (VARCHAR UNIQUE)

products
├── id (SERIAL PK)
├── category_id (FK → categories)
├── name, slug, description
├── price (DECIMAL)
├── stock_quantity (INTEGER)
├── image_url
├── is_active (BOOLEAN) -- soft delete
└── created_at, updated_at

cart_items
├── id (SERIAL PK)
├── user_id (FK → users, ON DELETE CASCADE)
├── product_id (FK → products)
├── quantity (INTEGER)
└── UNIQUE(user_id, product_id)

orders
├── id (SERIAL PK)
├── user_id (FK → users)
├── status ('pending' | 'processing' | 'shipped' | 'delivered')
├── total_amount (DECIMAL)
└── created_at, updated_at

order_items
├── id (SERIAL PK)
├── order_id (FK → orders, ON DELETE CASCADE)
├── product_id (FK → products)
├── quantity (INTEGER)
└── unit_price (DECIMAL) -- gia snapshot tai thoi diem mua
```

---

## Phu luc C: Environment Variables

| Variable | De dung | Vi du |
|----------|---------|-------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/furnituredb` |
| `JWT_SECRET` | Ky JWT tokens | Random string 64 chars+ |
| `JWT_EXPIRES_IN` | Thoi gian token con hieu luc | `7d` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Backend port | `3000` |
| `FRONTEND_URL` | CORS allowed origin | `https://yourdomain.com` |

**GitHub Secrets can cau hinh cho CI/CD**:
- `VPS_HOST` — IP hoac domain cua VPS
- `VPS_USER` — SSH username
- `VPS_SSH_KEY` — Private SSH key (base64 hoac raw)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `FRONTEND_URL`

---

*Tai lieu nay duoc tao va duy tri boi PM Agent. Cap nhat lan cuoi: 2026-03-05.*
*Lien he: ndlong75 | GitHub: github.com/ndlong75/furniture-shop*
