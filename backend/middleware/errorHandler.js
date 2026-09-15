const { sendError } = require('../utils/responseUtils');

/**
 * Global error handler — catches anything that falls through
 * Must be registered LAST in server.js (after all routes)
 */
const errorHandler = (err, req, res, next) => {
    console.error('🔥 Unhandled error:', err);

    // PostgreSQL unique violation (e.g. duplicate email)
    if (err.code === '23505') {
        return sendError(res, 409, 'A record with that value already exists.');
    }

    // PostgreSQL foreign key violation
    if (err.code === '23503') {
        return sendError(res, 400, 'Invalid reference — related record not found.');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, 401, 'Invalid token.');
    }

    if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Token expired. Please log in again.');
    }

    // Default: 500 Internal Server Error
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Something went wrong on our end.'
        : err.message || 'Internal Server Error';

    return sendError(res, statusCode, message);
};

module.exports = { errorHandler };
