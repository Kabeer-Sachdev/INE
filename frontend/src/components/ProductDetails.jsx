import React from 'react';

export function ProductDetails({
  product,
  latestHistory,
  onScrapeNow,
  scraping,
  scrapeError,
  scrapeSuccess
}) {
  if (!product) {
    return (
      <div className="card details-card">
        <h2>Selected Product Overview</h2>
        <div className="empty-state">
          <p>Select a tracked product from the list to view its price history, scrape logs, and trigger manual scraping.</p>
        </div>
      </div>
    );
  }

  const latestPrice = latestHistory ? `₹${parseFloat(latestHistory.price).toLocaleString('en-IN')}` : null;
  const latestStock = latestHistory ? latestHistory.stock : null;
  const latestTime = latestHistory ? new Date(latestHistory.scrapedAt).toLocaleString() : null;

  return (
    <div className="card details-card">
      <div className="product-summary-header">
        <div>
          <h2>{product.productName}</h2>
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="store-link"
          >
            View on Storefront ↗
          </a>
        </div>

        <button
          onClick={() => onScrapeNow(product.id)}
          disabled={scraping}
          className="btn btn-action"
        >
          {scraping ? 'Scraping Storefront...' : '⚡ Scrape Now'}
        </button>
      </div>

      {scrapeSuccess && (
        <div className="alert alert-success">
          {scrapeSuccess}
        </div>
      )}

      {scrapeError && (
        <div className="alert alert-error">
          <strong>Scrape Attempt Error:</strong> {scrapeError}
        </div>
      )}

      <div className="stats-row">
        <div className="stat-box">
          <span className="stat-label">Current Price</span>
          <span className="stat-value price">{latestPrice || 'No data yet'}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Stock Status</span>
          <span className="stat-value stock">{latestStock || 'No data yet'}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Last Scraped Time</span>
          <span className="stat-value time">{latestTime || 'Never'}</span>
        </div>
      </div>
    </div>
  );
}
