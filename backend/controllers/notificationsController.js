const pool = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseUtils');

const getMyNotifications = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM admin_notifications 
            WHERE account_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [req.user.account_id]);
        
        return sendSuccess(res, 200, 'Notifications retrieved', result.rows);
    } catch (err) {
        console.error('getNotifications error:', err.message);
        return sendError(res, 500, 'Could not retrieve notifications');
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            'UPDATE admin_notifications SET is_read = TRUE WHERE id = $1 AND account_id = $2',
            [id, req.user.account_id]
        );
        return sendSuccess(res, 200, 'Marked as read');
    } catch (err) {
        return sendError(res, 500, 'Could not update notification');
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await pool.query(
            'UPDATE admin_notifications SET is_read = TRUE WHERE account_id = $1',
            [req.user.account_id]
        );
        return sendSuccess(res, 200, 'All marked as read');
    } catch (err) {
        return sendError(res, 500, 'Could not update notifications');
    }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
