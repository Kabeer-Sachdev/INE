# Backend Scheduler Documentation: Periodic 2-Hour Scraping

This document describes the design, configuration, and setup instructions for automated periodic scraping in the **INE Product Price Tracker**.

---

## 🏗️ Architecture Overview

The application utilizes an **External Cron Service** pattern to trigger periodic scraping. Instead of running an in-process `setInterval` timer inside Express (which can crash, leak memory, or misfire across horizontal scaling), scraping cycles are driven externally via an authenticated HTTP endpoint:

```text
External Cron Service (e.g. cron-job.org)
       │
       │ POST request every 2 hours
       ▼
POST /api/scheduler/scrape  (Protected by SCHEDULER_SECRET)
       │
       ├─► 1. Verify Authorization Header (Bearer <SCHEDULER_SECRET>)
       ├─► 2. Check Overlap Lock (In-memory isSchedulerRunning)
       ├─► 3. Fetch Active Tracked Products (is_active = true)
       ▼
For each Active Product (Sequential execution):
       │
       ▼
Phase 5 Reliable Scraper Service (Up to 3 retries with backoff)
       ├── SUCCESS: Save valid price to price_history & log success to scrape_logs
       └── FAILURE: Log failure to scrape_logs (No invalid history saved)
       │
       ▼
Return JSON Summary { success: true, message: "...", summary: { total, succeeded, failed } }
```

---

## 🔒 Scheduler Authorization

The scheduler endpoint is protected by a secret token to prevent unauthorized execution.

### Environment Variable
Configure `SCHEDULER_SECRET` in your backend `.env` file:
```env
SCHEDULER_SECRET=your_strong_secret_here
```

### Authorization Header
Every request to the scheduler endpoint must include the configured secret in the `Authorization` header:
```http
Authorization: Bearer <SCHEDULER_SECRET>
```

If the token is missing or incorrect, the server returns HTTP `401 Unauthorized` without initiating a scrape cycle.

---

## ⏱️ External Cron Setup Instructions (e.g. cron-job.org)

To enable automatic 2-hour scraping:

1. **Sign Up / Log In** to an external cron service such as [cron-job.org](https://cron-job.org).
2. **Create a New Cron Job**:
   - **Title**: `INE Price Tracker 2-Hour Scrape`
   - **URL**: `https://<YOUR_DEPLOYED_BACKEND_DOMAIN>/api/scheduler/scrape`
   - **Execution Schedule**: `Every 2 hours` (or cron expression `0 */2 * * *`)
   - **HTTP Method**: `POST`
3. **Configure Headers**:
   - Add Header: `Authorization`
   - Value: `Bearer <SCHEDULER_SECRET>` (replace with your actual secret)
4. **Save & Enable**: The cron service will trigger your backend endpoint every 2 hours.

---

## 🛡️ Overlapping Run Protection & Limitations

- **In-Memory Lock**: The backend controller maintains an in-memory lock (`isSchedulerRunning = false`). If an external cron request arrives while a scraping cycle is active, the endpoint immediately returns HTTP `409 Conflict`.
- **Single-Instance Limitation Note**: This in-memory lock protects against concurrent executions on a single Node.js backend instance. In a multi-node distributed deployment, a distributed locking mechanism (such as Redis/Redlock or PostgreSQL row lock) would be required. For this single-instance deployment, the in-memory flag provides effective protection with zero extra infrastructure.

---

## 🧪 Manual Testing

You can manually trigger the scheduler endpoint via `curl`:

```bash
curl -X POST http://localhost:5000/api/scheduler/scrape \
  -H "Authorization: Bearer test_scheduler_secret_123"
```

### Expected Response:
```json
{
  "success": true,
  "message": "Scheduled scrape completed",
  "summary": {
    "total": 3,
    "succeeded": 3,
    "failed": 0
  }
}
```
