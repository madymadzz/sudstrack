const pool = require("../config/db");

const logAdminAction = async (adminId, action, details) => {
    try {
        await pool.query(
            "INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, $2, $3)",
            [adminId, action, details]
        );
    } catch (err) {
        console.error("[Audit] Failed to log action:", err.message);
    }
};

module.exports = { logAdminAction };
