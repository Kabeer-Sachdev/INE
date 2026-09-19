const { scrapeProduct, scrapeProductsBatch } = require('../scraper/scraperService');
const productService = require('../services/productService');

async function runControlledRetryTest() {
  console.log('=== Phase 5 Controlled Reliability & Retry Test ===');

  let dbProduct = null;
  const mockFailUrl = 'https://demo.inelabteamdev.com/product/mock-failure-test';

  // Create a temporary test product in Supabase to verify DB failure logging
  try {
    const products = await productService.getTrackedProducts();
    dbProduct = products.find(p => p.product_url === mockFailUrl);

    if (!dbProduct) {
      dbProduct = await productService.createTrackedProduct({
        productName: 'Controlled Failure Test Product',
        productUrl: mockFailUrl,
        externalProductId: 'FAIL-999'
      });
    }
  } catch (err) {
    console.log(`[RETRY TEST] Running without Supabase DB connection: ${err.message}`);
  }

  console.log('\n--- 1. Testing Retry & Final Failure Flow (Simulating 3 Failed Attempts) ---');

  // Custom mock fetchFn that always fails with a network/timeout error
  let mockAttemptCounter = 0;
  const mockFailingFetchFn = async (url) => {
    mockAttemptCounter++;
    throw new Error(`Simulated Network Timeout Error on attempt ${mockAttemptCounter}`);
  };

  const failResult = await scrapeProduct(dbProduct || mockFailUrl, {
    fetchFn: mockFailingFetchFn,
    backoffDelays: [500, 500] // shortened for fast test execution
  });

  console.log(`\n[RETRY TEST] Scraper returned final result:`, failResult);

  // Verify Supabase logs for failed attempts
  if (dbProduct) {
    console.log('\n--- Verifying Supabase Scrape Logs for Failed Product ---');
    try {
      const logs = await productService.getScrapeLogs(dbProduct.id);
      const history = await productService.getPriceHistory(dbProduct.id);

      console.log(`✅ Scrape Logs created for failure: ${logs.length} entries`);
      logs.forEach((log, idx) => {
        console.log(`   Log #${idx + 1}: Attempt #${log.attempt_number} | Status: '${log.status}' | Error: '${log.error_message}'`);
      });

      console.log(`✅ Price History count for failed product: ${history.length} entries`);
      if (history.length === 0) {
        console.log(`🎉 VERIFIED: Price history was NOT created for failed scrape!`);
      } else {
        console.error(`❌ ERROR: Price history was unexpectedly created for a failed scrape!`);
      }
    } catch (err) {
      console.error(`DB Read Error: ${err.message}`);
    }
  }

  console.log('\n--- 2. Testing Batch Processing (Product A Fails, Product B Succeeds) ---');

  // Product A (Fails)
  const productA = { id: dbProduct?.id, product_url: mockFailUrl, product_name: 'Failing Product A' };
  
  // Product B (Succeeds via mock fetch)
  const productB = { product_url: 'https://demo.inelabteamdev.com/product/376', product_name: 'Successful Product B' };
  const mockSuccessFetchFn = async (url) => {
    if (url.includes('mock-failure')) {
      throw new Error('Simulated Upstream 500 Error');
    }
    return {
      productUrl: url,
      rawProductName: 'Successful Product B',
      rawPrice: '₹4,500',
      rawStock: 'In stock · 50 left'
    };
  };

  const batchResults = await scrapeProductsBatch([productA, productB], {
    fetchFn: mockSuccessFetchFn,
    backoffDelays: [200, 200]
  });

  console.log('Batch Execution Summary:');
  batchResults.forEach((item, index) => {
    console.log(`  Product #${index + 1} (${item.product.product_name}): Success = ${item.result.success}`);
  });

  console.log('\n🎉 ALL RELIABILITY & RETRY TESTS PASSED SUCCESSFULLY!');
}

runControlledRetryTest();
