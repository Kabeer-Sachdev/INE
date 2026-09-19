const { scrapeProduct } = require('../scraper/scraperService');
const productService = require('../services/productService');

async function runScraperTest() {
  console.log('=== Phase 5 Live Product Scraper Reliability Test ===');

  const testUrl = 'https://demo.inelabteamdev.com/product/376';
  let dbProduct = null;

  // 1. Fetch or create a live tracked_product in Supabase to test real database integration
  try {
    const products = await productService.getTrackedProducts();
    dbProduct = products.find(p => p.product_url === testUrl);

    if (!dbProduct) {
      console.log('[SCRAPER TEST] Creating tracked product record in Supabase...');
      dbProduct = await productService.createTrackedProduct({
        productName: 'Basecamp Bridge Hub Lite',
        productUrl: testUrl,
        externalProductId: '376'
      });
      console.log(`[SCRAPER TEST] Tracked Product created in Supabase with ID: ${dbProduct.id}`);
    } else {
      console.log(`[SCRAPER TEST] Using existing tracked product from Supabase (ID: ${dbProduct.id})`);
    }
  } catch (err) {
    console.log(`[SCRAPER TEST WARN] Running test without live Supabase DB: ${err.message}`);
  }

  // 2. Execute live scraper pipeline
  const result = await scrapeProduct(dbProduct || testUrl, { headless: true, timeoutMs: 20000 });

  if (result.success && dbProduct) {
    console.log('\n--- Verifying Live Supabase DB Records ---');
    try {
      const logs = await productService.getScrapeLogs(dbProduct.id);
      const history = await productService.getPriceHistory(dbProduct.id);

      console.log(`✅ Scrape Logs recorded in Supabase: ${logs.length} entries`);
      if (logs.length > 0) {
        console.log(`   Latest Log: Attempt #${logs[0].attempt_number} - Status: '${logs[0].status}' (${logs[0].duration_ms}ms)`);
      }

      console.log(`✅ Price History recorded in Supabase: ${history.length} entries`);
      if (history.length > 0) {
        console.log(`   Latest Price Point: $${history[0].price} (${history[0].stock})`);
      }
    } catch (err) {
      console.error(`DB Read Error: ${err.message}`);
    }
  }

  console.log('\n=== Scraper Test Complete ===');
}

runScraperTest();
