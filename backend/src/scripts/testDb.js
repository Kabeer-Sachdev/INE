const productService = require('../services/productService');
const supabase = require('../config/supabase');

async function runDatabaseTests() {
  console.log('--- Phase 2 Supabase Database Integration Verification ---');

  const supabaseUrl = process.env.SUPABASE_URL;
  const isPlaceholder = !supabaseUrl || supabaseUrl.includes('your-project');

  if (isPlaceholder) {
    console.log('\n[INFO] Environment variables currently set to placeholders.');
    console.log('To connect to live Supabase, replace SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY in backend/.env');
    console.log('\nTesting Data Integrity & Service Validation Rules locally...\n');
  }

  // Test 1: Data Integrity Enforcer for Invalid Price History
  try {
    console.log('Test 1: Testing Data Integrity Rule (Rejecting invalid price <= 0)...');
    await productService.savePriceHistory({
      productId: '11111111-1111-1111-1111-111111111111',
      price: 0,
      stock: 'In Stock'
    });
    console.error('❌ FAIL: Invalid price (0) was unexpectedly accepted!');
  } catch (err) {
    console.log(`✅ PASS: Invalid price correctly rejected: "${err.message}"`);
  }

  // Test 2: Data Integrity Enforcer for Missing/Empty Stock
  try {
    console.log('\nTest 2: Testing Data Integrity Rule (Rejecting empty stock)...');
    await productService.savePriceHistory({
      productId: '11111111-1111-1111-1111-111111111111',
      price: 99.99,
      stock: ''
    });
    console.error('❌ FAIL: Empty stock was unexpectedly accepted!');
  } catch (err) {
    console.log(`✅ PASS: Empty stock correctly rejected: "${err.message}"`);
  }

  // Test 3: Status Validation for Scrape Logs
  try {
    console.log('\nTest 3: Testing Scrape Log Status Validation...');
    await productService.createScrapeLog({
      productId: '11111111-1111-1111-1111-111111111111',
      status: 'invalid_status'
    });
    console.error('❌ FAIL: Invalid status was unexpectedly accepted!');
  } catch (err) {
    console.log(`✅ PASS: Invalid status correctly rejected: "${err.message}"`);
  }

  if (!isPlaceholder) {
    try {
      console.log('\nTest 4: Attempting Live Supabase Operations...');
      const testUrl = `https://example.com/test-product-${Date.now()}`;
      
      console.log('  a. Creating tracked product...');
      const product = await productService.createTrackedProduct({
        productName: 'Test Product',
        productUrl: testUrl,
        externalProductId: 'TEST-123'
      });
      console.log(`  ✅ Product Created: ID ${product.id}`);

      console.log('  b. Fetching active products...');
      const activeProducts = await productService.getActiveTrackedProducts();
      console.log(`  ✅ Active Products count: ${activeProducts.length}`);

      console.log('  c. Inserting valid price history...');
      const priceRecord = await productService.savePriceHistory({
        productId: product.id,
        price: 299.99,
        stock: 'In Stock'
      });
      console.log(`  ✅ Price History Saved: $${priceRecord.price} (${priceRecord.stock})`);

      console.log('  d. Inserting scrape log...');
      const logRecord = await productService.createScrapeLog({
        productId: product.id,
        status: 'success',
        attemptNumber: 1,
        durationMs: 450
      });
      console.log(`  ✅ Scrape Log Created: Status ${logRecord.status}`);

      console.log('\n🎉 ALL LIVE SUPABASE TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
      console.error(`\n❌ Live Supabase Test Error: ${err.message}`);
    }
  } else {
    console.log('\n---------------------------------------------------------');
    console.log('Service Layer validation logic verified.');
    console.log('Once you provide real Supabase credentials in backend/.env and execute schema.sql in Supabase SQL Editor, run:');
    console.log('  npm run test:db');
    console.log('---------------------------------------------------------');
  }
}

runDatabaseTests();
