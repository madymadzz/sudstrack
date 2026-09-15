const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { submitContact } = require("../controllers/contactController");

const contactLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: "Too many messages. Please wait 15 minutes." } });

router.post("/", contactLimit, submitContact);

module.exports = router;
