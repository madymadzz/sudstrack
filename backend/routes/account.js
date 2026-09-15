const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
    updateProfile,
    changePassword,
    setup2FA,
    verify2FA,
    disable2FA,
    validate2FA,
    uploadProfilePicture
} = require("../controllers/accountController");

const { getNotifications, markAsRead } = require("../controllers/notificationController");

router.use(protect);

router.put("/profile",          updateProfile);
router.post("/change-password", changePassword);
router.post("/2fa/setup",       setup2FA);
router.post("/2fa/verify",      verify2FA);
router.post("/2fa/disable",     disable2FA);
router.post("/2fa/validate",    validate2FA);
router.post("/profile-picture", uploadProfilePicture);

router.get("/notifications",    getNotifications);
router.put("/notifications/read", markAsRead);

module.exports = router;
