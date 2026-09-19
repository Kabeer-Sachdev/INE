import React, { useState, useEffect, useMemo } from 'react';

export function ScrapeLogs({ logs = [], loading, error }) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [logs]);

  // Sort logs: newer scrape sessions first, but within the same scrape session attempts are in order 1 -> 2 -> 3
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      // If logged within 15 seconds of each other (same scrape attempt sequence)
      if (Math.abs(timeA - timeB) < 15000) {
        return a.attemptNumber - b.attemptNumber;
      }
      // Otherwise newer scrape runs first
      return timeB - timeA;
    });
  }, [logs]);

  if (loading) {
    return (
      <div className="card table-card">
        <h3>Scrape Attempt Audit Logs</h3>
        <div className="state-placeholder">Loading scrape logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card table-card">
        <h3>Scrape Attempt Audit Logs</h3>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <span className="status-badge-lg success">✓ Success</span>;
      case 'retrying':
        return <span className="status-badge-lg retrying">⟳ Retrying</span>;
      case 'failed':
        return <span className="status-badge-lg failed">✕ Failed</span>;
      default:
        return <span className="status-badge-lg default">{status}</span>;
    }
  };

  const totalPages = Math.ceil(sortedLogs.length / ITEMS_PER_PAGE) || 1;
  const displayedLogs = sortedLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="card table-card">
      <div className="card-header">
        <h3>Scrape Attempt Audit Logs</h3>
        <span className="badge-count">{logs.length} Attempts</span>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="empty-state">No scrape attempt logs recorded yet.</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Attempt</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Error Message</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="time-cell">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="attempt-cell">#{log.attemptNumber}</td>
                    <td>{getStatusBadge(log.status)}</td>
                    <td>{log.durationMs ? `${log.durationMs}ms` : '-'}</td>
                    <td className="error-cell">{log.errorMessage || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="table-pagination">
              <span>Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedLogs.length)} of {sortedLogs.length}</span>
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
