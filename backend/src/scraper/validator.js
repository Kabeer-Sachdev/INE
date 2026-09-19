/**
 * Validator Module
 * Enforces strict data-integrity requirements for scraped product data.
 * Throws explicit errors on invalid or incomplete extractions.
 */

function validateScrapedData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Validation Failed: Scraped data payload is null or invalid object.');
  }

  // 1. Validate Product Name
  if (!data.productName || typeof data.productName !== 'string' || !data.productName.trim()) {
    throw new Error('Validation Failed: Product name could not be extracted.');
  }

  // 2. Validate Price (Must be positive numeric float/int)
  if (data.price === null || data.price === undefined || typeof data.price !== 'number' || isNaN(data.price) || data.price <= 0) {
    throw new Error(`Validation Failed: Price could not be extracted or is non-positive (received: ${data.price}).`);
  }

  // 3. Validate Stock Info
  if (!data.stock || typeof data.stock !== 'string' || !data.stock.trim()) {
    throw new Error('Validation Failed: Stock information could not be extracted.');
  }

  return true;
}

module.exports = {
  validateScrapedData
};
