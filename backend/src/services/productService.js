const supabase = require('../config/supabase');

/**
 * 1. createTrackedProduct
 * Inserts a new product to track into tracked_products table.
 */
async function createTrackedProduct({ productName, productUrl, externalProductId = null, isActive = true }) {
  if (!productName || !productUrl) {
    throw new Error('productName and productUrl are required');
  }

  const { data, error } = await supabase
    .from('tracked_products')
    .insert([
      {
        product_name: productName,
        product_url: productUrl,
        external_product_id: externalProductId,
        is_active: isActive
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create tracked product: ${error.message}`);
  }

  return data;
}

/**
 * 2. getTrackedProducts
 * Retrieves all tracked products.
 */
async function getTrackedProducts() {
  const { data, error } = await supabase
    .from('tracked_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tracked products: ${error.message}`);
  }

  return data;
}

/**
 * 3. getActiveTrackedProducts
 * Retrieves all tracked products where is_active is true.
 */
async function getActiveTrackedProducts() {
  const { data, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch active tracked products: ${error.message}`);
  }

  return data;
}

/**
 * 4. getProductById
 * Retrieves a single tracked product by its UUID.
 */
async function getProductById(productId) {
  if (!productId) {
    throw new Error('productId is required');
  }

  const { data, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch product by id: ${error.message}`);
  }

  return data;
}

/**
 * 5. getPriceHistory
 * Retrieves price history for a specific product, ordered by scraped_at descending.
 */
async function getPriceHistory(productId) {
  if (!productId) {
    throw new Error('productId is required');
  }

  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('product_id', productId)
    .order('scraped_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch price history: ${error.message}`);
  }

  return data;
}

/**
 * 6. getScrapeLogs
 * Retrieves scrape logs for a specific product, ordered by created_at descending.
 */
async function getScrapeLogs(productId) {
  if (!productId) {
    throw new Error('productId is required');
  }

  const { data, error } = await supabase
    .from('scrape_logs')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch scrape logs: ${error.message}`);
  }

  return data;
}

/**
 * 7. savePriceHistory
 * Inserts a VALID successful scrape result into price_history.
 * Enforces strict data-integrity rule: price must be a valid positive number and stock must be non-empty.
 */
async function savePriceHistory({ productId, price, stock }) {
  if (!productId) {
    throw new Error('productId is required');
  }

  // Strict Validation: Do NOT allow invalid or zero/fake price/stock
  if (typeof price !== 'number' || isNaN(price) || price <= 0) {
    throw new Error(`Invalid price value (${price}): price_history requires a valid positive numeric price. Failed scrapes MUST NOT write to price_history.`);
  }

  if (typeof stock !== 'string' || !stock.trim()) {
    throw new Error(`Invalid stock value ('${stock}'): price_history requires a valid stock status string.`);
  }

  const { data, error } = await supabase
    .from('price_history')
    .insert([
      {
        product_id: productId,
        price: price,
        stock: stock.trim()
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save price history: ${error.message}`);
  }

  return data;
}

/**
 * 8. createScrapeLog
 * Records every scrape attempt (success, retrying, failed) in scrape_logs.
 */
async function createScrapeLog({ productId, status, attemptNumber = 1, errorMessage = null, durationMs = null }) {
  if (!productId) {
    throw new Error('productId is required');
  }

  const validStatuses = ['success', 'retrying', 'failed'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('scrape_logs')
    .insert([
      {
        product_id: productId,
        status: status,
        attempt_number: attemptNumber,
        error_message: errorMessage,
        duration_ms: durationMs
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create scrape log: ${error.message}`);
  }

  return data;
}

module.exports = {
  createTrackedProduct,
  getTrackedProducts,
  getActiveTrackedProducts,
  getProductById,
  getPriceHistory,
  getScrapeLogs,
  savePriceHistory,
  createScrapeLog
};
