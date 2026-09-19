import React from 'react';

export function Navbar({ activeCount = 0 }) {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="logo-icon">📈</span>
        <h1>INE Product Price Tracker</h1>
      </div>
      <div className="navbar-status">
        <span className="status-badge">
          <span className="pulse-dot"></span>
          Tracking {activeCount} {activeCount === 1 ? 'Product' : 'Products'}
        </span>
      </div>
    </header>
  );
}
