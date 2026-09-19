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

async function findPriceFetch() {
  const jsUrl = 'https://demo.inelabteamdev.com/assets/index-B9UiQq4X.js';
  console.log('=== Finding Price Quote Fetch Function ===');
  try {
    const js = await fetchUrl(jsUrl);

    // Search for "quote" or "phase:`success`" or "retrying"
    const successIdx = js.indexOf('phase:`success`');
    if (successIdx !== -1) {
      console.log('\n--- Code around phase:`success` ---');
      console.log(js.substring(successIdx - 400, successIdx + 400));
    }

    // Search for fetch calls in the whole JS
    const fetchRegex = /fetch\([^)]+\)/gi;
    let match;
    console.log('\n--- All fetch calls in JS bundle ---');
    while ((match = fetchRegex.exec(js)) !== null) {
      console.log(`Index ${match.index}: ${match[0]}`);
      console.log('   Context:', js.substring(Math.max(0, match.index - 100), Math.min(js.length, match.index + 150)));
    }

  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

findPriceFetch();
