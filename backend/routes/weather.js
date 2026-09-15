const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { checkWeather } = require("../controllers/weatherController");

router.post("/check", protect, checkWeather);

module.exports = router;
