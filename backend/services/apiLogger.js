const pool = require("../config/db");

/**
 * Log an API event (success or failure) to the api_logs table
 * Safe to call even if DB is unavailable - will just console.log
 */
const logAPIEvent = async ({
    api_name,
    endpoint,
    error_type,
    error_message,
    retry_count,
    recovered,
    severity
}) => {
    try {
        await pool.query(
            `INSERT INTO api_logs
             (api_name, endpoint, error_type, error_message, retry_count, recovered, severity, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [api_name, endpoint, error_type, error_message, retry_count, recovered, severity]
        );
    } catch (err) {
        // Never crash the app because of a logging failure
        console.error("[APILogger] Failed to log event:", err.message);
        console.log(`[APILogger] api=${api_name} endpoint=${endpoint} error=${error_message} recovered=${recovered}`);
    }
};

module.exports = { logAPIEvent };
