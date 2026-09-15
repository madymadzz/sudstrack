const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
    register,
    login,
    verifyLogin2FA,
    adminLogin,
    logout,
    getMe,
    checkEmail,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    googleCallback,
    exchangeGoogleToken
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Public routes
router.post("/register",          register);
router.post("/login",             login);
router.post("/verify-login-2fa",  verifyLogin2FA);
router.post("/admin-login",       adminLogin);
router.post("/logout",            logout);
router.post("/check-email",       checkEmail);
router.post("/forgot-password",   forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password",    resetPassword);

// Protected route
router.get("/me", protect, getMe);
router.post("/set-initial-password", protect, require("../controllers/authController").setInitialPassword);

// Google OAuth — dynamically build callback URL from the incoming request host
// state: false is required on Vercel (serverless) since in-memory state can't be shared across instances
router.get("/google", (req, res, next) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const callbackURL = `${protocol}://${host}/api/auth/google/callback`;
    passport.authenticate("google", { scope: ["profile", "email"], session: false, callbackURL, state: false })(req, res, next);
});
router.get("/google/callback", (req, res, next) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const callbackURL = `${protocol}://${host}/api/auth/google/callback`;
    passport.authenticate("google", { failureRedirect: "/api/auth/google/fail", session: false, callbackURL, state: false })(req, res, next);
}, googleCallback);
router.get("/google/fail", (req, res) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    res.redirect(`${protocol}://${host}/pages/auth/login.html?error=google_failed`);
});
router.get("/google/session", exchangeGoogleToken);

module.exports = router;
