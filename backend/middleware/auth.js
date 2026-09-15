const { verifyToken } = require('../utils/tokenUtils');
const { sendError } = require('../utils/responseUtils');
const pool = require('../config/db');

/**
 * Middleware: Verify JWT from httpOnly cookie
 * Attaches the full account record to req.user
 */
const protect = async (req, res, next) => {
    try {
        const token = req.cookies?.sudstrack_token;

        if (!token) {
            return sendError(res, 401, 'Not authenticated. Please log in.');
        }

        // Verify the token
        const decoded = verifyToken(token);

        // Fetch the account from DB to ensure it still exists
        const result = await pool.query(
            'SELECT account_id, full_name, email, role, contact_number, address, auth_provider, two_factor_enabled, is_active, profile_picture FROM accounts WHERE account_id = $1',
            [decoded.accountId]
        );

        if (result.rows.length === 0) {
            return sendError(res, 401, 'Account no longer exists.');
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return sendError(res, 401, 'Session expired. Please log in again.');
        }
        return sendError(res, 401, 'Invalid session. Please log in again.');
    }
};

/**
 * Middleware: Require specific roles (e.g., Admin, Staff)
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return sendError(res, 403, 'Forbidden: insufficient permissions.');
    }
    next();
};

module.exports = { protect, requireRole };
