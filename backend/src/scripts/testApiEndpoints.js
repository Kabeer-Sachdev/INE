const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function testApiEndpoints() {
  console.log('=== Testing Storefront API Endpoints ===');
  
  // 1. Catalog
  try {
    const catalog = await fetchJson('https://demo.inelabteamdev.com/api/catalog?page=1&pageSize=10');
    console.log(`\nGET /api/catalog Status: ${catalog.status}`);
    console.log('Catalog Response preview:');
    console.log(JSON.stringify(catalog.data || catalog.raw, null, 2).substring(0, 1500));

    let sampleId = null;
    if (catalog.data && catalog.data.items && catalog.data.items.length > 0) {
      sampleId = catalog.data.items[0].id || catalog.data.items[0].slug;
      console.log(`\nSample Product ID from catalog: ${sampleId}`);
    }

    if (!sampleId) sampleId = '1';

    // 2. Product endpoint
    const product = await fetchJson(`https://demo.inelabteamdev.com/api/product/${sampleId}`);
    console.log(`\nGET /api/product/${sampleId} Status: ${product.status}`);
    console.log('Product Response:');
    console.log(JSON.stringify(product.data || product.raw, null, 2));

  } catch (err) {
    console.error(`API Test Error: ${err.message}`);
  }
}

testApiEndpoints();
