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

  // Extract numeric price substring (handles formats like "₹9,212", "$120.50", "Deal price ₹ 10,831")
  // First replace commas in numeric patterns (e.g. 9,212 -> 9212)
  const cleanedText = rawPrice.replace(/,/g, '');
  const match = cleanedText.match(/(\d+(?:\.\d+)?)/);

  if (!match) return null;

  const numericValue = parseFloat(match[1]);
  return isNaN(numericValue) ? null : numericValue;
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
