process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
const { chromium } = require('playwright');

/**
 * Browser Scraper Module
 * Responsible for Playwright browser automation, mouse hover trajectory simulation,
 * price reveal interaction, and raw DOM extraction.
 */
async function fetchRawProductData(productUrl, options = {}) {
  const timeoutMs = options.timeoutMs || 15000;
  const isHeadless = options.headless !== undefined ? options.headless : true;

  let browser = null;

  try {
    // 1. Launch Playwright Chromium Instance
    browser = await chromium.launch({
      headless: isHeadless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    // 2. Navigate to product page
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });

    // 3. Wait for product title (h1)
    await page.waitForSelector('h1', { timeout: timeoutMs });
    const rawProductName = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);

    // 4. Locate Price Block Container
    const priceBlockSelector = '.price-block, .price-wrap, [aria-label="Reveal price"]';
    const priceBlock = await page.waitForSelector(priceBlockSelector, { timeout: 8000 }).catch(() => null);

    if (priceBlock) {
      const box = await priceBlock.boundingBox();
      if (box) {
        // Execute Human Hover Trajectory (Satisfies minMoves >= 8 and minDwellMs >= 600)
        const steps = 10;
        const startX = box.x + 5;
        const startY = box.y + 5;
        const endX = box.x + box.width - 5;
        const endY = box.y + box.height - 5;

        for (let i = 0; i <= steps; i++) {
          const x = startX + ((endX - startX) * i) / steps;
          const y = startY + ((endY - startY) * i) / steps;
          await page.mouse.move(x, y);
          await page.waitForTimeout(70); // Total dwell time ~ 700ms > 600ms
        }
      }
    }

    // 5. Click "Reveal Price" button if present
    const revealBtn = await page.waitForSelector('button:has-text("Reveal price"), button.btn-primary', { timeout: 4000 }).catch(() => null);
    if (revealBtn) {
      await revealBtn.click().catch(() => {});
    }

    // 6. Handle potential simulated 35% upstream 500 error / "TRY AGAIN" button
    await page.waitForTimeout(1000);
    const retryBtn = await page.$('button:has-text("TRY AGAIN"), button:has-text("Try again")');
    if (retryBtn) {
      await retryBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }

    // 7. Wait for revealed price and stock elements
    await page.waitForSelector('.price-final, .deal-price, .price-amount, .stock-badge, .stock-info', { timeout: 8000 }).catch(() => {});

    // 8. Extract raw values from DOM
    const rawPrice = await page.evaluate(() => {
      const priceEl = document.querySelector('.price-final, .deal-price, .price-amount, .price-block');
      return priceEl ? priceEl.textContent.trim() : null;
    });

    const rawStock = await page.evaluate(() => {
      const stockEl = document.querySelector('.stock-badge, .stock-info, .stock-status');
      if (stockEl) return stockEl.textContent.trim();
      
      // Fallback: check if page contains stock text
      const bodyText = document.body.innerText;
      const stockMatch = bodyText.match(/(?:in stock|only \d+ left|selling fast[^\n]*)/i);
      return stockMatch ? stockMatch[0].trim() : null;
    });

    return {
      productUrl,
      rawProductName,
      rawPrice,
      rawStock
    };

  } finally {
    // Guaranteed Cleanup: Always close browser resources
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = {
  fetchRawProductData
};
