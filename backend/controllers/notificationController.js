const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");

const getNotifications = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notifications WHERE account_id = $1 ORDER BY created_at DESC LIMIT 50",
            [req.user.account_id]
        );
        return sendSuccess(res, 200, "Notifications retrieved", result.rows);
    } catch (err) {
        console.error("[Notifications] get error:", err.message);
        return sendError(res, 500, "Failed to retrieve notifications");
    }
};

const markAsRead = async (req, res) => {
    try {
        await pool.query(
            "UPDATE notifications SET is_read = true WHERE account_id = $1",
            [req.user.account_id]
        );
        return sendSuccess(res, 200, "Notifications marked as read");
    } catch (err) {
        console.error("[Notifications] mark error:", err.message);
        return sendError(res, 500, "Failed to mark notifications");
    }
};

const createNotification = async (accountId, title, message) => {
    try {
        await pool.query(
            "INSERT INTO notifications (account_id, title, message) VALUES ($1, $2, $3)",
            [accountId, title, message]
        );
    } catch (err) {
        console.error("[Notifications] create error:", err.message);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    createNotification
};
