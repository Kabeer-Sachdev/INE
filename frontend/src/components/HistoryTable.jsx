import React, { useState, useEffect } from 'react';

export function HistoryTable({ history = [], loading, error }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [history]);

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

  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE) || 1;
  const displayedHistory = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="card table-card">
      <div className="card-header">
        <h3>Price & Stock History</h3>
        <span className="badge-count">{history.length} Records</span>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">No scrape history recorded yet for this product.</div>
      ) : (
        <>
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
                {displayedHistory.map((row, idx) => (
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

          {totalPages > 1 && (
            <div className="table-pagination">
              <span>Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, history.length)} of {history.length}</span>
              <div className="pagination-btn-group">
                <button
                  className="btn btn-sm btn-outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  ← Prev
                </button>
                <span className="page-indicator">Page {currentPage} of {totalPages}</span>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
