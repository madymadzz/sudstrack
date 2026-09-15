const { sendError } = require('../utils/responseUtils');
const { ROLES } = require('../config/constants');

/**
 * Middleware: Allow SuperAdmin ONLY
 */
const superAdminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== ROLES.SUPER_ADMIN) {
        return sendError(res, 403, 'Access denied. Super Admin only.');
    }
    next();
};

module.exports = { superAdminOnly };
