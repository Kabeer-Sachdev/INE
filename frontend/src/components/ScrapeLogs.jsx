import React from 'react';

export function ScrapeLogs({ logs = [], loading, error }) {
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

  return (
    <div className="card table-card">
      <div className="card-header">
        <h3>Scrape Attempt Audit Logs</h3>
        <span className="badge-count">{logs.length} Attempts</span>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">No scrape attempt logs recorded yet.</div>
      ) : (
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
              {logs.map((log, idx) => (
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
      )}
    </div>
  );
}
