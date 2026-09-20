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

    // 2. Navigate to product page and wait for full React component initialization
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // 3. Inject CSS style rule to neutralize cookie overlays / modals from intercepting pointer events
    await page.addStyleTag({
      content: `.cookie-overlay, .cookie-banner, [class*="cookie"], [class*="modal-backdrop"] { display: none !important; pointer-events: none !important; visibility: hidden !important; opacity: 0 !important; }`
    }).catch(() => {});

    const clearOverlays = async () => {
      await page.evaluate(() => {
        document.querySelectorAll('.cookie-overlay, .cookie-banner, [class*="cookie"], [class*="modal-backdrop"]').forEach(el => el.remove());
      }).catch(() => {});
    };

    await clearOverlays();

    // 4. Wait for product title (h1)
    await page.waitForSelector('h1', { timeout: timeoutMs });
    const rawProductName = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);

    // 5. Perform trusted human mouse trajectory over price block
    const performHoverTrajectory = async () => {
      await clearOverlays();
      const priceBlock = await page.$('.price-block');
      if (priceBlock) {
        await priceBlock.scrollIntoViewIfNeeded().catch(() => {});
        const box = await priceBlock.boundingBox();
        if (box) {
          for (let i = 0; i <= 15; i++) {
            await page.mouse.move(box.x + 10 + ((box.width - 20) * (i / 15)), box.y + (box.height / 2));
            await page.waitForTimeout(70); // Total dwell time ~ 1050ms > 600ms
          }
        }
      }
    };

    await performHoverTrajectory();
    await page.waitForTimeout(400);
    await clearOverlays();

    // 6. Trusted click on Reveal Price button
    const revealBtn = page.locator('button').filter({ hasText: /reveal price/i }).first();
    if (await revealBtn.count()) {
      await revealBtn.click({ force: true }).catch(() => {});
    }

    await page.waitForTimeout(1000);

    // 7. Loop retry for TRY AGAIN button if anti-bot challenge fails
    for (let r = 1; r <= 3; r++) {
      await clearOverlays();
      const retryBtn = page.locator('button').filter({ hasText: /try again/i }).first();
      if (await retryBtn.count()) {
        await performHoverTrajectory();
        await clearOverlays();
        await retryBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
      } else {
        break;
      }
    }

    // 8. Wait for price element containing currency symbol ₹ to appear in DOM
    await page.waitForFunction(() => {
      const pb = document.querySelector('.price-block');
      const text = pb ? (pb.innerText || pb.textContent) : '';
      return (text.includes('₹') || text.includes('$') || text.includes('Rs')) && !text.includes('Price hidden') && !text.includes('Loading');
    }, { timeout: 8000 }).catch(() => {});

    // 9. Extract exact price & stock values from DOM
    const rawPrice = await page.evaluate(() => {
      const pb = document.querySelector('.price-block');
      if (!pb) return null;

      // Select specific price element class if available (e.g. class containing pv- or priceValue)
      const priceValEl = pb.querySelector('[class*="priceValue"], [class*="pv-"]');
      if (priceValEl && priceValEl.textContent.trim()) {
        return priceValEl.textContent.trim();
      }

      // Find lowest child element containing ₹ symbol
      const allElems = Array.from(pb.querySelectorAll('*'));
      const currencyEl = allElems.find(el => el.children.length === 0 && (el.textContent.includes('₹') || el.textContent.includes('$') || el.textContent.includes('Rs')));
      if (currencyEl && currencyEl.textContent.trim()) {
        return currencyEl.textContent.trim();
      }

      const text = pb.innerText || pb.textContent || '';
      return text.trim() || null;
    });

    const rawStock = await page.evaluate(() => {
      const stockEl = document.querySelector('.stock-badge, .stock-info, .stock-status, [class*="st-"]');
      if (stockEl && stockEl.textContent.trim()) return stockEl.textContent.trim();
      
      const bodyText = document.body.innerText;
      const stockMatch = bodyText.match(/(?:in stock|only \d+ left|selling fast[^\n]*|out of stock|\d+ left|\d+ in stock)/i);
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
