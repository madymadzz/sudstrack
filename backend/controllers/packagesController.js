const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");

// GET /api/packages — list all active packages
const getAllPackages = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM packages WHERE is_active = TRUE ORDER BY package_id"
        );
        return sendSuccess(res, 200, "Packages retrieved.", result.rows);
    } catch (err) {
        console.error("[Packages] getAllPackages error:", err.message);
        return sendError(res, 500, "Could not retrieve packages.");
    }
};

// GET /api/packages/:id — get single package
const getPackageById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM packages WHERE package_id = $1 AND is_active = TRUE",
            [id]
        );
        if (result.rows.length === 0) {
            return sendError(res, 404, "Package not found.");
        }
        return sendSuccess(res, 200, "Package retrieved.", result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not retrieve package.");
    }
};

module.exports = { getAllPackages, getPackageById };
