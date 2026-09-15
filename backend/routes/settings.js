const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { superAdminOnly } = require("../middleware/superAdminOnly");
const { getSettings, updateSettings } = require("../controllers/settingsController");

router.get("/", getSettings);
router.put("/", protect, superAdminOnly, updateSettings);

module.exports = router;
