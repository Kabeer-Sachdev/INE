/**
 * Error Classifier Module
 * Categorizes scraping runtime errors into standardized error types for diagnostic logging.
 */
const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  HTTP_ERROR: 'HTTP_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BROWSER_ERROR: 'BROWSER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

function classifyError(err) {
  if (!err) {
    return { type: ERROR_TYPES.UNKNOWN_ERROR, message: 'Unknown error occurred' };
  }

  const message = typeof err === 'string' ? err : (err.message || String(err));
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out') || err.name === 'TimeoutError') {
    return { type: ERROR_TYPES.TIMEOUT, message };
  }
  if (lowerMsg.includes('network') || lowerMsg.includes('net::') || lowerMsg.includes('econnrefused') || lowerMsg.includes('enotfound')) {
    return { type: ERROR_TYPES.NETWORK_ERROR, message };
  }
  if (lowerMsg.includes('validation failed')) {
    return { type: ERROR_TYPES.VALIDATION_ERROR, message };
  }
  if (lowerMsg.includes('parse') || lowerMsg.includes('syntaxerror')) {
    return { type: ERROR_TYPES.PARSE_ERROR, message };
  }
  if (lowerMsg.includes('http') || lowerMsg.includes('status') || lowerMsg.includes('500') || lowerMsg.includes('404')) {
    return { type: ERROR_TYPES.HTTP_ERROR, message };
  }
  if (lowerMsg.includes('browser') || lowerMsg.includes('target closed') || lowerMsg.includes('playwright')) {
    return { type: ERROR_TYPES.BROWSER_ERROR, message };
  }

  return { type: ERROR_TYPES.UNKNOWN_ERROR, message };
}

module.exports = {
  ERROR_TYPES,
  classifyError
};
