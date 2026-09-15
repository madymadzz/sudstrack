const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");

// ─── GET ALL RIDERS ─────────────────────────────────────────────────────────
const getAllRiders = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   (SELECT o.order_code FROM orders o WHERE o.rider_id = r.rider_id AND o.status NOT IN ('Completed','Cancelled') LIMIT 1) AS current_order
            FROM riders r 
            ORDER BY r.rider_id ASC
        `);
        return sendSuccess(res, 200, "Riders retrieved.", result.rows);
    } catch (err) {
        console.error("[Riders] getAllRiders error:", err.message);
        return sendError(res, 500, "Could not retrieve riders.");
    }
};

// ─── CREATE RIDER ───────────────────────────────────────────────────────────
const createRider = async (req, res) => {
    const { name, phone, vehicle } = req.body;
    if (!name) return sendError(res, 400, "Rider name is required.");

    try {
        const result = await pool.query(
            `INSERT INTO riders (name, phone, vehicle) VALUES ($1, $2, $3) RETURNING *`,
            [name, phone || null, vehicle || null]
        );
        return sendSuccess(res, 201, "Rider created.", result.rows[0]);
    } catch (err) {
        console.error("[Riders] createRider error:", err.message);
        return sendError(res, 500, "Could not create rider.");
    }
};

// ─── UPDATE RIDER ───────────────────────────────────────────────────────────
const updateRider = async (req, res) => {
    const { id } = req.params;
    const { name, phone, vehicle, status } = req.body;

    try {
        const result = await pool.query(
            `UPDATE riders SET 
                name = COALESCE($1, name),
                phone = COALESCE($2, phone),
                vehicle = COALESCE($3, vehicle),
                status = COALESCE($4, status)
             WHERE rider_id = $5 RETURNING *`,
            [name, phone, vehicle, status, id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Rider not found.");
        return sendSuccess(res, 200, "Rider updated.", result.rows[0]);
    } catch (err) {
        console.error("[Riders] updateRider error:", err.message);
        return sendError(res, 500, "Could not update rider.");
    }
};

// ─── DELETE RIDER ───────────────────────────────────────────────────────────
const deleteRider = async (req, res) => {
    const { id } = req.params;
    try {
        // Unassign from orders first
        await pool.query("UPDATE orders SET rider_id = NULL WHERE rider_id = $1", [id]);
        await pool.query("DELETE FROM riders WHERE rider_id = $1", [id]);
        return sendSuccess(res, 200, "Rider deleted.");
    } catch (err) {
        console.error("[Riders] deleteRider error:", err.message);
        return sendError(res, 500, "Could not delete rider.");
    }
};

// ─── AUTO-ASSIGN RIDER TO ORDER ─────────────────────────────────────────────
// Called internally after order creation
const assignRiderToOrder = async (orderId) => {
    try {
        // Find first available rider
        const riderResult = await pool.query(
            `SELECT rider_id FROM riders WHERE status = 'Available' ORDER BY rider_id ASC LIMIT 1`
        );

        if (riderResult.rows.length === 0) {
            // No rider available — mark order as "Waiting for Rider"
            await pool.query(
                `UPDATE orders SET status = 'Waiting for Rider' WHERE order_id = $1`,
                [orderId]
            );
            await pool.query(
                `UPDATE order_tracking SET delivery_status = 'Waiting for Rider', updated_at = NOW() WHERE order_id = $1`,
                [orderId]
            );
            console.log(`[Riders] No available rider — Order #${orderId} set to Waiting for Rider`);
            return null;
        }

        const rider = riderResult.rows[0];

        // Assign rider to order + mark rider as Occupied
        await pool.query(
            `UPDATE orders SET rider_id = $1 WHERE order_id = $2`,
            [rider.rider_id, orderId]
        );
        await pool.query(
            `UPDATE riders SET status = 'Occupied' WHERE rider_id = $1`,
            [rider.rider_id]
        );

        console.log(`[Riders] Rider #${rider.rider_id} assigned to Order #${orderId}`);
        return rider.rider_id;
    } catch (err) {
        console.error("[Riders] assignRiderToOrder error:", err.message);
        return null;
    }
};

// ─── FREE RIDER & ASSIGN TO NEXT WAITING ORDER ─────────────────────────────
// Called internally when an order is marked Completed/Cancelled
const freeRiderAndAssignNext = async (riderId) => {
    try {
        if (!riderId) return;

        // Find next "Waiting for Rider" order (oldest first)
        const nextOrder = await pool.query(
            `SELECT order_id FROM orders WHERE status = 'Waiting for Rider' ORDER BY created_at ASC LIMIT 1`
        );

        if (nextOrder.rows.length === 0) {
            // No orders waiting — mark rider as Available
            await pool.query(`UPDATE riders SET status = 'Available' WHERE rider_id = $1`, [riderId]);
            console.log(`[Riders] Rider #${riderId} is now Available (no orders waiting)`);
            return;
        }

        const waitingOrderId = nextOrder.rows[0].order_id;

        // Assign rider to waiting order (keep rider Occupied)
        await pool.query(
            `UPDATE orders SET rider_id = $1, status = 'Received' WHERE order_id = $2`,
            [riderId, waitingOrderId]
        );
        await pool.query(
            `UPDATE order_tracking SET delivery_status = 'Received', updated_at = NOW() WHERE order_id = $1`,
            [waitingOrderId]
        );
        console.log(`[Riders] Rider #${riderId} re-assigned to waiting Order #${waitingOrderId}`);
    } catch (err) {
        console.error("[Riders] freeRiderAndAssignNext error:", err.message);
    }
};

module.exports = {
    getAllRiders,
    createRider,
    updateRider,
    deleteRider,
    assignRiderToOrder,
    freeRiderAndAssignNext
};
