const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function inspectJsAsset() {
  const jsUrl = 'https://demo.inelabteamdev.com/assets/index-B9UiQq4X.js';
  console.log(`=== Fetching JS asset: ${jsUrl} ===`);
  try {
    const jsContent = await fetchUrl(jsUrl);
    console.log(`JS File size: ${jsContent.length} characters`);

    // Search for API endpoints, URLs, routes, price selectors, data attributes, etc.
    const apiMatches = jsContent.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || [];
    console.log('\n--- API paths found in JS bundle ---');
    console.log([...new Set(apiMatches)]);

    const fetchMatches = jsContent.match(/fetch\([^)]+\)/g) || [];
    console.log('\n--- fetch() calls found in JS bundle ---');
    console.log(fetchMatches.slice(0, 10));

    const routes = jsContent.match(/path:\s*["']([^"']+)["']/g) || [];
    console.log('\n--- Router paths found ---');
    console.log(routes);

    // Look for data-testid, data-*, id, class names, or state properties
    const dataTestIds = jsContent.match(/data-testid=["']([^"']+)["']/g) || [];
    console.log('\n--- data-testid attributes found ---');
    console.log([...new Set(dataTestIds)]);

    // Check for hardcoded delay / timeout / artificial errors
    const setTimeoutMatches = jsContent.match(/setTimeout\([^)]+\)/g) || [];
    console.log('\n--- setTimeout / artificial delays found ---');
    console.log(setTimeoutMatches.slice(0, 10));

    // Search snippets containing keywords like price, stock, product, delay, fail, error
    const productKeywords = ['price', 'stock', 'product', 'search', 'delay', 'error', 'fail'];
    productKeywords.forEach(kw => {
      const regex = new RegExp(`.{0,40}${kw}.{0,40}`, 'gi');
      const matches = jsContent.match(regex) || [];
      console.log(`\n--- Keyword "${kw}" snippets (${matches.length} total) ---`);
      console.log(matches.slice(0, 5).join('\n'));
    });

  } catch (err) {
    console.error(`JS Inspection Error: ${err.message}`);
  }
}

inspectJsAsset();
