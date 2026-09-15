const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");

// POST /api/feedback
const submitFeedback = async (req, res) => {
    const { order_id, rating, comment } = req.body;

    if (!order_id || !rating) {
        return sendError(res, 400, "order_id and rating are required.");
    }
    if (rating < 1 || rating > 5) {
        return sendError(res, 400, "Rating must be between 1 and 5.");
    }

    try {
        // Verify order belongs to user and is completed
        const order = await pool.query(
            "SELECT order_id, status FROM orders WHERE order_id = $1 AND account_id = $2",
            [order_id, req.user.account_id]
        );
        if (order.rows.length === 0) {
            return sendError(res, 404, "Order not found.");
        }
        if (order.rows[0].status !== "Completed") {
            return sendError(res, 400, "Feedback can only be submitted for completed orders.");
        }

        // Check if feedback already submitted
        const existing = await pool.query(
            "SELECT feedback_id FROM feedback WHERE order_id = $1 AND account_id = $2",
            [order_id, req.user.account_id]
        );
        if (existing.rows.length > 0) {
            return sendError(res, 409, "Feedback already submitted for this order.");
        }

        const result = await pool.query(
            `INSERT INTO feedback (order_id, account_id, rating, comment, submitted_at)
             VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
            [order_id, req.user.account_id, rating, comment || null]
        );

        return sendSuccess(res, 201, "Feedback submitted. Thank you!", result.rows[0]);
    } catch (err) {
        console.error("[Feedback] submitFeedback error:", err.message);
        return sendError(res, 500, "Could not submit feedback.");
    }
};

// GET /api/feedback/all — Admin/Staff only
const getAllFeedback = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                f.feedback_id,
                f.rating,
                f.comment,
                f.submitted_at,
                a.full_name AS customer_name,
                o.order_code
            FROM feedback f
            JOIN accounts a ON f.account_id = a.account_id
            JOIN orders o ON f.order_id = o.order_id
            ORDER BY f.submitted_at DESC
        `);
        return sendSuccess(res, 200, "Feedback retrieved.", result.rows);
    } catch (err) {
        console.error("[Feedback] getAllFeedback error:", err.message);
        return sendError(res, 500, "Could not retrieve feedback.");
    }
};

module.exports = { submitFeedback, getAllFeedback };
