const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");

const getActivePromotions = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM promotions WHERE is_active = true ORDER BY created_at DESC"
        );
        return sendSuccess(res, 200, "Active promotions retrieved", result.rows);
    } catch (err) {
        console.error("[Promo] getActive error:", err.message);
        return sendError(res, 500, "Failed to retrieve promotions");
    }
};

const getAllPromotions = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM promotions ORDER BY created_at DESC");
        return sendSuccess(res, 200, "All promotions retrieved", result.rows);
    } catch (err) {
        return sendError(res, 500, "Failed to retrieve promotions");
    }
};

const createPromotion = async (req, res) => {
    const { title, description, image_url } = req.body;
    if (!title || !image_url) return sendError(res, 400, "Title and Image URL are required");
    try {
        const result = await pool.query(
            "INSERT INTO promotions (title, description, image_url) VALUES ($1, $2, $3) RETURNING *",
            [title, description, image_url]
        );
        return sendSuccess(res, 201, "Promotion created", result.rows[0]);
    } catch (err) {
        console.error("[Promo] create error:", err.message);
        return sendError(res, 500, "Failed to create promotion");
    }
};

const togglePromotion = async (req, res) => {
    const { id } = req.params;
    try {
        const promo = await pool.query("SELECT is_active FROM promotions WHERE promo_id = $1", [id]);
        if (promo.rows.length === 0) return sendError(res, 404, "Promotion not found");
        
        const newStatus = !promo.rows[0].is_active;
        await pool.query("UPDATE promotions SET is_active = $1 WHERE promo_id = $2", [newStatus, id]);
        
        return sendSuccess(res, 200, "Promotion toggled", { is_active: newStatus });
    } catch (err) {
        return sendError(res, 500, "Failed to toggle promotion");
    }
};

const deletePromotion = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM promotions WHERE promo_id = $1", [id]);
        return sendSuccess(res, 200, "Promotion deleted");
    } catch (err) {
        return sendError(res, 500, "Failed to delete promotion");
    }
};

module.exports = {
    getActivePromotions,
    getAllPromotions,
    createPromotion,
    togglePromotion,
    deletePromotion
};
