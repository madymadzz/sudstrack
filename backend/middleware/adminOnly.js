const { sendError } = require('../utils/responseUtils');
const { ROLES } = require('../config/constants');

/**
 * Middleware: Allow Staff AND SuperAdmin
 */
const adminOnly = (req, res, next) => {
    if (!req.user || (req.user.role !== ROLES.STAFF && req.user.role !== ROLES.SUPER_ADMIN)) {
        return sendError(res, 403, 'Access denied. Staff or Admin only.');
    }
    next();
};

module.exports = { adminOnly };
