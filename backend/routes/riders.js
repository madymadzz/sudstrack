const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const { getAllRiders, createRider, updateRider, deleteRider } = require("../controllers/ridersController");

// Admin/Staff only
router.get("/", protect, requireRole("Admin", "SuperAdmin", "Staff"), getAllRiders);
router.post("/", protect, requireRole("Admin", "SuperAdmin"), createRider);
router.put("/:id", protect, requireRole("Admin", "SuperAdmin"), updateRider);
router.delete("/:id", protect, requireRole("Admin", "SuperAdmin"), deleteRider);

module.exports = router;
