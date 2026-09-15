const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
    createOrder,
    getMyOrders,
    getSavedOrders,
    saveOrder,
    unsaveOrder,
    getOrderQR,
    getOrderTracking
} = require("../controllers/ordersController");

// All order routes require authentication
router.use(protect);

router.post("/",              createOrder);
router.get("/my",             getMyOrders);
router.get("/saved",          getSavedOrders);
router.post("/:id/save",      saveOrder);
router.delete("/:id/save",    unsaveOrder);
router.get("/:id/qr",         getOrderQR);
router.get("/:id/tracking",   getOrderTracking);

module.exports = router;
