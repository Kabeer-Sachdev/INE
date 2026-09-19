const { scrapeProduct } = require('../scraper/scraperService');

/**
 * Headed Scraper Demo Script
 * Run: npm run scrape:demo-headed
 * Launches Chromium in HEADED mode (headless: false) to visually demonstrate:
 * 1. Playwright browser navigation to target storefront product
 * 2. Human mouse hover trajectory over price block
 * 3. Reveal Price button click
 * 4. Error recovery / retry handling
 * 5. Data extraction and validation
 */
async function runHeadedDemo() {
  console.log('==================================================');
  console.log('🎬 HEADED PLAYWRIGHT SCRAPER DEMONSTRATION');
  console.log('==================================================');
  console.log('Launching Playwright Chromium browser in HEADED mode...\n');

  const targetUrl = 'https://demo.inelabteamdev.com/product/796';

  try {
    const result = await scrapeProduct(
      {
        id: null,
        product_url: targetUrl,
        product_name: 'Basecamp Waterproof Boot X (Headed Demo)'
      },
      {
        headless: false,   // Headed browser visible on desktop
        slowMo: 100        // Slow down operations for recording clarity
      }
    );

    console.log('\n==================================================');
    console.log('DEMO SCRAPE RESULT:');
    console.log(JSON.stringify(result, null, 2));
    console.log('==================================================');

  } catch (err) {
    console.error(`[DEMO ERROR] Headed scrape demo encountered error: ${err.message}`);
  }
}

runHeadedDemo();
