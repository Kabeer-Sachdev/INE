import React from 'react';

export function TrackedProducts({ products = [], selectedId, onSelectProduct, loading, error }) {
  if (loading) {
    return (
      <div className="card tracked-card">
        <h2>Tracked Products</h2>
        <div className="state-placeholder">Loading tracked products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card tracked-card">
        <h2>Tracked Products</h2>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="card tracked-card">
      <div className="card-header">
        <h2>Tracked Products</h2>
        <span className="badge-count">{products.length} Items</span>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <p>No tracked products yet.</p>
          <small>Use the search bar above to find and track products from the INE storefront.</small>
        </div>
      ) : (
        <div className="tracked-list">
          {products.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <div
                key={p.id}
                className={`tracked-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectProduct(p)}
              >
                <div className="tracked-item-details">
                  <h4 className="tracked-title">{p.productName}</h4>
                  <div className="tracked-meta">
                    <span className="meta-tag">ID: {p.externalProductId || 'N/A'}</span>
                    <span className="status-active">Active</span>
                  </div>
                </div>
                <button
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProduct(p);
                  }}
                >
                  {isSelected ? 'Viewing' : 'View Details'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
