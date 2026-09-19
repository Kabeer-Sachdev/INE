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

async function findPriceEndpoints() {
  const jsUrl = 'https://demo.inelabteamdev.com/assets/index-B9UiQq4X.js';
  console.log('=== Searching JS bundle for Price API & Challenge endpoints ===');
  try {
    const js = await fetchUrl(jsUrl);
    
    // Find all occurrences of /api/
    const apiCalls = js.match(/\/api\/[a-zA-Z0-9_\-\/\?\=\&\$\{\}]+/g) || [];
    console.log('\n--- All API paths in JS bundle ---');
    console.log([...new Set(apiCalls)]);

    // Search for "challenge" or "upstream" or "reveal"
    ['challenge', 'upstream', 'reveal', 'REVEAL', 'attempt', '500', 'price'].forEach(term => {
      const reg = new RegExp(`.{0,60}${term}.{0,60}`, 'gi');
      const matches = js.match(reg) || [];
      console.log(`\n--- Snippets for "${term}" (${matches.length} matches) ---`);
      console.log(matches.slice(0, 5).join('\n---\n'));
    });

  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

findPriceEndpoints();
