const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");

const getSettings = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM platform_settings");
        const settings = {};
        result.rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        return sendSuccess(res, 200, "Settings retrieved", settings);
    } catch (err) {
        console.error("[Settings] get error:", err.message);
        return sendError(res, 500, "Failed to retrieve settings");
    }
};

const updateSettings = async (req, res) => {
    const updates = req.body; 
    const keys = Object.keys(updates);
    
    if (keys.length === 0) return sendError(res, 400, "No settings provided to update.");
    
    try {
        await pool.query("BEGIN");
        for (const key of keys) {
            await pool.query(
                "INSERT INTO platform_settings (setting_key, setting_value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()",
                [key, String(updates[key])]
            );
        }
        await pool.query("COMMIT");
        
        const { logAdminAction } = require('../services/auditService');
        await logAdminAction(req.user.account_id, "Update Settings", "Updated platform settings");
        
        return sendSuccess(res, 200, "Settings updated successfully.");
    } catch (err) {
        await pool.query("ROLLBACK");
        console.error("[Settings] update error:", err.message);
        return sendError(res, 500, "Failed to update settings");
    }
};

module.exports = { getSettings, updateSettings };
