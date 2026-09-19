const productService = require('../services/productService');
const scraperService = require('../scraper/scraperService');

// In-process lock to prevent overlapping scheduler runs on a single backend instance
let isSchedulerRunning = false;

/**
 * Controller: Trigger Scheduled Scrape Cycle
 * POST /api/scheduler/scrape
 */
async function triggerScheduledScrape(req, res) {
  // Overlapping Run Protection
  if (isSchedulerRunning) {
    console.warn('[SCHEDULER WARN] Overlapping execution attempt blocked (scheduler is already running).');
    return res.status(409).json({
      success: false,
      error: 'Conflict: A scheduled scrape cycle is already in progress.'
    });
  }

  isSchedulerRunning = true;

  try {
    console.log('\n[SCHEDULER] Starting scheduled scrape');

    // 1. Fetch active tracked products (is_active = true)
    let activeProducts = [];
    try {
      activeProducts = await productService.getActiveTrackedProducts();
    } catch (dbErr) {
      console.error('[SCHEDULER ERROR] Failed to fetch active products:', dbErr.message);
      return res.status(500).json({
        success: false,
        error: 'Database Error: Failed to retrieve active tracked products.'
      });
    }

    const total = activeProducts.length;
    console.log(`[SCHEDULER] Active products: ${total}`);

    let succeeded = 0;
    let failed = 0;

    // 2. Process products sequentially to isolate failures and maintain low resource usage
    for (let i = 0; i < total; i++) {
      const product = activeProducts[i];
      const productName = product.product_name || `Product ID ${product.id}`;
      console.log(`\n[SCHEDULER] Product ${i + 1}/${total}: ${productName}`);

      try {
        const scrapeResult = await scraperService.scrapeProduct(product);

        if (scrapeResult && scrapeResult.success) {
          succeeded++;
          console.log(`[SCHEDULER] ${productName}: SUCCESS`);
        } else {
          failed++;
          console.log(`[SCHEDULER] ${productName}: FAILED`);
        }
      } catch (productErr) {
        failed++;
        console.error(`[SCHEDULER ERROR] Exception during scrape of ${productName}:`, productErr.message);
      }
    }

    console.log('\n[SCHEDULER] Completed');
    console.log(`[SCHEDULER] Total: ${total}`);
    console.log(`[SCHEDULER] Succeeded: ${succeeded}`);
    console.log(`[SCHEDULER] Failed: ${failed}`);

    return res.json({
      success: true,
      message: 'Scheduled scrape completed',
      summary: {
        total,
        succeeded,
        failed
      }
    });

  } catch (err) {
    console.error('[SCHEDULER ERROR] Unexpected failure in scheduler execution:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error during scheduled scrape.'
    });
  } finally {
    isSchedulerRunning = false;
  }
}

module.exports = {
  triggerScheduledScrape
};
