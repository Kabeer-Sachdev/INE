const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('vercel.app')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  return 'https://ine-price-tracker-api-cubq.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();

    if (!res.ok || data.success === false) {
      const errorMsg = data?.error?.message || `HTTP error ${res.status}`;
      const errorCode = data?.error?.code || 'API_ERROR';
      const err = new Error(errorMsg);
      err.code = errorCode;
      err.status = res.status;
      throw err;
    }

    return data;
  } catch (err) {
    if (!err.code) err.code = 'NETWORK_ERROR';
    throw err;
  }
}

export const api = {
  // 1. Search products by keyword
  searchProducts: (query) => request(`/api/products/search?q=${encodeURIComponent(query)}`),

  // 2. Track a new product
  trackProduct: (productData) => request('/api/products/track', {
    method: 'POST',
    body: JSON.stringify(productData)
  }),

  // 3. Get all active tracked products
  getTrackedProducts: () => request('/api/products'),

  // 4. Get price/stock history for a product
  getProductHistory: (productId) => request(`/api/products/${productId}/history`),

  // 5. Get scrape logs for a product
  getScrapeLogs: (productId) => request(`/api/products/${productId}/logs`),

  // 6. Manually trigger a scrape run
  manualScrape: (productId) => request(`/api/products/${productId}/scrape`, {
    method: 'POST'
  })
};
