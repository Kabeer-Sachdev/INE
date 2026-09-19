const express = require('express');
const router = express.Router();
const schedulerAuth = require('../middleware/schedulerAuth');
const schedulerController = require('../controllers/schedulerController');

// POST /api/scheduler/scrape - Protected scheduled scraping trigger
router.post('/scrape', schedulerAuth, schedulerController.triggerScheduledScrape);

module.exports = router;
