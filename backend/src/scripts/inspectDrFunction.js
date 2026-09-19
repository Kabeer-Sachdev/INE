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

async function inspectDrFunction() {
  const jsUrl = 'https://demo.inelabteamdev.com/assets/index-B9UiQq4X.js';
  console.log('=== Inspecting Dr function & Price Reveal API in JS bundle ===');
  try {
    const js = await fetchUrl(jsUrl);

    // Search around `async function` or `Dr=` or `Dr(`
    const drIndex = js.indexOf('Dr=');
    if (drIndex !== -1) {
      console.log('\n--- Code around Dr= ---');
      console.log(js.substring(drIndex - 200, drIndex + 800));
    }

    // Search for fetch or POST calls in JS bundle
    const postMatches = js.match(/fetch\([^)]*POST[^)]*\)/gi) || [];
    console.log('\n--- POST fetch calls found ---');
    console.log(postMatches);

    // Find any /api/ endpoints that weren't captured earlier
    const allEndpoints = js.match(/["']\/api\/[^"']+["']/g) || [];
    console.log('\n--- All quoted /api/ endpoints ---');
    console.log([...new Set(allEndpoints)]);

  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

inspectDrFunction();
