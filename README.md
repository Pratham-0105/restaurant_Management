<div align="center">

<img src="apps/web/public/logo.svg" alt="Swamiverse Logo" width="120" height="120">

# Swamiverse

### Modern Offline-First Restaurant Management & POS System

**All-in-one platform for dining rooms, bars, cafés, bakeries, food courts, and cloud kitchens.**  
Billing with **UPI QR payments**, dynamic floor & table maps, real-time Kitchen Display (KDS), online QR orders, inventory with recipe costing, **staff attendance & payroll**, accounting, and multi-branch control.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![Node: >=22](https://img.shields.io/badge/Node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)
[![pnpm: Workspaces](https://img.shields.io/badge/pnpm-Workspaces-F69220?logo=pnpm&logoColor=white)](pnpm-workspace.yaml)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](apps/web/tsconfig.json)
[![NestJS: 11](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?logo=nestjs&logoColor=white)](apps/backend)
[![Next.js: 16](https://img.shields.io/badge/Frontend-Next.js%2016-000000?logo=next.js&logoColor=white)](apps/web)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)](apps/backend/prisma)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](./CONTRIBUTING.md)

Developed by **[Prathmesh](https://github.com/Pratham-0105)** · **[Repository](https://github.com/Pratham-0105/restaurant_Management)**

[Quick Start](#-quick-start) ·
[Features](#-features--modules) ·
[Architecture](#-tech-stack--architecture) ·
[Screenshots](#-screenshots) ·
[Tutorial](./TUTORIAL.md) ·
[Contributing](#-contributing) ·
[License](#-license)

</div>


---

## 🌟 Overview

**Swamiverse** is an open-source, purpose-built restaurant management ecosystem designed from the ground up for high reliability and zero downtime.

The entire stack — PostgreSQL database, NestJS REST API, and Next.js modern web application — runs seamlessly on a single local server on the restaurant's local network (LAN) or deployed to any cloud VPS or container environment.

### Core Highlights

- ⚡ **Offline-First Resilience**: Order-taking, kitchen display updates, billing, and receipt printing all function continuously even when external internet or WAN connection drops.
- 📱 **UPI QR Checkout & Real-time Chime**: Instant dynamic UPI QR codes generated for every bill with customer-facing display support and audio confirmation chime.
- 🌐 **Multilingual Experience**: Built-in support for **English**, **हिन्दी (Hindi)**, **मराठी (Marathi)**, **Español**, and **Français**.
- 🍳 **Real-time Kitchen Display (KDS)**: Instant bidirectional sync via WebSockets (Socket.IO) routing KOTs to specific kitchen stations with live preparation timers.
- 🪑 **Interactive Floor & Table Management**: Visual drag-and-drop floor plans, table merging, transfer, reservation scheduling, and waitlists.
- 📦 **Automated Inventory & Recipe Costing**: FIFO batch tracking, low-stock warnings, waste logging, supplier purchase orders, and automatic ingredient deduction on checkout.
- 👥 **Attendance & Payroll Automation**: Staff shift scheduling, clock in/out tracking, leave management, and hours-based payroll with tip pool distributions.
- 🔒 **Granular RBAC Security**: Every action is governed by fine-grained permissions across roles, protected by session cookies, PIN quick-switch, and optional TOTP 2FA.

---

## 🛠 Tech Stack & Architecture

Swamiverse is organized as a high-performance monorepo powered by **Turborepo** and **pnpm workspaces**:

```
swamiverse/
├── apps/
│   ├── backend/        # NestJS 11 API (REST /api/v1, Swagger, Socket.IO, Prisma)
│   └── web/            # Next.js 16 (App Router, Turbopack, Tailwind CSS v4)
├── packages/
│   └── types/          # Shared TypeScript types & Zod schemas (@swamiverse/types)
├── docs/               # Technical specs, compliance, and user manuals
└── packaging/          # Deployment configs (Debian packages, Docker compose)
```

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, Base UI, TanStack Query & Table, Recharts, dnd-kit |
| **Backend** | NestJS 11, TypeScript, Socket.IO, Passport JWT, Zod, Swagger OpenAPI |
| **Database & ORM** | PostgreSQL 16 + Prisma ORM (40+ automated migrations) |
| **Realtime Gateway** | WebSockets (Socket.IO) for KDS tickets, floor updates, and order state |
| **Monorepo Tools** | Turborepo, pnpm workspaces |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `v22.0.0` or higher
- **Package Manager**: `pnpm` (`v10` or `v12`)
- **Database**: Local PostgreSQL 16 instance or Docker

### 1. Clone the Repository

```bash
git clone https://github.com/Pratham-0105/restaurant_Management.git
cd restaurant_Management
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Create the backend environment file:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` with your PostgreSQL database credentials and generate a secure 64-character JWT secret:

```env
DATABASE_URL="postgresql://swamiverse:swamiverse_dev_pw@localhost:5432/swamiverse_restaurant"
JWT_SECRET="generate_a_random_64_character_hex_secret_here"
PORT=4001
CORS_ORIGIN="http://localhost:3000"
```

### 4. Build Shared Types & Run Migrations

```bash
# Build the shared @swamiverse/types package
pnpm --filter @swamiverse/types build

# Generate Prisma Client & apply database migrations
cd apps/backend
npx prisma generate
npx prisma migrate deploy

# Seed demo restaurant, floor, menu, and owner account
npx ts-node prisma/seed.ts
cd ../..
```

### 5. Start the Development Servers

```bash
pnpm dev
```

The services will be available at:
- 🖥️ **Web App / POS:** [http://localhost:3000](http://localhost:3000)
- 🔌 **Backend API & Swagger Docs:** [http://localhost:4001/api/docs](http://localhost:4001/api/docs)

### 🔑 Default Demo Credentials

- **Email:** `owner@demo.local`
- **Password:** `Password123!`

---

## 🐳 Docker Deployment

To launch the complete stack with PostgreSQL, NestJS API, and Next.js web application via Docker Compose:

```bash
# 1. Clone repository
git clone https://github.com/Pratham-0105/restaurant_Management.git
cd restaurant_Management

# 2. Start all containers
docker compose up -d --build

# 3. Seed demo data (first run only)
docker exec swamiverse-backend npx ts-node prisma/seed.ts
```

The web dashboard will be accessible at `http://localhost:1995` (or mapped host port).

---

## 📋 Features & Modules

Swamiverse features 20 comprehensive restaurant operations domains:

1. **POS & Smart Billing**: Dine-in, takeaway, delivery, bill merging, discounts, gift cards, tip pooling, and split calculations.
2. **Table & Floor Plan**: Visual floor layout, real-time occupancy status, table merging, QR table ordering, and waitlist.
3. **Kitchen Display System (KDS)**: Real-time ticket board, station routing (grill, bar, expo), priority orders, and prep timers.
4. **Menu & Modifiers**: Nested categories, dish variants, add-on modifier groups, combo meals, and automated stock checks.
5. **Inventory & Costing**: Ingredient master, unit conversions, batch/lot tracking, expiry tracking, and FIFO waste logging.
6. **Procurement**: Supplier directory, purchase requests, vendor quotes, purchase orders (POs), and Goods Receipt Notes (GRN).
7. **Customer CRM & Loyalty**: Customer profiles, order history, loyalty points program, and gift vouchers.
8. **Staff & Shift Scheduling**: Employee accounts, role assignments, shift scheduling with clash prevention, and attendance.
9. **Staff Payroll**: Automated payroll calculated from clocked hours, unpaid leave deductions, and pooled tips.
10. **Restaurant Accounting**: Income/expense vouchers, nightly cash drawer closing with variance reporting, P&L, and balance sheet.
11. **Multi-Region Tax Engine**: Support for India GST (CGST/SGST/IGST), US Sales Tax, EU VAT, and Spain IVA (tax-inclusive or exclusive).
12. **Delivery Management**: Custom delivery zones, delivery fees, order dispatch, and driver assignment.
13. **Customer Self-Service Kiosk**: Full-screen self-ordering kiosk mode with barcode/ticket scanner support.
14. **Customer-Facing Display**: Secondary screen mode for customer order review and dynamic UPI QR code scanning.
15. **Reporting & Analytics**: 18+ business reports (hourly sales, top items, margins, food cost) with CSV, Excel, and PDF exports.
16. **Marketing Campaigns**: Promotional coupon codes, happy-hour discounts, and automated notifications via SMTP email.
17. **Maintenance & Assets**: Kitchen equipment register, preventive service schedules, and maintenance logging.
18. **Operations & SOPs**: Standard operating procedure documents, contracts, and recipe manuals.
19. **Security & Audits**: Immutable audit log, session revocation, staff PIN mode, and optional Two-Factor Authentication (TOTP).
20. **Integrations & MCP**: Model Context Protocol (MCP) server integration for AI assistants, ESC/POS hardware printer support, and webhooks.

---

## 📸 Screenshots

| | |
|---|---|
| ![Point of Sale](docs/screenshots/pos-light.png) | ![Kitchen Display](docs/screenshots/kds-light.png) |
| **Point of Sale** — Fast checkout, modifiers & UPI | **Kitchen Display (KDS)** — Live timers & station queues |
| ![Tables](docs/screenshots/tables-light.png) | ![Dashboard](docs/screenshots/dashboard-light.png) |
| **Tables & Floor View** — Table status & waitlist | **Dashboard** — Live revenues, channel metrics & trends |
| ![Inventory](docs/screenshots/inventory-light.png) | ![Menu](docs/screenshots/menu-light.png) |
| **Inventory & Stock** — Ingredient costing & batches | **Menu Management** — Category & combo builder |

---

## 🧪 Testing & Quality

Swamiverse maintains rigorous test coverage across both frontend and backend:

```bash
# Run backend test suite (Jest - 250+ unit & integration tests)
pnpm --filter @swamiverse/backend test

# Run frontend test suite (Node Test Runner)
pnpm --filter web test

# Run TypeScript typechecks across all packages
pnpm typecheck
```

---

## 📄 License

Copyright © 2026 **Swamiverse** and **Prathmesh**.

Licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)**.  
You are free to use, modify, and self-host this software for your business. If you host a modified version as a network service, you must make the corresponding source code available under the same license.

---

<div align="center">
  <sub>Built with ❤️ for independent restaurants, cafés, and culinary businesses.</sub>
</div>
