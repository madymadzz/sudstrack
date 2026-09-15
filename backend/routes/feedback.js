const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const { submitFeedback, getAllFeedback } = require("../controllers/feedbackController");

router.post("/", protect, submitFeedback);
router.get("/all", protect, requireRole("Admin", "SuperAdmin", "Staff"), getAllFeedback);

module.exports = router;
