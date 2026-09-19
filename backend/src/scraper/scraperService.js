const browserScraper = require('./browserScraper');
const parser = require('./parser');
const validator = require('./validator');
const { classifyError } = require('./errorClassifier');
const SCRAPER_CONFIG = require('./scraperConfig');
const productService = require('../services/productService');

/**
 * Delay Helper for Backoff Delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reliable Single Product Scraper
 * Executes up to MAX_ATTEMPTS (3) retry loop with backoff, error classification,
 * database logging for every attempt (scrape_logs), and conditional price history saving.
 *
 * @param {Object|string} productInput - Product object ({ id, product_url, product_name }) or product URL string
 * @param {Object} options - Override options ({ maxAttempts, backoffDelays, fetchFn, headless })
 * @returns {Promise<Object>} Scraping result summary
 */
async function scrapeProduct(productInput, options = {}) {
  const productUrl = typeof productInput === 'string' ? productInput : productInput?.product_url;
  const productId = typeof productInput === 'object' ? productInput?.id : null;
  const productNameHint = typeof productInput === 'object' ? productInput?.product_name : null;

  if (!productUrl) {
    throw new Error('Scraper Error: A valid product_url must be provided to scrapeProduct().');
  }

  const maxAttempts = options.maxAttempts || SCRAPER_CONFIG.MAX_ATTEMPTS;
  const backoffDelays = options.backoffDelays || SCRAPER_CONFIG.BACKOFF_DELAYS;
  const fetchFn = options.fetchFn || browserScraper.fetchRawProductData;

  console.log(`\n[SCRAPER] Product: ${productNameHint || productUrl}`);

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startTime = Date.now();
    console.log(`[SCRAPER] Attempt ${attempt}/${maxAttempts}`);

    try {
      // 1. Fetch raw DOM data via browserScraper (or test mock fetchFn)
      const rawData = await fetchFn(productUrl, options);

      // 2. Parse & Normalize Data
      const parsedData = parser.parseProductData(rawData);

      // 3. Validate Data Integrity Rules
      validator.validateScrapedData(parsedData);

      const durationMs = Date.now() - startTime;

      console.log(`[SCRAPER] Success`);
      console.log(`[SCRAPER] Price: ${parsedData.price}`);
      console.log(`[SCRAPER] Stock: ${parsedData.stock}`);
      console.log(`[SCRAPER] Duration: ${durationMs}ms`);

      // 4. Database Integration: Log Success Attempt
      if (productId) {
        await productService.createScrapeLog({
          productId: productId,
          status: 'success',
          attemptNumber: attempt,
          errorMessage: null,
          durationMs: durationMs
        }).catch(err => console.error(`[SCRAPER DB WARN] Failed to log success: ${err.message}`));

        // 5. Database Integration: Save Valid Price History ONLY on Success
        await productService.savePriceHistory({
          productId: productId,
          price: parsedData.price,
          stock: parsedData.stock
        }).catch(err => console.error(`[SCRAPER DB WARN] Failed to save price history: ${err.message}`));
      }

      return {
        success: true,
        productName: parsedData.productName,
        price: parsedData.price,
        stock: parsedData.stock,
        attemptCount: attempt,
        durationMs: durationMs
      };

    } catch (err) {
      const durationMs = Date.now() - startTime;
      const classified = classifyError(err);
      lastError = `${classified.type}: ${classified.message}`;

      const isFinalAttempt = attempt === maxAttempts;
      const dbStatus = isFinalAttempt ? 'failed' : 'retrying';

      console.log(`[SCRAPER] Attempt ${attempt} failed: ${classified.type}`);
      console.log(`[SCRAPER] Details: ${classified.message}`);

      // Database Integration: Log Failed/Retrying Attempt
      if (productId) {
        await productService.createScrapeLog({
          productId: productId,
          status: dbStatus,
          attemptNumber: attempt,
          errorMessage: lastError,
          durationMs: durationMs
        }).catch(dbErr => console.error(`[SCRAPER DB WARN] Failed to write scrape log: ${dbErr.message}`));
      }

      if (!isFinalAttempt) {
        const delayMs = backoffDelays[attempt - 1] || 1000;
        console.log(`[SCRAPER] Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      } else {
        console.log(`[SCRAPER] Attempt ${attempt}/${maxAttempts} failed: ${classified.message}`);
        console.log(`[SCRAPER] Final result: FAILED`);
        console.log(`[SCRAPER] Price history NOT saved`);

        return {
          success: false,
          error: lastError,
          attempts: maxAttempts,
          durationMs: durationMs
        };
      }
    }
  }
}

/**
 * Batch Scraper Helper
 * Processes multiple products sequentially. Ensures failure of one product
 * does NOT terminate execution of remaining products.
 *
 * @param {Array} productsList - Array of product objects or URLs
 * @param {Object} options - Scraper options
 * @returns {Promise<Array>} Batch execution results
 */
async function scrapeProductsBatch(productsList, options = {}) {
  if (!Array.isArray(productsList)) {
    throw new Error('scrapeProductsBatch requires an array of products.');
  }

  console.log(`\n=== Starting Batch Scrape for ${productsList.length} products ===`);
  const results = [];

  for (const product of productsList) {
    try {
      const result = await scrapeProduct(product, options);
      results.push({ product, result });
    } catch (batchErr) {
      console.error(`[SCRAPER BATCH ERROR] Product processing threw exception: ${batchErr.message}`);
      results.push({ product, result: { success: false, error: batchErr.message } });
    }
  }

  console.log(`=== Batch Scrape Complete: ${results.filter(r => r.result.success).length}/${results.length} succeeded ===\n`);
  return results;
}

module.exports = {
  scrapeProduct,
  scrapeProductsBatch
};
