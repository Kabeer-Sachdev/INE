# INE Software Engineer Intern Assignment: Product Price Tracker

An end-to-end, production-grade automated Product Price Tracker and Web Scraper built for INE. This application tracks real-time price changes, stock availability, and scraper audit logs across target products on the INE storefront (`demo.inelabteamdev.com`).

---

## 🔗 Live Production Links

* **Live Web Dashboard (Vercel)**: [https://ine-gules.vercel.app/](https://ine-gules.vercel.app/)
* **Live Backend API (Render)**: [https://ine-price-tracker-api-cubq.onrender.com](https://ine-price-tracker-api-cubq.onrender.com)
* **GitHub Repository**: [https://github.com/Kabeer-Sachdev/INE](https://github.com/Kabeer-Sachdev/INE)

---

## 🌟 Key Architecture & Engineering Features

### 1. Robust Web Scraper (Playwright Chromium)
* **Dynamic DOM & JS Execution**: Utilizes Playwright to automate full headless browser sessions, enabling rendering of dynamic client-side storefront content.
* **Hover & Hidden Element Handling**: Handles interactive storefront elements (e.g. price reveal hover actions, reveal buttons) dynamically.
* **Smart Selectors**: Multi-layered fallback selector strategy (`.product-price`, `[data-price]`, text pattern regex matching) ensuring scraper resilience against minor layout updates.

### 2. Failure Isolation & Retry Policy
* **3-Attempt Exponential Backoff**: Retries failed scrape attempts up to 3 times (with 1s and 2s delays).
* **Detailed Error Classification**: Distinguishes network timeouts, HTTP error statuses, element target missing errors, and parser integrity violations.
* **Complete Audit Telemetry**: Logs every individual attempt (`retrying`, `failed`, or `success`) into the `scrape_logs` table with exact duration (ms) and error messages.
* **Data Integrity Protection**: Enforces strict validation: **failed scrapes NEVER record zero or null prices into `price_history`**, preserving historical chart accuracy.

### 3. Automated Scheduling & Overlap Protection
* **External Cron Integration**: Configured with `cron-job.org` calling `POST /api/scheduler/scrape` with `Authorization: Bearer <SCHEDULER_SECRET>`.
* **In-Memory Concurrency Lock**: Prevents duplicate overlapping scraper execution if a previous batch scrape is still active.

### 4. Modern Dashboard UI (React + Vite)
* **Real-time Visualization**: SVG Price Trend Charts, Search & Track interface, and Live Status Telemetry.
* **Scroll & Page Management**: Clean 5-item client-side pagination for Price History and Audit Logs with sequential attempt ordering.
* **Responsive Layout**: Sticky headers, dark-mode styling, and touch-ready controls.

---

## 🏗️ System Architecture

```
┌───────────────────────────┐      ┌───────────────────────────┐
│     External Cron Job     │      │   React Frontend (Vite)   │
│     (cron-job.org)        │      │   https://ine-gules...    │
└─────────────┬─────────────┘      └─────────────┬─────────────┘
              │ POST /api/scheduler/scrape       │ REST API calls
              ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│                    Express.js Backend API                    │
│           https://ine-price-tracker-api-cubq...              │
└──────┬───────────────────────┬────────────────────────┬──────┘
       │                       │                        │
       ▼                       ▼                        ▼
┌──────────────┐      ┌─────────────────┐      ┌────────────────┐
│  Playwright  │      │ Supabase PG DB  │      │ Target Store   │
│   Scraper    ├─────►│ (tracked_prod,  │      │ demo.inelab... │
│   Engine     │      │  price_hist,    │      │                │
└──────────────┘      │  scrape_logs)   │      └────────────────┘
                      └─────────────────┘
```

---

## 🛠️ Tech Stack

* **Backend**: Node.js, Express.js, Playwright (Chromium)
* **Database**: Supabase PostgreSQL
* **Frontend**: React 18, Vite, Vanilla CSS
* **Scheduler**: cron-job.org (HTTP Webhooks)
* **Hosting**: Render (Backend), Vercel (Frontend)

---

## 🚀 Local Setup & Development Guide

### Prerequisites
* **Node.js**: v18+ 
* **npm**: v9+

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://<your-supabase-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SCHEDULER_SECRET=dev_scheduler_secret_key_123
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Start the backend server:

```bash
npm run dev
```

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:5000
```

Start Vite dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🎬 Running Headed Scraper Demo (Screen Recording)

To watch the Playwright browser automatically launch, navigate, hover to reveal prices, and scrape the INE store live on your screen:

```bash
cd backend
npm run scrape:demo-headed
```

This runs `demoHeadedScraper.js` with `headless: false` and slow-motion execution (`slowMo: 1000`), perfect for video demonstrations and debugging.

---

## 📚 API Endpoint Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check | No |
| `GET` | `/api/products/search?q=:query` | Search INE catalog by keyword | No |
| `POST` | `/api/products/track` | Track a product URL | No |
| `GET` | `/api/products` | List all active tracked products | No |
| `GET` | `/api/products/:id/history` | Get price & stock history | No |
| `GET` | `/api/products/:id/logs` | Get scrape attempt audit logs | No |
| `POST` | `/api/products/:id/scrape` | Trigger manual immediate scrape | No |
| `POST` | `/api/scheduler/scrape` | Cron automated batch scrape | Bearer Token |

---

## 📄 License & Ownership

Created as part of the INE Software Engineer Intern Technical Assignment. All rights reserved.
