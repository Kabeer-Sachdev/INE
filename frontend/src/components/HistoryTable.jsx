import React from 'react';

export function HistoryTable({ history = [], loading, error }) {
  if (loading) {
    return (
      <div className="card table-card">
        <h3>Price & Stock History</h3>
        <div className="state-placeholder">Loading price history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card table-card">
        <h3>Price & Stock History</h3>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div className="card-header">
        <h3>Price & Stock History</h3>
        <span className="badge-count">{history.length} Records</span>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">No scrape history recorded yet for this product.</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Price</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, idx) => (
                <tr key={idx}>
                  <td className="time-cell">{new Date(row.scrapedAt).toLocaleString()}</td>
                  <td className="price-cell">₹{parseFloat(row.price).toLocaleString('en-IN')}</td>
                  <td>
                    <span className="stock-tag">{row.stock}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
