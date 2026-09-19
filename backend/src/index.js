const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productRoutes = require('./routes/productRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const productService = require('./services/productService');

const app = express();
const PORT = process.env.PORT || 5000;

// Production startup environment check
function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production';
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SCHEDULER_SECRET'];
  const missing = requiredVars.filter(v => !process.env[v] || process.env[v].includes('your-'));

  if (isProd && missing.length > 0) {
    console.error(`[FATAL] Missing required production environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
validateEnvironment();

// Configure CORS to support local development and deployed Vercel production origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://ine-gules.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (like curl, scheduler requests, or same-origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Parse incoming JSON payloads
app.use(express.json());

// Mount Phase 6 Product REST API routes
app.use('/api/products', productRoutes);

// Mount Phase 8 Scheduler REST API routes
app.use('/api/scheduler', schedulerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'INE Product Price Tracker Backend API is running!',
    endpoints: {
      health: 'GET /api/health',
      testDb: 'GET /api/test-db',
      searchProducts: 'GET /api/products/search?q=query',
      trackedProducts: 'GET /api/products',
      trackProduct: 'POST /api/products/track',
      productHistory: 'GET /api/products/:id/history',
      productLogs: 'GET /api/products/:id/logs',
      manualScrape: 'POST /api/products/:id/scrape',
      schedulerScrape: 'POST /api/scheduler/scrape'
    }
  });
});

// Health check endpoint (Phase 1)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running'
  });
});

// Development test endpoint (Phase 2)
app.get('/api/test-db', async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const isPlaceholder = !supabaseUrl || supabaseUrl.includes('your-project');

  try {
    if (isPlaceholder) {
      return res.json({
        status: 'configured',
        supabaseConnected: false,
        message: 'Supabase service layer initialized with validation guards.'
      });
    }

    const products = await productService.getTrackedProducts();
    res.json({
      status: 'ok',
      supabaseConnected: true,
      message: 'Successfully connected to Supabase PostgreSQL!',
      trackedProductsCount: products.length
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      supabaseConnected: false,
      message: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
