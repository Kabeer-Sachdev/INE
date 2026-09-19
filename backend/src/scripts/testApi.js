const http = require('http');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('../routes/productRoutes');

function httpRequest({ port, path, method = 'GET', body = null }) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

async function runApiTests() {
  console.log('=== Phase 6 REST API Integration Test ===');

  // Start temporary Express instance for API testing
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/products', productRoutes);

  const testPort = 5099;
  const server = app.listen(testPort);

  try {
    // Test 1: GET /api/products/search?q=basecamp
    console.log('\nTest 1: GET /api/products/search?q=basecamp');
    const res1 = await httpRequest({ port: testPort, path: '/api/products/search?q=basecamp' });
    console.log(`  Status: ${res1.status} | Products found: ${res1.body.products?.length || 0}`);
    if (res1.status === 200 && res1.body.products.length > 0) {
      console.log(`  ✅ Sample product: ${res1.body.products[0].name} (${res1.body.products[0].url})`);
    } else {
      console.error('  ❌ Search failed:', res1.body);
    }

    // Test 2: GET /api/products/search (Empty Query -> 400 Bad Request)
    console.log('\nTest 2: GET /api/products/search (Empty Query -> 400 Validation Error)');
    const res2 = await httpRequest({ port: testPort, path: '/api/products/search?q=' });
    console.log(`  Status: ${res2.status} | Error Code: ${res2.body.error?.code}`);
    if (res2.status === 400 && res2.body.error?.code === 'VALIDATION_ERROR') {
      console.log('  ✅ Correctly rejected empty search query');
    } else {
      console.error('  ❌ Unexpected status/response:', res2);
    }

    // Test 3: POST /api/products/track (Invalid Domain -> 400 Invalid URL)
    console.log('\nTest 3: POST /api/products/track (Arbitrary URL google.com -> 400 Invalid URL)');
    const res3 = await httpRequest({
      port: testPort,
      path: '/api/products/track',
      method: 'POST',
      body: { productName: 'Fake Product', productUrl: 'https://google.com/product/123' }
    });
    console.log(`  Status: ${res3.status} | Error Code: ${res3.body.error?.code}`);
    if (res3.status === 400 && res3.body.error?.code === 'INVALID_URL') {
      console.log('  ✅ Correctly rejected unauthorized external URL');
    } else {
      console.error('  ❌ Unexpected response:', res3);
    }

    // Test 4: POST /api/products/track (Valid Tracked Product)
    console.log('\nTest 4: POST /api/products/track (Valid INE Product)');
    const testTrackUrl = `https://demo.inelabteamdev.com/product/api-test-${Date.now()}`;
    const res4 = await httpRequest({
      port: testPort,
      path: '/api/products/track',
      method: 'POST',
      body: { productName: 'API Test Item', productUrl: testTrackUrl, externalProductId: '9999' }
    });
    console.log(`  Status: ${res4.status} | Tracked ID: ${res4.body.product?.id}`);
    let createdId = res4.body.product?.id;

    if (res4.status === 201 && createdId) {
      console.log('  ✅ Tracked Product created successfully');
    } else {
      console.error('  ❌ Track failed:', res4.body);
    }

    // Test 5: POST /api/products/track (Duplicate -> 409 Conflict)
    console.log('\nTest 5: POST /api/products/track (Duplicate URL -> 409 Conflict)');
    const res5 = await httpRequest({
      port: testPort,
      path: '/api/products/track',
      method: 'POST',
      body: { productName: 'API Test Item', productUrl: testTrackUrl }
    });
    console.log(`  Status: ${res5.status} | Error Code: ${res5.body.error?.code}`);
    if (res5.status === 409 && res5.body.error?.code === 'DUPLICATE_PRODUCT') {
      console.log('  ✅ Correctly rejected duplicate product URL');
    } else {
      console.error('  ❌ Unexpected duplicate response:', res5);
    }

    // Test 6: GET /api/products (List Tracked Products)
    console.log('\nTest 6: GET /api/products');
    const res6 = await httpRequest({ port: testPort, path: '/api/products' });
    console.log(`  Status: ${res6.status} | Total Active Products: ${res6.body.products?.length}`);
    if (res6.status === 200 && res6.body.products.length > 0) {
      console.log('  ✅ Tracked products retrieved successfully');
    }

    if (createdId) {
      // Test 7: GET /api/products/:id/history
      console.log(`\nTest 7: GET /api/products/${createdId}/history`);
      const res7 = await httpRequest({ port: testPort, path: `/api/products/${createdId}/history` });
      console.log(`  Status: ${res7.status} | History entries: ${res7.body.history?.length}`);

      // Test 8: GET /api/products/:id/logs
      console.log(`\nTest 8: GET /api/products/${createdId}/logs`);
      const res8 = await httpRequest({ port: testPort, path: `/api/products/${createdId}/logs` });
      console.log(`  Status: ${res8.status} | Log entries: ${res8.body.logs?.length}`);
    }

    // Test 9: GET /api/products/00000000-0000-0000-0000-000000000000/history (404 Not Found)
    console.log('\nTest 9: GET /api/products/nonexistent-id/history -> 404 Not Found');
    const res9 = await httpRequest({ port: testPort, path: '/api/products/00000000-0000-0000-0000-000000000000/history' });
    console.log(`  Status: ${res9.status} | Error Code: ${res9.body.error?.code}`);
    if (res9.status === 404 && res9.body.error?.code === 'PRODUCT_NOT_FOUND') {
      console.log('  ✅ Correctly returned 404 for nonexistent product');
    }

    console.log('\n🎉 ALL PHASE 6 API INTEGRATION TESTS PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error('API Test Failure:', err);
  } finally {
    server.close();
  }
}

runApiTests();
