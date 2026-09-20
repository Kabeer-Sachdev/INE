# INE Software Engineer Intern Assignment: Product Price Tracker

An end-to-end, production-grade automated Product Price Tracker and Web Scraper built for INE. This application tracks real-time price changes, stock availability, and scraper audit logs across target products on the INE storefront (`demo.inelabteamdev.com`).

---

## 🔗 Live Production Links

* **Live Web Dashboard (Vercel)**: [https://ine-gules.vercel.app/](https://ine-gules.vercel.app/)
* **Live Backend API (Render)**: [https://ine-price-tracker-api-cubq.onrender.com](https://ine-price-tracker-api-cubq.onrender.com)
* **GitHub Repository**: [https://github.com/Kabeer-Sachdev/INE](https://github.com/Kabeer-Sachdev/INE)
* **Detailed Design Note**: [`DESIGN_NOTE.md`](file:///c:/Users/sachd/OneDrive/Desktop/INE/precisely-price-tracker/DESIGN_NOTE.md)

---

## 📝 Short Design Note & Engineering Trade-offs

### 1. Scraping Reliability
* **Full Browser Automation (Playwright)**: Storefront prices on `demo.inelabteamdev.com` are rendered dynamically via client-side JS and hidden behind interactive hover targets. Static parsers (Axios/Cheerio) fail. Playwright automates real Chromium browser sessions to trigger hover actions and extract rendered price text.
* **3-Attempt Exponential Backoff**: Retries failed attempts up to 3 times (with 1s and 2s backoff delays).
* **Data Integrity Protection**: Strict validation prevents failed scrapes from writing fake `$0` or `null` values into `price_history`, keeping price trend charts clean.
* **Audit Telemetry**: Every attempt (`retrying`, `failed`, or `success`) is logged in `scrape_logs` with duration and error classification.

### 2. Architectural Trade-offs
* **Headless Playwright vs Static Cheerio**: Chosen Playwright despite higher RAM usage (~150MB per session) because storefront prices require JS execution and hover triggers.
* **In-Memory Lock vs Redis Lock**: Implemented an in-memory `isScrapeRunning` lock for cron protection, providing zero-cost concurrency safety for single-instance backend deployments.
* **Client-Side Telemetry Pagination**: History and audit tables use 5-item client-side pagination to render instant SVG trend charts without API multi-roundtrip latency.

### 3. AI Initial Flaws & Manual Corrections
* **Flaw 1 (Naive Parser)**: Initial AI prompts suggested Cheerio/Axios, which failed on hidden hover prices. **Fix**: Wrote custom Playwright automation with explicit hover selectors.
* **Flaw 2 (Corrupted History)**: Default AI error handling wrote `$0.00` on failure. **Fix**: Added validator guard rails blocking corrupt insertions into `price_history`.
* **Flaw 3 (Render Playwright Path Crash)**: AI deployment scripts crashed on Render due to ephemeral cache loss. **Fix**: Set `PLAYWRIGHT_BROWSERS_PATH=0` to force binary persistence inside `node_modules`.

*(See [`DESIGN_NOTE.md`](file:///c:/Users/sachd/OneDrive/Desktop/INE/precisely-price-tracker/DESIGN_NOTE.md) for full breakdown).*

---

## 🔐 Required Environment Variables

### Backend (`backend/.env`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection (Supabase PostgreSQL)
SUPABASE_URL=https://<your-supabase-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Scheduler Security Key (Header: Authorization: Bearer <SCHEDULER_SECRET>)
SCHEDULER_SECRET=dev_scheduler_secret_key_123

# CORS Whitelist (Comma-separated allowed origins)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://ine-gules.vercel.app
```

### Frontend (`frontend/.env`)

```env
# API Backend Base URL (Vite environment variable)
VITE_API_URL=http://localhost:5000
```

---

## ⏰ Scraping Schedule & Cron Configuration

Automated recurring scraping is executed via an external HTTP webhook (`cron-job.org`):

* **Endpoint**: `POST https://ine-price-tracker-api-cubq.onrender.com/api/scheduler/scrape`
* **Scraping Schedule**: **Every 6 hours** (`0 */6 * * *`)
* **Header Authorization**: `Authorization: Bearer <SCHEDULER_SECRET>`
* **Concurrency Locking**: If a scrape batch is already running when a cron request hits, the backend responds with `409 Conflict: Batch scrape already in progress`, preventing scraper overlap.

---

## 🚀 Setup & Local Development Instructions

### Prerequisites
* **Node.js**: v18+
* **npm**: v9+

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` using the template above, then start the server:

```bash
npm run dev
```

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env` using the template above, then start Vite:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🎬 Running Headed Scraper Demo (Screen Recording)

To watch Playwright launch a visible browser window, navigate, hover over price elements, and scrape data live on your screen:

```bash
cd backend
npm run scrape:demo-headed
```

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

## 📚 API Endpoint Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check | No |
| `GET` | `/api/products/search?q=:query` | Search INE catalog | No |
| `POST` | `/api/products/track` | Track a product URL | No |
| `GET` | `/api/products` | List all tracked products | No |
| `GET` | `/api/products/:id/history` | Get price & stock history | No |
| `GET` | `/api/products/:id/logs` | Get scrape attempt audit logs | No |
| `POST` | `/api/products/:id/scrape` | Trigger manual scrape | No |
| `POST` | `/api/scheduler/scrape` | Cron automated batch scrape | Bearer Token |

---

## 📄 License & Ownership

Created as part of the INE Software Engineer Intern Technical Assignment. All rights reserved.
