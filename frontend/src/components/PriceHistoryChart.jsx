import React from 'react';

export function PriceHistoryChart({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="card chart-card">
        <h3>Price Trend Chart</h3>
        <div className="empty-state">No price history available to plot chart.</div>
      </div>
    );
  }

  // Sort history chronologically (oldest to newest) for charting
  const sorted = [...history].sort((a, b) => new Date(a.scrapedAt) - new Date(b.scrapedAt));
  const prices = sorted.map(h => parseFloat(h.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const height = 220;
  const width = 600;
  const padding = 40;

  const points = sorted.map((item, index) => {
    const x = sorted.length === 1
      ? width / 2
      : padding + (index / (sorted.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((parseFloat(item.price) - minPrice) / range) * (height - 2 * padding);
    return { x, y, price: item.price, date: new Date(item.scrapedAt).toLocaleTimeString() };
  });

  const pathD = points.length === 1
    ? `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`
    : points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  return (
    <div className="card chart-card">
      <div className="card-header">
        <h3>Price Trend Chart</h3>
        <span className="chart-meta">Min: ₹{minPrice.toLocaleString('en-IN')} | Max: ₹{maxPrice.toLocaleString('en-IN')}</span>
      </div>

      <div className="chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="4 4" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="4 4" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />

          {/* Trend Line */}
          <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i} className="chart-point-group">
              <circle cx={p.x} cy={p.y} r="5" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
              <text x={p.x} y={p.y - 12} fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="bold">
                ₹{p.price}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
