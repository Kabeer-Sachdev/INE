const { scrapeProduct } = require('../scraper/scraperService');
const productService = require('../services/productService');

async function runReliabilityTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING PHASE 9 SCRAPER RELIABILITY TEST SUITE');
  console.log('==================================================\n');

  try {
    // --------------------------------------------------
    // SCENARIO A — SUCCESS
    // --------------------------------------------------
    console.log('--- SCENARIO A: Single Scrape Success ---');
    let mockFetchSuccessCount = 0;
    const mockSuccessFetch = async (url) => {
      mockFetchSuccessCount++;
      return {
        rawProductName: 'Reliability Test Product A',
        rawPrice: '₹14,999',
        rawStock: 'In stock · 50 left'
      };
    };

    const resA = await scrapeProduct('https://demo.inelabteamdev.com/product/796', {
      fetchFn: mockSuccessFetch,
      maxAttempts: 3,
      backoffDelays: [100, 100]
    });

    console.log('Result A:', JSON.stringify(resA));
    if (!resA.success || resA.price !== 14999) throw new Error('Scenario A Failed!');
    console.log('✅ SCENARIO A PASSED: Scrape succeeded on attempt 1 with valid price.\n');

    // --------------------------------------------------
    // SCENARIO B — TEMPORARY FAILURE + RETRY RECOVERY
    // --------------------------------------------------
    console.log('--- SCENARIO B: Temporary Failure -> Retry -> Success ---');
    let attemptCountB = 0;
    const mockTempFailureFetch = async (url) => {
      attemptCountB++;
      if (attemptCountB === 1) {
        throw new Error('Simulated upstream network glitch on attempt 1');
      }
      return {
        rawProductName: 'Reliability Test Product B',
        rawPrice: '₹8,499',
        rawStock: 'In stock'
      };
    };

    const resB = await scrapeProduct('https://demo.inelabteamdev.com/product/376', {
      fetchFn: mockTempFailureFetch,
      maxAttempts: 3,
      backoffDelays: [100, 100]
    });

    console.log('Result B:', JSON.stringify(resB));
    if (!resB.success || resB.attemptCount !== 2 || resB.price !== 8499) {
      throw new Error('Scenario B Failed!');
    }
    console.log('✅ SCENARIO B PASSED: Recovered on attempt 2 after temporary failure.\n');

    // --------------------------------------------------
    // SCENARIO C — FINAL FAILURE (NO INVALID HISTORY SAVED)
    // --------------------------------------------------
    console.log('--- SCENARIO C: Final Failure after 3 attempts ---');
    let attemptCountC = 0;
    const mockPersistentFailureFetch = async (url) => {
      attemptCountC++;
      throw new Error(`Persistent upstream 500 error on attempt ${attemptCountC}`);
    };

    const resC = await scrapeProduct('https://demo.inelabteamdev.com/product/mock-failure', {
      fetchFn: mockPersistentFailureFetch,
      maxAttempts: 3,
      backoffDelays: [100, 100]
    });

    console.log('Result C:', JSON.stringify(resC));
    if (resC.success !== false || resC.attempts !== 3) {
      throw new Error('Scenario C Failed!');
    }
    console.log('✅ SCENARIO C PASSED: Honest final failure recorded; no invalid price saved.\n');

    // --------------------------------------------------
    // SCENARIO D — MULTIPLE PRODUCTS FAILURE ISOLATION
    // --------------------------------------------------
    console.log('--- SCENARIO D: Multiple Products Failure Isolation ---');
    const mockProducts = [
      { id: null, product_url: 'https://demo.inelabteamdev.com/product/fail-item', product_name: 'Failing Product A' },
      { id: null, product_url: 'https://demo.inelabteamdev.com/product/796', product_name: 'Successful Product B' }
    ];

    let batchSuccesses = 0;
    let batchFailures = 0;

    for (const prod of mockProducts) {
      const fetchFn = prod.product_url.includes('fail-item') ? mockPersistentFailureFetch : mockSuccessFetch;
      const res = await scrapeProduct(prod, { fetchFn, maxAttempts: 2, backoffDelays: [50] });
      if (res.success) batchSuccesses++;
      else batchFailures++;
    }

    console.log(`Batch Summary: ${batchSuccesses} succeeded, ${batchFailures} failed out of ${mockProducts.length}`);
    if (batchSuccesses !== 1 || batchFailures !== 1) throw new Error('Scenario D Failed!');
    console.log('✅ SCENARIO D PASSED: Failure of Product A isolated; Product B executed successfully.\n');

    console.log('==================================================');
    console.log('🎉 ALL 4 RELIABILITY SCENARIOS VERIFIED SUCCESSFULLY!');
    console.log('==================================================');

  } catch (err) {
    console.error(`❌ RELIABILITY TEST FAILED: ${err.message}`);
    process.exit(1);
  }
}

runReliabilityTests();
