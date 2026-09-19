/**
 * Scraper Configuration Constants
 */
const SCRAPER_CONFIG = {
  MAX_ATTEMPTS: 3,
  BACKOFF_DELAYS: [1000, 2000], // Delay before attempt 2 (1000ms) and attempt 3 (2000ms)
  TIMEOUT_MS: 15000
};

module.exports = SCRAPER_CONFIG;
