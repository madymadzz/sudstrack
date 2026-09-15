const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");

const {
    getActivePromotions,
    getAllPromotions,
    createPromotion,
    togglePromotion,
    deletePromotion
} = require("../controllers/promoController");

// Public route for landing page
router.get("/active", getActivePromotions);

// Admin-only routes
router.use(protect, adminOnly);
router.get("/", getAllPromotions);
router.post("/", createPromotion);
router.put("/:id/toggle", togglePromotion);
router.delete("/:id", deletePromotion);

module.exports = router;
