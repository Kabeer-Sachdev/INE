# INE Store Scraper Investigation

## 1. Store Structure

The INE Mock Storefront (`https://demo.inelabteamdev.com/`) is a **Single Page Application (SPA)** built with React and Vite.

- **Homepage (`/`)**: Displays a header, brand logo, search bar (`input[type="text"]` with placeholder "Search products…"), category filter pills, and a paginated product grid showing product cards.
- **Product Discovery**:
  - Direct HTTP API endpoint `/api/catalog?page=1&pageSize=10` returns a JSON object containing total product count (`total: 1000`), total pages (`pages: 100`), and an array of product items.
  - On the UI, products are displayed as cards containing image, brand tag, category badge, product title, description snippet, and a "View Details" CTA button linking to `/product/:id`.
- **Search Mechanics**:
  - The search bar filters products client-side or queries the catalog API.
  - The catalog API supports pagination (`page` and `pageSize` params).

---

## 2. Product URL Structure

Product URLs follow two primary RESTful client route patterns:

- **Numerical ID Pattern (Primary)**: `https://demo.inelabteamdev.com/product/376`
- **Slug Pattern (Alternative)**: `https://demo.inelabteamdev.com/product/basecamp-bridge-hub-lite`

### Real Discovered Examples:
- `https://demo.inelabteamdev.com/product/376` (Basecamp Bridge Hub Lite)
- `https://demo.inelabteamdev.com/product/603` (Nordkraft Charging Pad Three)
- `https://demo.inelabteamdev.com/product/856` (Vantablack Bridge Hub XL)

---

## 3. Product Identification

- **Primary Stable Identifier**: Numerical integer `id` (e.g., `376`, `603`).
- **Secondary Identifiers**:
  - `sku`: String (e.g., `"BAS-10376"`, `"NOR-10603"`).
  - `slug`: String URL-friendly slug (e.g., `"basecamp-bridge-hub-lite"`).

The integer `id` is the primary key used across both the backend REST API (`GET /api/product/:id`) and internal client-side navigation.

---

## 4. Product Name Extraction

- **DOM Location**: Located inside an `<h1>` heading tag on the product detail page.
- **HTML Container**: `<h1 class="product-title">` (or primary `<h1>` inside the product header section).
- **Initial HTML Presence**: **NO**. The raw server HTML returns only `<div id="root"></div>`. The title is rendered client-side after JavaScript executes and fetches `GET /api/product/:id`.
- **Extraction Strategy**:
  - **API Approach**: Read `name` field directly from `GET /api/product/:id` JSON.
  - **Playwright DOM Selector**: `h1` or `[data-testid="product-name"]` / `.product-title`.

---

## 5. Price Extraction

- **DOM Location**: Rendered inside a specialized `.price-block` section on the product page.
- **Initial HTML Presence**: **NO**.
- **Initial Client Render State**: **Hidden** (`<p class="price-status">Price hidden</p>`).
- **Interactive Requirement**:
  - Price is **NOT** present when the page first loads.
  - Requires user interaction: Moving mouse over the price box (`minMoves: 8`, `minDwellMs: 600`) and verifying `event.isTrusted === true`.
  - Unlocks a **"Reveal Price"** button (`button.btn-primary`).
  - Clicking "Reveal Price" triggers an obfuscated challenge token exchange and quote API request.
- **Final Price Format**: Currency symbol + amount (e.g., `₹9,212` or `₹10,831` with discount badge).
- **Extraction Strategy**:
  - **Playwright DOM Selector**: `.price-final`, `.price-amount`, or `.price-block .deal-price`.
  - Must parse out currency symbols (`₹`, `$`, `,`) and extract clean numeric float (e.g. `9212.00`).

---

## 6. Stock Extraction

- **DOM Location**: Rendered inside `.stock-badge` or `.stock-status` near the pricing container.
- **Initial HTML Presence**: **NO**. Loaded alongside the price quote after the reveal challenge resolves.
- **Format Examples**:
  - `"In stock · 48 left"`
  - `"Selling fast — 48 left"`
  - `"Only 5 left"`
- **Extraction Strategy**:
  - **Playwright DOM Selector**: `.stock-badge`, `.stock-info`, or text matching `/(\d+)\s*left|in stock/i`.

---

## 7. HTTP Scraping Feasibility (Axios / Cheerio)

- **Feasibility**: **INSUFFICIENT for direct HTML parsing, but PARTIALLY FEASIBLE for raw catalog metadata.**
- **Why Cheerio fails**:
  - Fetching `https://demo.inelabteamdev.com/product/376` via `axios` or `fetch` returns a 459-character empty React shell:
    ```html
    <!doctype html>
    <html lang="en">
      <head>
        <script type="module" crossorigin src="/assets/index-B9UiQq4X.js"></script>
      </head>
      <body><div id="root"></div></body>
    </html>
    ```
  - `price` and `stock` do NOT exist anywhere in the static HTML or `GET /api/product/:id` REST response.
  - Price and stock are calculated dynamically on the server via an anti-scraping challenge (`minMoves`, `minDwellMs`, bearer token exchange).

---

## 8. JavaScript Rendering (Playwright Requirement)

- **Is Playwright required?** **YES.**
- **Why Playwright is mandatory**:
  1. **Single Page Application (SPA)**: Page content requires full JavaScript bundle execution to mount the React DOM.
  2. **Human Interaction Anti-Bot Challenge**: The storefront code explicitly checks `minMoves >= 8`, `minDwellMs >= 600`, and native trusted mouse events before enabling the price reveal mechanism.
  3. **Dynamic DOM Injection**: Price and stock DOM elements are created dynamically only after the challenge and quote retries succeed.

---

## 9. Network / API Behavior

- **Discovered API Endpoints**:
  - `GET /api/catalog?page=1&pageSize=10`: Returns list of products (name, brand, category, SKU, description).
  - `GET /api/product/:id`: Returns product details, specs, and reviews (does **NOT** include price/stock).
  - `GET /api/layout`: Returns navbar layout metadata.
  - `GET /api/challenge` / `POST /api/quote`: Obfuscated endpoints used by client JS to exchange challenge tokens and return price/stock payload.

---

## 10. Loading & Delay Behavior

- **Initial Load**: Fast (~650ms for React bundle).
- **Price Reveal Delay**:
  - When "Reveal Price" is clicked, an artificial delay of 300ms to 1500ms is simulated.
  - The client displays loading states: `"Loading price..."`, `"Retrying (attempt 2/6)..."`.
  - Exponential backoff delay (`await sleep(300 * attempt)`) occurs between retries.

---

## 11. Error Behavior

- **Artificial Error Injection**:
  - The client JS includes simulated failure logic (`Math.random() < 0.35`).
  - Approximately 35% of price reveal attempts intentionally fail with:
    - `"Couldn't load the price after 1 attempts."`
    - `"Store responded with 'upstream 500'"`
  - UI displays a **"TRY AGAIN"** button on failure.
- **Recovery Requirement**:
  - The scraper MUST handle failure states by detecting the error message/button and retrying until status changes to `success` or max retries are reached.

---

## 12. Recommended Scraping Strategy for Phase 4

### Hybrid Playwright + Retry Loop Strategy

1. **Browser Initialization**: Launch Playwright chromium browser instance with a realistic viewport (e.g. 1280x800).
2. **Navigation**: Navigate to target product URL (`https://demo.inelabteamdev.com/product/:id`).
3. **Wait for DOM Mount**: Wait for product title `<h1>` to appear.
4. **Simulate Human Hover Trajectory**:
   - Move mouse into the price container area (`.price-block`).
   - Perform 8-10 mouse move micro-steps across the bounding box over 800ms to satisfy `minMoves` and `minDwellMs`.
5. **Click Reveal Price Button**:
   - Locate and click the revealed `button` ("Reveal price" / "REVEAL PRICE").
6. **Handle Retry / Error States**:
   - Wait up to 5 seconds for `.price-final` or `.stock-badge` to appear.
   - If a "TRY AGAIN" button or error text appears, click "TRY AGAIN" and repeat up to 5 times.
7. **Extract & Validate**:
   - Read price text, strip non-numeric characters, parse `float`.
   - Read stock text.
   - Return validated `{ price, stock }` object.

---

## 13. Robust Locator Strategy

| Element | Primary Selector | Fallback Selector | Robustness Rationale |
| :--- | :--- | :--- | :--- |
| **Product Name** | `h1.product-title` | `h1` | `h1` is standard semantic HTML for product title |
| **Price Box / Area** | `.price-block` | `[data-testid="price-container"]`, `.price-wrap` | Main container requiring mouse hover trajectory |
| **Reveal Price Button** | `button:has-text("Reveal price")` | `button.btn-primary` | Matches semantic text regardless of dynamic class obfuscation |
| **Try Again Button** | `button:has-text("Try again")` | `button:has-text("TRY AGAIN")` | Handles error recovery button explicitly |
| **Revealed Price** | `.price-final` | `.deal-price`, `.price-amount` | Contains final numerical price after quote resolves |
| **Stock Info** | `.stock-badge` | `.stock-info`, `div:has-text("stock")` | Contains stock count and status |

*Fragile selectors like `div > div:nth-child(3) > span` are strictly avoided.*

---

## 14. Risks & Mitigations

| Risk | Cause | Mitigation |
| :--- | :--- | :--- |
| **Price Hidden State** | Bot protection requires hover dwell time | Simulate multi-step mouse movement over `.price-block` before clicking reveal |
| **Upstream 500 / Challenge Failure** | Simulated 35% API error rate | Implement Playwright retry loop that auto-clicks "Try again" up to 5 attempts |
| **Timeout on Slow Response** | Simulated 1.5s network delay | Set Playwright locator wait timeout to 8,000ms |
| **DOM Class Renaming** | Vite build asset hashing | Use text-based (`button:has-text()`) and semantic HTML (`h1`) locators |
