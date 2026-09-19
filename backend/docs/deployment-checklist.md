# Deployment Checklist & Production Architecture

This document provides a production deployment checklist and architecture overview for deploying the **INE Product Price Tracker**.

---

## 🏗️ Production Architecture Overview

```text
┌─────────────────────────────────┐
│     Vercel (React Frontend)     │
│   https://<app>.vercel.app      │
└────────────────┬────────────────┘
                 │
                 │ REST API Requests (VITE_API_URL)
                 ▼
┌─────────────────────────────────┐
│     Render (Node.js/Express)    │
│   https://<backend>.onrender.com│
└───────┬─────────────────▲───────┘
        │                 │
        │ Supabase Client │ HTTP POST /api/scheduler/scrape
        ▼                 │ (Authorization: Bearer <SECRET>)
┌──────────────┐  ┌───────┴────────┐
│   Supabase   │  │ External Cron  │
│  PostgreSQL  │  │ (cron-job.org) │
└──────────────┘  └────────────────┘
```

---

## 📋 Production Deployment Checklist

### 1. Database Setup (Supabase PostgreSQL)
- [x] Create project in Supabase dashboard.
- [x] Run `schema.sql` to create `tracked_products`, `price_history`, and `scrape_logs` tables.
- [x] Verify foreign keys, non-null constraints, and timestamp indexes.
- [x] Obtain `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### 2. Backend Deployment (Render)
- [x] **Repository**: Push backend project code to GitHub.
- [x] **Build Command**: `npm install`
- [x] **Start Command**: `npm start` (Runs `node src/index.js`)
- [x] **Environment Variables**:
  - `PORT`: `5000` (or dynamically provided by Render)
  - `NODE_ENV`: `production`
  - `SUPABASE_URL`: `https://numypeuzsfmsvryigtbr.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY`: `<service-role-key>`
  - `SCHEDULER_SECRET`: `<strong-secret>`
  - `FRONTEND_URL`: `https://<your-vercel-app>.vercel.app`
- [x] **Health Check**: Verify `GET /api/health` returns `{ "status": "ok", "message": "Backend is running" }`.

### 3. Frontend Deployment (Vercel)
- [x] **Framework Preset**: Vite
- [x] **Build Command**: `npm run build`
- [x] **Output Directory**: `dist`
- [x] **Environment Variables**:
  - `VITE_API_URL`: `https://<your-backend-render-url>.onrender.com`
- [x] **Security Audit**: Verify `SUPABASE_SERVICE_ROLE_KEY` is NOT set in Vercel environment variables.

### 4. External Cron Scheduler Setup (cron-job.org)
- [x] **Schedule**: Every 2 hours (`0 */2 * * *`).
- [x] **Target Endpoint**: `POST https://<your-backend-render-url>.onrender.com/api/scheduler/scrape`
- [x] **HTTP Header**: `Authorization: Bearer <SCHEDULER_SECRET>`

---

## 🛠️ Local Build & Start Commands

### Backend
```bash
cd backend
npm install
npm start        # Production start
npm run dev      # Development start with nodemon
```

### Frontend
```bash
cd frontend
npm install
npm run build    # Production build (creates /dist)
npm run preview  # Preview production build locally
```
