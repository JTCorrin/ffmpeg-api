const crypto = require('crypto');
const logger = require('../utils/logger.js');
const constants = require('../constants.js');

/**
 * API Key authentication middleware
 * When API_KEY env var is set, requires valid X-API-Key header
 * When API_KEY is not set, allows all requests (backward compatibility)
 */
function apiKeyAuth(req, res, next) {
    const configuredApiKey = constants.apiKey;

    // If no API key configured, skip authentication (backward compatibility)
    if (!configuredApiKey) {
        return next();
    }

    const providedApiKey = req.headers['x-api-key'];

    if (!providedApiKey) {
        logger.warn(`Unauthorized request: missing X-API-Key header from ${req.ip}`);
        res.writeHead(401, { 'content-type': 'text/plain' });
        return res.end('Unauthorized: X-API-Key header required\n');
    }

    // Timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedApiKey);
    const configuredBuffer = Buffer.from(configuredApiKey);
    const isValidLength = providedBuffer.length === configuredBuffer.length;
    const isValidKey = isValidLength && crypto.timingSafeEqual(providedBuffer, configuredBuffer);

    if (!isValidKey) {
        logger.warn(`Unauthorized request: invalid X-API-Key from ${req.ip}`);
        res.writeHead(401, { 'content-type': 'text/plain' });
        return res.end('Unauthorized: Invalid API key\n');
    }

    next();
}

module.exports = apiKeyAuth;
