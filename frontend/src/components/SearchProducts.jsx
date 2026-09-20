import React, { useState } from 'react';
import { api } from '../services/api';

export function SearchProducts({ onProductTracked }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackingMap, setTrackingMap] = useState({});
  const [feedback, setFeedback] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const data = await api.searchProducts(trimmed);
      const rawProducts = data.products || [];

      // Deduplicate on frontend by externalProductId
      const uniqueList = [];
      const seenIds = new Set();
      for (const p of rawProducts) {
        if (p && p.externalProductId && !seenIds.has(p.externalProductId)) {
          seenIds.add(p.externalProductId);
          uniqueList.push(p);
        }
      }

      setResults(uniqueList);
      if (uniqueList.length === 0) {
        setError('No products found matching your search term.');
      }
    } catch (err) {
      setError(err.message || 'Failed to search products.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (product) => {
    setTrackingMap(prev => ({ ...prev, [product.externalProductId]: true }));
    setFeedback(null);

    try {
      const data = await api.trackProduct({
        productName: product.name,
        productUrl: product.url,
        externalProductId: product.externalProductId
      });

      setFeedback({ type: 'success', text: `Successfully tracked "${product.name}"!` });
      if (onProductTracked) {
        onProductTracked(data.product);
      }
    } catch (err) {
      if (err.code === 'DUPLICATE_PRODUCT') {
        setFeedback({ type: 'warn', text: `"${product.name}" is already being tracked.` });
      } else {
        setFeedback({ type: 'error', text: err.message || 'Failed to track product.' });
      }
    } finally {
      setTrackingMap(prev => ({ ...prev, [product.externalProductId]: false }));
    }
  };

  return (
    <div className="card search-card">
      <h2>Search Products</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search product name or brand (e.g. Basecamp)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
          className="input-field"
        />
        <button type="submit" disabled={loading || !query.trim()} className="btn btn-primary">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {feedback && (
        <div className={`alert alert-${feedback.type}`}>
          {feedback.text}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results-list">
          <h3>Search Results ({results.length})</h3>
          <div className="results-grid">
            {results.map((item) => (
              <div key={item.externalProductId} className="search-result-item">
                <div className="result-info">
                  <span className="product-title">{item.name}</span>
                  <span className="product-id">ID: {item.externalProductId}</span>
                </div>
                <button
                  onClick={() => handleTrack(item)}
                  disabled={trackingMap[item.externalProductId]}
                  className="btn btn-secondary btn-sm"
                >
                  {trackingMap[item.externalProductId] ? 'Tracking...' : 'Track Product'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
