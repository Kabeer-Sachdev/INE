const https = require('https');
const productService = require('../services/productService');
const scraperService = require('../scraper/scraperService');

/**
 * Helper to fetch JSON via HTTPS
 */
function fetchHttpsJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON response from ${url}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Helper to validate product URL domain (Security requirement)
 */
function isAllowedProductUrl(urlStr) {
  try {
    const parsedUrl = new URL(urlStr);
    return parsedUrl.hostname === 'demo.inelabteamdev.com';
  } catch (e) {
    return false;
  }
}

/**
 * 1. GET /api/products/search?q=<query>
 * Searches the INE mock storefront catalog by query term.
 */
async function searchProducts(req, res) {
  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Search query parameter 'q' is required."
      }
    });
  }

  try {
    // Fetch product catalog from actual INE mock store REST API (discovered in Phase 3)
    const catalogData = await fetchHttpsJson('https://demo.inelabteamdev.com/api/catalog?page=1&pageSize=100');
    const items = catalogData.items || [];

    const lowerQ = query.toLowerCase();
    const matches = items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return name.includes(lowerQ) || brand.includes(lowerQ) || category.includes(lowerQ) || desc.includes(lowerQ);
    });

    const products = matches.map(item => ({
      name: item.name,
      url: `https://demo.inelabteamdev.com/product/${item.id}`,
      externalProductId: String(item.id)
    }));

    return res.json({
      success: true,
      products: products
    });

  } catch (err) {
    console.error('[API SEARCH ERROR]', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'STOREFRONT_SEARCH_FAILED',
        message: 'Failed to search product catalog from target storefront.'
      }
    });
  }
}

/**
 * 2. POST /api/products/track
 * Tracks a new product in the database.
 */
async function trackProduct(req, res) {
  const { productName, productUrl, externalProductId } = req.body;

  if (!productName || !productUrl) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Fields 'productName' and 'productUrl' are required."
      }
    });
  }

  // Security Check: Restrict URLs to target storefront only
  if (!isAllowedProductUrl(productUrl)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Only product URLs from demo.inelabteamdev.com can be tracked.'
      }
    });
  }

  try {
    // Check for duplicate tracking by product URL
    const existingProducts = await productService.getTrackedProducts();
    const isDuplicate = existingProducts.some(p => p.product_url === productUrl);

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_PRODUCT',
          message: 'This product is already being tracked.'
        }
      });
    }

    const tracked = await productService.createTrackedProduct({
      productName: productName.trim(),
      productUrl: productUrl.trim(),
      externalProductId: externalProductId ? String(externalProductId).trim() : null
    });

    return res.status(201).json({
      success: true,
      product: {
        id: tracked.id,
        productName: tracked.product_name,
        productUrl: tracked.product_url,
        externalProductId: tracked.external_product_id,
        isActive: tracked.is_active,
        createdAt: tracked.created_at
      }
    });

  } catch (err) {
    console.error('[API TRACK ERROR]', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TRACKING_FAILED',
        message: err.message
      }
    });
  }
}

/**
 * 3. GET /api/products
 * Returns all active tracked products.
 */
async function getTrackedProducts(req, res) {
  try {
    const rawProducts = await productService.getActiveTrackedProducts();

    const products = rawProducts.map(p => ({
      id: p.id,
      productName: p.product_name,
      productUrl: p.product_url,
      externalProductId: p.external_product_id,
      isActive: p.is_active,
      createdAt: p.created_at
    }));

    return res.json({
      success: true,
      products: products
    });

  } catch (err) {
    console.error('[API GET PRODUCTS ERROR]', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to retrieve tracked products.'
      }
    });
  }
}

/**
 * 4. GET /api/products/:id/history
 * Returns price and stock history for a tracked product.
 */
async function getProductHistory(req, res) {
  const productId = req.params.id;

  try {
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Tracked product not found.'
        }
      });
    }

    const rawHistory = await productService.getPriceHistory(productId);
    const history = rawHistory.map(item => ({
      price: parseFloat(item.price),
      stock: item.stock,
      scrapedAt: item.scraped_at
    }));

    return res.json({
      success: true,
      product: {
        id: product.id,
        productName: product.product_name
      },
      history: history
    });

  } catch (err) {
    const isNotFound = err.message.includes('JSON object') || err.message.includes('syntax for type uuid') || err.message.includes('PGRST116');
    if (isNotFound) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Tracked product not found.'
        }
      });
    }

    console.error('[API GET HISTORY ERROR]', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_HISTORY_FAILED',
        message: err.message
      }
    });
  }
}

/**
 * 5. GET /api/products/:id/logs
 * Returns scrape logs for a tracked product.
 */
async function getScrapeLogs(req, res) {
  const productId = req.params.id;

  try {
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Tracked product not found.'
        }
      });
    }

    const rawLogs = await productService.getScrapeLogs(productId);
    const logs = rawLogs.map(log => ({
      status: log.status,
      attemptNumber: log.attempt_number,
      errorMessage: log.error_message,
      durationMs: log.duration_ms,
      createdAt: log.created_at
    }));

    return res.json({
      success: true,
      product: {
        id: product.id,
        productName: product.product_name
      },
      logs: logs
    });

  } catch (err) {
    const isNotFound = err.message.includes('JSON object') || err.message.includes('syntax for type uuid') || err.message.includes('PGRST116');
    if (isNotFound) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Tracked product not found.'
        }
      });
    }

    console.error('[API GET LOGS ERROR]', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_LOGS_FAILED',
        message: err.message
      }
    });
  }
}

/**
 * 6. POST /api/products/:id/scrape
 * Manually triggers a scrape run for an existing tracked product.
 */
async function manualScrape(req, res) {
  const productId = req.params.id;

  try {
    const product = await productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Tracked product not found.'
        }
      });
    }

    // Execute Phase 5 reliable scraper
    const result = await scraperService.scrapeProduct(product, { headless: true, timeoutMs: 20000 });

    if (result.success) {
      return res.json({
        success: true,
        data: {
          price: result.price,
          stock: result.stock,
          scrapedAt: new Date().toISOString()
        }
      });
    } else {
      return res.status(502).json({
        success: false,
        error: {
          code: 'SCRAPE_FAILED',
          message: `Scraping failed after ${result.attempts} attempts: ${result.error}`
        }
      });
    }

  } catch (err) {
    const isNotFound = err.message.includes('JSON object') || err.message.includes('syntax for type uuid') || err.message.includes('PGRST116');
    if (isNotFound) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Tracked product not found.'
        }
      });
    }

    console.error('[API MANUAL SCRAPE ERROR]', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SCRAPE_EXECUTION_ERROR',
        message: err.message
      }
    });
  }
}

module.exports = {
  searchProducts,
  trackProduct,
  getTrackedProducts,
  getProductHistory,
  getScrapeLogs,
  manualScrape
};
