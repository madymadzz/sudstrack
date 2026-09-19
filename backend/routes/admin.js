const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");
const { superAdminOnly } = require("../middleware/superAdminOnly");
const {
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
    getAuditLogs,
    getChatLogs,
    wipeAuditLogs,
    wipeGlobalChatLogs
} = require("../controllers/adminController");

// All admin routes require auth + at least Staff role
router.use(protect, adminOnly);

// Stats & orders (Staff + SuperAdmin)
router.get("/stats",                   getDashboardStats);
router.get("/analytics",               getAnalytics);
router.get("/orders",                  getAllOrders);
router.put("/orders/:id/status",       updateOrderStatus);
router.put("/orders/:id/cancel",       cancelOrder);

router.get("/customers",               getAllCustomers);
router.put("/customers/:id/ban",       superAdminOnly, toggleCustomerBan);
router.put("/customers/:id",           superAdminOnly, editCustomer);
router.delete("/customers/:id",        superAdminOnly, deleteCustomer);

// SuperAdmin-only routes
router.get("/audit-logs",              superAdminOnly, getAuditLogs);
router.delete("/audit-logs/wipe",         superAdminOnly, wipeAuditLogs);
router.get("/staff",                   superAdminOnly, getAllStaff);
router.post("/staff",                  superAdminOnly, addStaff);
router.put("/staff/:id",               superAdminOnly, editStaff);
router.delete("/staff/:id",            superAdminOnly, deactivateStaff);
router.get("/security-events",         superAdminOnly, getSecurityLogs);
router.get("/api-logs",                superAdminOnly, getAPILogs);
router.post("/packages",               superAdminOnly, createPackage);
router.put("/packages/:id",            superAdminOnly, updatePackage);
router.delete("/packages/:id",         superAdminOnly, deletePackage);

router.get("/chat-logs",              superAdminOnly, getChatLogs);
router.delete("/chat-logs/wipe",         superAdminOnly, wipeGlobalChatLogs);

module.exports = router;
