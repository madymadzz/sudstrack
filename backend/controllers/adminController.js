const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");
const { hashPassword } = require("../utils/passwordUtils");
const { sendSMS, SMS_TEMPLATES } = require("../services/smsService");
const { ROLES, ORDER_STATUSES } = require("../config/constants");

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split("T")[0];

        const [dailyOrders, totalRevenue, completed, pending, totalCustomers] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = $1", [today]),
            pool.query("SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE payment_status = 'Paid'"),
            pool.query("SELECT COUNT(*) FROM orders WHERE status = 'Completed'"),
            pool.query("SELECT COUNT(*) FROM orders WHERE status NOT IN ('Completed','Cancelled')"),
            pool.query("SELECT COUNT(*) FROM accounts WHERE role = 'Customer'")
        ]);

        return sendSuccess(res, 200, "Stats retrieved.", {
            daily_orders:    parseInt(dailyOrders.rows[0].count),
            total_revenue:   parseFloat(totalRevenue.rows[0].total),
            completed_orders: parseInt(completed.rows[0].count),
            pending_orders:  parseInt(pending.rows[0].count),
            total_customers: parseInt(totalCustomers.rows[0].count)
        });
    } catch (err) {
        console.error("[Admin] getDashboardStats error:", err.message);
        return sendError(res, 500, "Could not retrieve stats.");
    }
};

// ─── GET ALL ORDERS ───────────────────────────────────────────────────────────
const getAllOrders = async (req, res) => {
    const { search, status, limit = 50, offset = 0 } = req.query;
    try {
        let query = `
            SELECT o.*, a.full_name, a.email, a.contact_number,
                   p.package_name, py.payment_method, py.amount, py.payment_status,
                   ot.claim_qr_code, ot.delivery_status,
                   COALESCE(r.name, ot.rider_name) as rider_name, r.phone as rider_phone, r.vehicle as rider_vehicle, r.rider_id
            FROM orders o
            JOIN accounts a        ON a.account_id = o.account_id
            JOIN packages p        ON p.package_id = o.package_id
            LEFT JOIN payments py  ON py.order_id = o.order_id
            LEFT JOIN order_tracking ot ON ot.order_id = o.order_id
            LEFT JOIN riders r     ON r.rider_id = o.rider_id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (search) {
            query += ` AND (o.order_code ILIKE $${idx} OR a.full_name ILIKE $${idx} OR a.contact_number ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        if (status) {
            query += ` AND o.status = $${idx}`;
            params.push(status);
            idx++;
        }

        query += ` ORDER BY o.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        return sendSuccess(res, 200, "Orders retrieved.", result.rows);
    } catch (err) {
        console.error("[Admin] getAllOrders error:", err.message);
        return sendError(res, 500, "Could not retrieve orders.");
    }
};

// ─── UPDATE ORDER STATUS ──────────────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status, rider_name } = req.body;

    if (!status || !ORDER_STATUSES.includes(status)) {
        return sendError(res, 400, `Invalid status. Valid: ${ORDER_STATUSES.join(", ")}`);
    }

    try {
        const orderResult = await pool.query(
            `SELECT o.*, a.contact_number FROM orders o
             JOIN accounts a ON a.account_id = o.account_id
             WHERE o.order_id = $1`,
            [id]
        );
        if (orderResult.rows.length === 0) return sendError(res, 404, "Order not found.");

        const order = orderResult.rows[0];

        // Update order status
        await pool.query(
            "UPDATE orders SET status = $1 WHERE order_id = $2",
            [status, id]
        );

        // Update tracking record
        await pool.query(
            `UPDATE order_tracking SET delivery_status = $1, rider_name = $2, updated_at = NOW()
             WHERE order_id = $3`,
            [status, rider_name || order.rider_name, id]
        );

        // Mark payment as Paid when completed (Cash orders)
        if (status === "Completed") {
            await pool.query(
                "UPDATE payments SET payment_status = 'Paid', paid_at = NOW() WHERE order_id = $1 AND payment_method = 'Cash'",
                [id]
            );
            // Free rider and auto-assign to next waiting order
            if (order.rider_id) {
                const { freeRiderAndAssignNext } = require('./ridersController');
                await freeRiderAndAssignNext(order.rider_id);
            }
        }

        if (status === "Cancelled" && order.rider_id) {
            const { freeRiderAndAssignNext } = require('./ridersController');
            await freeRiderAndAssignNext(order.rider_id);
        }

        // Send SMS notification
        if (order.contact_number) {
            const smsMsg = status === "Completed"
                ? SMS_TEMPLATES.completed(order.order_code)
                : status === "Out for Delivery"
                ? SMS_TEMPLATES.outForDelivery(order.order_code)
                : SMS_TEMPLATES.statusUpdate(order.order_code, status);
            await sendSMS(order.contact_number, smsMsg);
        }

        // In-app Notification
        const { createNotification } = require('./notificationController');
        let notifMsg = `Your order #${order.order_code} is now ${status}.`;
        if (status === "Ready for Delivery") notifMsg = `Your order #${order.order_code} is ready and waiting to be dispatched.`;
        if (status === "Out for Delivery") notifMsg = `Your rider is on the way with your laundry for order #${order.order_code}!`;
        if (status === "Completed") notifMsg = `Your order #${order.order_code} is complete. Thanks for using SudsTrack!`;
        if (status === "Cancelled") notifMsg = `Your order #${order.order_code} has been cancelled.`;
        await createNotification(order.account_id, "Order Update", notifMsg);
        // Audit Log
        const { logAdminAction } = require('../services/auditService');
        await logAdminAction(req.user.account_id, "Update Order Status", `Order #${order.order_code} status set to ${status}`);

        return sendSuccess(res, 200, `Order status updated to "${status}".`, { order_id: id, status });
    } catch (err) {
        console.error("[Admin] updateOrderStatus error:", err.message);
        return sendError(res, 500, "Could not update order status.");
    }
};

// ─── CANCEL ORDER ─────────────────────────────────────────────────────────────
const cancelOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE orders SET status = 'Cancelled' WHERE order_id = $1 AND status NOT IN ('Completed','Cancelled') RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return sendError(res, 400, "Order cannot be cancelled (already completed or cancelled).");
        }
        
        const { logAdminAction } = require('../services/auditService');
        await logAdminAction(req.user.account_id, "Cancel Order", `Cancelled order #${result.rows[0].order_code}`);
        
        return sendSuccess(res, 200, "Order cancelled.", result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not cancel order.");
    }
};

// ─── GET ALL CUSTOMERS ────────────────────────────────────────────────────────
const getAllCustomers = async (req, res) => {
    const { search } = req.query;
    try {
        let query = `
            SELECT a.account_id, a.full_name, a.email, a.contact_number, a.profile_picture,
                   a.address, a.auth_provider, a.created_at, a.is_active,
                   COUNT(o.order_id) as total_orders
            FROM accounts a
            LEFT JOIN orders o ON o.account_id = a.account_id
            WHERE a.role = 'Customer'
        `;
        const params = [];
        if (search) {
            query += ` AND (a.full_name ILIKE $1 OR a.email ILIKE $1)`;
            params.push(`%${search}%`);
        }
        query += ` GROUP BY a.account_id ORDER BY a.created_at DESC`;

        const result = await pool.query(query, params);
        return sendSuccess(res, 200, "Customers retrieved.", result.rows);
    } catch (err) {
        return sendError(res, 500, "Could not retrieve customers.");
    }
};

// ─── EDIT CUSTOMER (SuperAdmin only) ─────────────────────────────────────────
const editCustomer = async (req, res) => {
    const { id } = req.params;
    const { full_name, email, contact_number, address } = req.body;
    try {
        const result = await pool.query(
            `UPDATE accounts SET 
                full_name = COALESCE($1, full_name), 
                email = COALESCE($2, email),
                contact_number = COALESCE($3, contact_number),
                address = COALESCE($4, address)
             WHERE account_id = $5 AND role = 'Customer' 
             RETURNING account_id, full_name, email, contact_number, address, role`,
            [full_name, email?.toLowerCase(), contact_number, address, id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Customer account not found.");
        return sendSuccess(res, 200, "Customer account updated.", result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not update customer account.");
    }
};

// ─── TOGGLE BAN CUSTOMER (SuperAdmin only) ───────────────────────────────────
const toggleCustomerBan = async (req, res) => {
    const { id } = req.params;
    try {
        // Toggle the is_active status
        const result = await pool.query(
            `UPDATE accounts SET is_active = NOT is_active 
             WHERE account_id = $1 AND role = 'Customer' 
             RETURNING account_id, full_name, is_active`,
            [id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Customer account not found.");
        
        const status = result.rows[0].is_active ? "unbanned" : "banned";
        
        const { logAdminAction } = require('../services/auditService');
        await logAdminAction(req.user.account_id, "Toggle Ban", `Customer "${result.rows[0].full_name}" was ${status}`);
        
        return sendSuccess(res, 200, `Customer account "${result.rows[0].full_name}" has been ${status}.`, result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not update customer ban status.");
    }
};

// ─── DELETE CUSTOMER (SuperAdmin only) ───────────────────────────────────────
const deleteCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "DELETE FROM accounts WHERE account_id = $1 AND role = 'Customer' RETURNING account_id, full_name",
            [id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Customer account not found.");
        
        const { logAdminAction } = require('../services/auditService');
        await logAdminAction(req.user.account_id, "Delete Customer", `Deleted customer "${result.rows[0].full_name}"`);
        
        return sendSuccess(res, 200, `Customer account "${result.rows[0].full_name}" removed.`);
    } catch (err) {
        if (err.code === '23503') { // foreign_key_violation
            return sendError(res, 400, "Cannot delete customer because they have existing orders.");
        }
        return sendError(res, 500, "Could not remove customer account.");
    }
};

// ─── GET ALL STAFF (SuperAdmin only) ─────────────────────────────────────────
const getAllStaff = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT account_id, full_name, email, role, created_at, profile_picture
             FROM accounts WHERE role IN ('Staff','SuperAdmin')
             ORDER BY role, full_name`
        );
        return sendSuccess(res, 200, "Staff retrieved.", result.rows);
    } catch (err) {
        return sendError(res, 500, "Could not retrieve staff.");
    }
};

// ─── ADD STAFF (SuperAdmin only) ─────────────────────────────────────────────
const addStaff = async (req, res) => {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) {
        return sendError(res, 400, "Full name, email, and password are required.");
    }
    if (password.length < 6) {
        return sendError(res, 400, "Password must be at least 6 characters.");
    }

    try {
        const existing = await pool.query(
            "SELECT account_id FROM accounts WHERE email = $1",
            [email.toLowerCase()]
        );
        if (existing.rows.length > 0) {
            return sendError(res, 409, "An account with that email already exists.");
        }

        const password_hash = await hashPassword(password);
        const result = await pool.query(
            `INSERT INTO accounts (full_name, email, password_hash, role, auth_provider, created_at)
             VALUES ($1, $2, $3, 'Staff', 'Local', NOW()) RETURNING account_id, full_name, email, role`,
            [full_name.trim(), email.toLowerCase(), password_hash]
        );
        return sendSuccess(res, 201, "Staff account created.", result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not create staff account.");
    }
};

// ─── EDIT STAFF (SuperAdmin only) ────────────────────────────────────────────
const editStaff = async (req, res) => {
    const { id } = req.params;
    const { full_name, email } = req.body;
    try {
        const result = await pool.query(
            `UPDATE accounts SET full_name = COALESCE($1, full_name), email = COALESCE($2, email)
             WHERE account_id = $3 AND role = 'Staff' RETURNING account_id, full_name, email, role`,
            [full_name, email?.toLowerCase(), id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Staff account not found.");
        return sendSuccess(res, 200, "Staff account updated.", result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not update staff account.");
    }
};

// ─── DEACTIVATE STAFF (SuperAdmin only) ──────────────────────────────────────
const deactivateStaff = async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent deactivating self
        if (parseInt(id) === req.user.account_id) {
            return sendError(res, 400, "You cannot deactivate your own account.");
        }
        const result = await pool.query(
            "DELETE FROM accounts WHERE account_id = $1 AND role = 'Staff' RETURNING account_id, full_name",
            [id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Staff account not found.");
        return sendSuccess(res, 200, `Staff account "${result.rows[0].full_name}" removed.`);
    } catch (err) {
        return sendError(res, 500, "Could not deactivate staff.");
    }
};

// ─── SECURITY LOGS (SuperAdmin only) ─────────────────────────────────────────
const getSecurityLogs = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT sl.*, a.full_name, a.email
             FROM security_logs sl
             LEFT JOIN accounts a ON a.account_id = sl.account_id
             ORDER BY sl.created_at DESC
             LIMIT 200`
        );
        return sendSuccess(res, 200, "Security logs retrieved.", result.rows);
    } catch (err) {
        return sendError(res, 500, "Could not retrieve security logs.");
    }
};

// ─── API LOGS (SuperAdmin only) ──────────────────────────────────────────────
const getAPILogs = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM api_logs ORDER BY created_at DESC LIMIT 200"
        );
        return sendSuccess(res, 200, "API logs retrieved.", result.rows);
    } catch (err) {
        return sendError(res, 500, "Could not retrieve API logs.");
    }
};

// ─── MANAGE PACKAGES (SuperAdmin only) ───────────────────────────────────────
const createPackage = async (req, res) => {
    const { package_name, description, price, turnaround_time, is_active } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO packages (package_name, description, price, turnaround_time, is_active)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [package_name, description, price, turnaround_time || '2-3 days', is_active !== false]
        );
        return sendSuccess(res, 201, "Package created.", result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not create package.");
    }
};

const deletePackage = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE packages SET is_active = FALSE WHERE package_id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Package not found.");
        return sendSuccess(res, 200, "Package deleted successfully.", result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not delete package.");
    }
};

const updatePackage = async (req, res) => {
    const { id } = req.params;
    const { package_name, description, price, turnaround_time, is_active } = req.body;
    try {
        const result = await pool.query(
            `UPDATE packages SET
                package_name = COALESCE($1, package_name),
                description  = COALESCE($2, description),
                price        = COALESCE($3, price),
                turnaround_time = COALESCE($4, turnaround_time),
                is_active    = COALESCE($5, is_active)
             WHERE package_id = $6 RETURNING *`,
            [package_name, description, price, turnaround_time, is_active, id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Package not found.");
        return sendSuccess(res, 200, "Package updated.", result.rows[0]);
    } catch (err) {
        return sendError(res, 500, "Could not update package.");
    }
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
    try {
        const [revenueByDay, ordersByDay, ordersByStatus, ordersByLoad] = await Promise.all([
            // Revenue per day last 7 days (from payments.paid_at)
            pool.query(`
                SELECT TO_CHAR(paid_at::date, 'Mon DD') as day, COALESCE(SUM(amount), 0) as revenue
                FROM payments
                WHERE payment_status = 'Paid'
                  AND paid_at >= NOW() - INTERVAL '7 days'
                GROUP BY paid_at::date
                ORDER BY paid_at::date ASC
            `),
            // Orders per day last 7 days
            pool.query(`
                SELECT TO_CHAR(created_at::date, 'Mon DD') as day, COUNT(*) as count
                FROM orders
                WHERE created_at >= NOW() - INTERVAL '7 days'
                GROUP BY created_at::date
                ORDER BY created_at::date ASC
            `),
            // Orders by status (all time)
            pool.query(`
                SELECT status, COUNT(*) as count
                FROM orders
                GROUP BY status
                ORDER BY count DESC
            `),
            // Orders by load size
            pool.query(`
                SELECT load_size, COUNT(*) as count
                FROM orders
                GROUP BY load_size
                ORDER BY count DESC
            `)
        ]);

        return sendSuccess(res, 200, "Analytics retrieved.", {
            revenue_by_day:   revenueByDay.rows,
            orders_by_day:    ordersByDay.rows,
            orders_by_status: ordersByStatus.rows,
            orders_by_load:   ordersByLoad.rows
        });
    } catch (err) {
        console.error("[Admin] getAnalytics error:", err.message);
        return sendError(res, 500, "Could not retrieve analytics.");
    }
};

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.log_id, l.action, l.details, l.created_at, 
                   a.full_name as admin_name, a.role as admin_role
            FROM admin_logs l
            LEFT JOIN accounts a ON a.account_id = l.admin_id
            ORDER BY l.created_at DESC
            LIMIT 100
        `);
        return sendSuccess(res, 200, "Audit logs retrieved.", result.rows);
    } catch (err) {
        console.error("[Admin] getAuditLogs error:", err.message);
        return sendError(res, 500, "Could not retrieve audit logs.");
    }
};


const getChatLogs = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                l.log_id,
                l.action,
                l.details,
                l.created_at,
                a.full_name AS admin_name,
                a.role AS admin_role
            FROM admin_logs l
            LEFT JOIN accounts a ON l.admin_id = a.account_id
            WHERE l.action LIKE '%Chat%'
            ORDER BY l.created_at DESC
        `);
        return sendSuccess(res, 200, 'Chat logs retrieved', result.rows);
    } catch (err) {
        console.error('[Admin] getChatLogs error:', err.message);
        return sendError(res, 500, 'Could not retrieve chat logs');
    }
};

module.exports = {
    getChatLogs,
    getDashboardStats,
    getAllOrders,
    updateOrderStatus,
    cancelOrder,
    getAllCustomers,
    editCustomer,
    toggleCustomerBan,
    deleteCustomer,
    getAllStaff,
    addStaff,
    editStaff,
    deactivateStaff,
    getSecurityLogs,
    getAPILogs,
    createPackage,
    updatePackage,
    deletePackage,
    getAnalytics,
    getAuditLogs
};
