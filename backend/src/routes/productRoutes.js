const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// 1. GET /api/products/search?q=<query>
router.get('/search', productController.searchProducts);

// 2. POST /api/products/track
router.post('/track', productController.trackProduct);

// 3. GET /api/products
router.get('/', productController.getTrackedProducts);

// 4. GET /api/products/:id/history
router.get('/:id/history', productController.getProductHistory);

// 5. GET /api/products/:id/logs
router.get('/:id/logs', productController.getScrapeLogs);

// 6. POST /api/products/:id/scrape
router.post('/:id/scrape', productController.manualScrape);

module.exports = router;
