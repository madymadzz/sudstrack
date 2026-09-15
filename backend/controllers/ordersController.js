const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");
const { generateOrderCode } = require("../utils/orderCodeUtils");
const { generateQRCodeURL } = require("../services/qrService");
const { getDeliveryRoute } = require("../services/mapsService");
const { sendSMS, SMS_TEMPLATES } = require("../services/smsService");
const { LOAD_SIZES, SHOP_COORDINATES } = require("../config/constants");

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
    const {
        package_id,
        pickup_address,
        delivery_address,
        load_size,
        pickup_slot,
        delivery_slot,
        payment_method,
        notes,
        map_lat,
        map_lng
    } = req.body;

    if (!package_id || !pickup_address || !load_size || !pickup_slot || !payment_method) {
        return sendError(res, 400, "Missing required fields: package, pickup address, load size, pickup slot, payment method.");
    }

    if (!LOAD_SIZES[load_size]) {
        return sendError(res, 400, "Invalid load size. Choose Small, Medium, or Large.");
    }

    if (!["Cash", "Online"].includes(payment_method)) {
        return sendError(res, 400, "Payment method must be Cash or Online.");
    }

    // For sandbox: allow caller to explicitly pass payment_status; default is 'Pending'
    const resolvedPaymentStatus = (payment_method === "Online" && req.body.payment_status === "Paid") ? "Paid" : "Pending";

    try {
        // Get package details for pricing
        const pkgResult = await pool.query(
            "SELECT * FROM packages WHERE package_id = $1 AND is_active = TRUE",
            [package_id]
        );
        if (pkgResult.rows.length === 0) {
            return sendError(res, 404, "Selected package not found.");
        }
        const pkg = pkgResult.rows[0];

        // Calculate total
        const basePrice  = LOAD_SIZES[load_size].price;
        const totalPrice = parseFloat(basePrice) + parseFloat(pkg.price);

        // Generate unique order code (retry if collision)
        let orderCode, orderResult;
        let attempts = 0;
        do {
            orderCode = generateOrderCode();
            const existing = await pool.query("SELECT order_id FROM orders WHERE order_code = $1", [orderCode]);
            if (existing.rows.length === 0) break;
            attempts++;
        } while (attempts < 5);

        // Insert order
        orderResult = await pool.query(
            `INSERT INTO orders
             (order_code, account_id, package_id, pickup_address, delivery_address,
              load_size, pickup_slot, delivery_slot, status, notes, map_lat, map_lng, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Received',$9,$10,$11,NOW())
             RETURNING *`,
            [
                orderCode,
                req.user.account_id,
                package_id,
                pickup_address,
                delivery_address || pickup_address,
                load_size,
                pickup_slot,
                delivery_slot || null,
                notes || null,
                map_lat || null,
                map_lng || null
            ]
        );
        const order = orderResult.rows[0];

        // Insert payment record with resolved status
        await pool.query(
            `INSERT INTO payments (order_id, payment_method, amount, payment_status)
             VALUES ($1, $2, $3, $4)`,
            [order.order_id, payment_method, totalPrice, resolvedPaymentStatus]
        );

        // Generate QR code URL
        const qrURL = await generateQRCodeURL(orderCode);

        // Insert tracking record
        await pool.query(
            `INSERT INTO order_tracking (order_id, claim_qr_code, delivery_status, updated_at)
             VALUES ($1, $2, 'Received', NOW())`,
            [order.order_id, qrURL]
        );

        // Send SMS confirmation (stub until Sep 15)
        if (req.user.contact_number) {
            await sendSMS(req.user.contact_number, SMS_TEMPLATES.orderConfirmed(orderCode));
        }

        // Auto-assign a rider
        const { assignRiderToOrder } = require('./ridersController');
        await assignRiderToOrder(order.order_id);

        // Re-fetch order to get updated status and rider
        const updatedOrder = await pool.query(
            `SELECT o.*, r.name as rider_name, r.phone as rider_phone, r.vehicle as rider_vehicle
             FROM orders o LEFT JOIN riders r ON o.rider_id = r.rider_id
             WHERE o.order_id = $1`, [order.order_id]
        );
        const finalOrder = updatedOrder.rows[0] || order;

        return sendSuccess(res, 201, "Order created successfully.", {
            order_id:        finalOrder.order_id,
            order_code:      finalOrder.order_code,
            status:          finalOrder.status,
            package_name:    pkg.package_name,
            load_size,
            total_price:     totalPrice,
            payment_method,
            pickup_slot:     finalOrder.pickup_slot,
            delivery_slot:   finalOrder.delivery_slot,
            qr_code_url:     qrURL,
            created_at:      finalOrder.created_at,
            rider_name:      finalOrder.rider_name || null,
            rider_phone:     finalOrder.rider_phone || null,
            rider_vehicle:   finalOrder.rider_vehicle || null
        });

    } catch (err) {
        console.error("[Orders] createOrder error:", err.message);
        return sendError(res, 500, "Could not create order. Please try again.");
    }
};

// ─── GET MY ORDERS ────────────────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT o.*, p.package_name, p.price as package_price,
                    py.payment_method, py.amount, py.payment_status,
                    ot.claim_qr_code, ot.delivery_status,
                    r.name as rider_name, r.phone as rider_phone, r.vehicle as rider_vehicle,
                    EXISTS(SELECT 1 FROM saved_orders s WHERE s.order_id = o.order_id AND s.account_id = $1) as is_starred
             FROM orders o
             JOIN packages p       ON o.package_id = p.package_id
             LEFT JOIN payments py  ON py.order_id = o.order_id
             LEFT JOIN order_tracking ot ON ot.order_id = o.order_id
             LEFT JOIN riders r     ON r.rider_id = o.rider_id
             WHERE o.account_id = $1
             ORDER BY o.created_at DESC`,
            [req.user.account_id]
        );
        return sendSuccess(res, 200, "Orders retrieved.", result.rows);
    } catch (err) {
        console.error("[Orders] getMyOrders error:", err.message);
        return sendError(res, 500, "Could not retrieve orders.");
    }
};

// ─── GET SAVED ORDERS ─────────────────────────────────────────────────────────
const getSavedOrders = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT o.*, p.package_name,
                    py.payment_method, py.amount, py.payment_status,
                    ot.claim_qr_code, ot.delivery_status,
                    so.starred_at
             FROM saved_orders so
             JOIN orders o          ON o.order_id = so.order_id
             JOIN packages p        ON o.package_id = p.package_id
             LEFT JOIN payments py  ON py.order_id = o.order_id
             LEFT JOIN order_tracking ot ON ot.order_id = o.order_id
             WHERE so.account_id = $1
             ORDER BY so.starred_at DESC`,
            [req.user.account_id]
        );
        return sendSuccess(res, 200, "Saved orders retrieved.", result.rows);
    } catch (err) {
        console.error("[Orders] getSavedOrders error:", err.message);
        return sendError(res, 500, "Could not retrieve saved orders.");
    }
};

// ─── SAVE ORDER (star) ────────────────────────────────────────────────────────
const saveOrder = async (req, res) => {
    const { id } = req.params;
    try {
        // Verify order belongs to this user
        const order = await pool.query(
            "SELECT order_id FROM orders WHERE order_id = $1 AND account_id = $2",
            [id, req.user.account_id]
        );
        if (order.rows.length === 0) return sendError(res, 404, "Order not found.");

        await pool.query(
            `INSERT INTO saved_orders (account_id, order_id, starred_at)
             VALUES ($1, $2, NOW()) ON CONFLICT (account_id, order_id) DO NOTHING`,
            [req.user.account_id, id]
        );
        return sendSuccess(res, 200, "Order saved.");
    } catch (err) {
        return sendError(res, 500, "Could not save order.");
    }
};

// ─── UNSAVE ORDER ─────────────────────────────────────────────────────────────
const unsaveOrder = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            "DELETE FROM saved_orders WHERE account_id = $1 AND order_id = $2",
            [req.user.account_id, id]
        );
        return sendSuccess(res, 200, "Order removed from saved.");
    } catch (err) {
        return sendError(res, 500, "Could not remove saved order.");
    }
};

// ─── GET QR CODE ──────────────────────────────────────────────────────────────
const getOrderQR = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT ot.claim_qr_code, o.order_code, o.status
             FROM order_tracking ot
             JOIN orders o ON o.order_id = ot.order_id
             WHERE ot.order_id = $1 AND o.account_id = $2`,
            [id, req.user.account_id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Order not found.");

        const row = result.rows[0];
        // Regenerate if QR is missing
        let qrURL = row.claim_qr_code;
        if (!qrURL) {
            qrURL = await generateQRCodeURL(row.order_code);
            await pool.query(
                "UPDATE order_tracking SET claim_qr_code = $1 WHERE order_id = $2",
                [qrURL, id]
            );
        }
        return sendSuccess(res, 200, "QR code retrieved.", {
            order_code: row.order_code,
            status:     row.status,
            qr_code_url: qrURL
        });
    } catch (err) {
        return sendError(res, 500, "Could not retrieve QR code.");
    }
};

// ─── GET ORDER TRACKING (Google Maps) ────────────────────────────────────────
const getOrderTracking = async (req, res) => {
    const { id } = req.params;
    try {
        const isAdmin = ["Admin", "SuperAdmin", "Staff"].includes(req.user.role);
        
        let query = `
            SELECT o.order_id, o.order_code, o.status, o.delivery_address, o.pickup_address,
                   o.pickup_slot, o.delivery_slot, o.map_lat, o.map_lng,
                   COALESCE(r.name, ot.rider_name) AS rider_name, r.vehicle,
                   ot.delivery_status
            FROM orders o
            LEFT JOIN riders r ON o.rider_id = r.rider_id
            LEFT JOIN order_tracking ot ON ot.order_id = o.order_id
            WHERE o.order_id = $1
        `;
        let params = [id];
        
        if (!isAdmin) {
            query += " AND o.account_id = $2";
            params.push(req.user.account_id);
        }

        console.log("isAdmin:", isAdmin, "role:", req.user.role);
        console.log("query:", query);
        console.log("params:", params);
        const result = await pool.query(query, params);
        console.log("result rows:", result.rows.length);
        if (result.rows.length === 0) return sendError(res, 404, "Order not found or access denied.");

        const order = result.rows[0];
        let mapData = null;

        // Fetch map data for the appropriate destination
        const destination = (order.status === "Received" || order.status === "Waiting for Rider") ? order.pickup_address : order.delivery_address;
        
        if (destination && !["Completed", "Cancelled"].includes(order.status)) {
            mapData = await getDeliveryRoute(destination, order.map_lat, order.map_lng);
        }

        return sendSuccess(res, 200, "Tracking data retrieved.", {
            order_id:        order.order_id,
            order_code:      order.order_code,
            status:          order.status,
            delivery_status: order.delivery_status,
            rider_name:      order.rider_name,
            rider_vehicle:   order.vehicle,
            pickup_slot:     order.pickup_slot,
            delivery_slot:   order.delivery_slot,
            shop_coords:     SHOP_COORDINATES,
            maps_api_key:    process.env.GOOGLE_MAPS_API_KEY,
            map_data:        mapData
        });
    } catch (err) {
        console.error("[Orders] getOrderTracking error:", err.message);
        return sendError(res, 500, "Could not retrieve tracking data.");
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getSavedOrders,
    saveOrder,
    unsaveOrder,
    getOrderQR,
    getOrderTracking
};
