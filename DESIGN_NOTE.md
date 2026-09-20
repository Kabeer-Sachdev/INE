# Design Note — INE Product Price Tracker & Web Scraper

This document outlines the architectural decisions, trade-offs, reliability mechanisms, and technical corrections made during the development of the INE Product Price Tracker.

---

## 1. Scraping Reliability Kaise Achieve Ki (How Reliability Was Achieved)

1. **Full Browser Automation (Playwright Chromium)**:
   - Replaced static HTML parsing with Playwright headless browser automation.
   - Capable of executing client-side JavaScript, handling Single Page Application (SPA) rendering, and dynamically triggering interactive elements (e.g., hovering over hidden/blurred price elements to reveal real text).

2. **Fallback Selector Cascade**:
   - Multi-layered DOM selection strategy:
     - Priority 1: Primary CSS class (`.product-price`, `.current-price`)
     - Priority 2: Data attributes (`[data-price]`, `[data-testid="price"]`)
     - Priority 3: Regex pattern fallback searching for currency symbols (`₹`, `$`) across text nodes.
   - Ensures resilience even if the storefront undergoes minor layout updates.

3. **3-Attempt Exponential Backoff Retry Loop**:
   - If an attempt fails, the scraper automatically retries up to 3 times with progressive delays (`Attempt 1` → 1s delay → `Attempt 2` → 2s delay → `Attempt 3`).
   - Handles transient network glitches, target server rate-limiting, and slow page loads cleanly.

4. **Detailed Audit Telemetry (`scrape_logs`)**:
   - Every single attempt (whether `retrying`, `failed`, or `success`) records a structured log entry into the Supabase PostgreSQL `scrape_logs` table.
   - Captures exact execution duration in milliseconds, attempt numbers, and classified error messages (`TIMEOUT`, `HTTP_ERROR`, `PARSE_ERROR`, `ELEMENT_NOT_FOUND`).

5. **Data Integrity & Zero-Price Protection**:
   - Strict validation via `validator.js` ensures that **failed or incomplete scrapes NEVER write zero, null, or corrupt records to `price_history`**.
   - Audit logs capture failure details, preserving clean historical price trend charts.

---

## 2. Trade-offs (Architectural Decisions & Compromises)

| Feature | Option Chosen | Alternative Considered | Rationale & Trade-off |
| :--- | :--- | :--- | :--- |
| **Scraper Engine** | **Playwright Chromium** | Simple HTTP (`fetch` + `cheerio`) | **Trade-off**: Higher RAM/CPU usage per scrape session (~150MB RAM, 1-3s execution). **Rationale**: Storefront prices require JS execution and hover triggers; static fetch fails completely. |
| **Concurrency Lock** | **In-Memory Flag** (`isScrapeRunning`) | Distributed Redis Lock (`Redlock`) | **Trade-off**: Works for single-instance deployments (Render Web Service), but not multi-node auto-scaled clusters. **Rationale**: Keeps architecture clean, zero-cost, zero extra infrastructure overhead for assignment scope. |
| **Telemetry Pagination**| **Client-Side Slicing** (5 rows/page) | Server-Side SQL `LIMIT` / `OFFSET` | **Trade-off**: Fetches full history array from backend. **Rationale**: Typical history sizes per product are < 1,000 rows. Client-side fetching enables instant SVG trend chart rendering without multi-roundtrip API delays. |

---

## 3. AI Tools Ne First Attempt Mein Kya Galat Kiya (What AI Tools Got Wrong)

1. **Assumed Static HTML Parsing**:
   - Initial AI code generators suggested `axios` + `cheerio` or basic `fetch`.
   - On `demo.inelabteamdev.com`, this returned empty strings or `NaN` because storefront prices require client-side JavaScript execution and hover interactions.

2. **Wrote Fake `$0` / Null Prices on Scraper Failures**:
   - Default AI boilerplate caught exceptions and saved `$0.00` or `null` into `price_history`.
   - This severely corrupted historical price charts, creating massive vertical drops to 0 whenever the target server timed out.

3. **Failed Playwright Deployment on Render**:
   - Standard AI deployment prompts failed to account for Render serverless caching behavior. Render discards `/opt/render/.cache/ms-playwright` across container builds, leading to `Executable doesn't exist at ...` runtime crashes.

4. **Infinite Re-render Loops in React**:
   - Naive React code provided by initial AI prompts created un-memoized handler functions inside `useEffect`, causing infinite component re-renders, API request floods, and UI freezing.

---

## 4. Tumne Kaise Correct Kiya (How You Corrected It)

1. **Built Playwright Scraper with Explicit Hover Triggers**:
   - Implemented `browserScraper.js` with explicit element waiting and Playwright `.hover()` / `.click()` actions to reveal prices reliably.

2. **Enforced Strict Validator Guard Rails**:
   - Created `validator.js` that inspects scraped values and throws a custom `PARSER_ERROR` if the price is missing or invalid.
   - Guaranteed that failed attempts route strictly to `scrape_logs` and block `price_history` insertions.

3. **Fixed Render Serverless Playwright Persistence**:
   - Set `process.env.PLAYWRIGHT_BROWSERS_PATH = '0'` in `browserScraper.js` and added `"postinstall": "PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install"` to `package.json`.
   - Forces Playwright to download and read Chromium directly inside `./node_modules`, making binaries persist across Render container restarts.

4. **Stabilized React State Management**:
   - Refactored `App.jsx` using `useCallback` memoized selection handlers and clean dependency arrays to ensure zero infinite re-renders and smooth UI performance.
