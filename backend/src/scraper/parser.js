/**
 * Parser Module
 * Responsible for cleaning and normalizing raw DOM strings into structured data formats.
 */

function parseProductName(rawName) {
  if (!rawName || typeof rawName !== 'string') return null;
  const cleaned = rawName.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function parsePrice(rawPrice) {
  if (!rawPrice || typeof rawPrice !== 'string') return null;

  // 1. Normalize full-width Unicode digits (０-９) to ASCII digits (0-9)
  let sanitized = rawPrice.replace(/[\uFF10-\uFF19]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 65248));

  // 2. Strip zero-width spaces, non-breaking spaces, and formatting characters
  sanitized = sanitized.replace(/[\u200B\u00A0\uFEFF\u200C\u200D]/g, '').trim();

  // 3. Ignore error/status messages or loading text
  if (/couldn't load|challenge_failed|price hidden|loading|try again/i.test(sanitized)) {
    return null;
  }

  // 4. Extract numeric price immediately following currency symbol ₹, $, or Rs.
  const currencyMatch = sanitized.match(/(?:₹|\$|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
  if (currencyMatch) {
    const numericStr = currencyMatch[1].replace(/,/g, '');
    const val = parseFloat(numericStr);
    return isNaN(val) || val <= 0 ? null : val;
  }

  // 5. Fallback match for numeric text
  const cleanedText = sanitized.replace(/,/g, '');
  const match = cleanedText.match(/(\d+(?:\.\d+)?)/);

  if (!match) return null;

  const numericValue = parseFloat(match[1]);
  return isNaN(numericValue) || numericValue <= 0 ? null : numericValue;
}

function parseStock(rawStock) {
  if (!rawStock || typeof rawStock !== 'string') return null;

  // Clean extra spaces and newlines
  const cleaned = rawStock.replace(/\s+/g, ' ').trim();

  // Exclude error messages or price status texts if accidentally captured
  if (/price hidden|couldn't load|error|failed/i.test(cleaned)) {
    return null;
  }

  return cleaned || null;
}

function parseProductData(rawData) {
  return {
    productName: parseProductName(rawData.rawProductName),
    price: parsePrice(rawData.rawPrice),
    stock: parseStock(rawData.rawStock)
  };
}

module.exports = {
  parseProductName,
  parsePrice,
  parseStock,
  parseProductData
};
