/**
 * Scheduler Authentication Middleware
 * Protects the scheduler endpoint using a secret token passed in the Authorization header.
 * Header format: Authorization: Bearer <SCHEDULER_SECRET>
 */
function schedulerAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const configuredSecret = process.env.SCHEDULER_SECRET;

  if (!configuredSecret || configuredSecret.trim() === '') {
    console.error('[SCHEDULER AUTH ERROR] SCHEDULER_SECRET is not configured on the server.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: SCHEDULER_SECRET is missing.'
    });
  }

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing Authorization header.'
    });
  }

  // Extract Bearer token or direct token
  const parts = authHeader.split(' ');
  const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : authHeader;

  if (token !== configuredSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid scheduler secret.'
    });
  }

  next();
}

module.exports = schedulerAuth;
