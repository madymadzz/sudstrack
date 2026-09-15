const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");
const { hashPassword, comparePassword } = require("../utils/passwordUtils");
const { send2FACodeEmail } = require("../services/emailService");
const speakeasy = require("speakeasy");
const { generateQRCodeURL } = require("../services/qrService");

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
    const { full_name, contact_number, address } = req.body;
    try {
        const result = await pool.query(
            `UPDATE accounts SET full_name = COALESCE($1, full_name), contact_number = $2, address = $3
             WHERE account_id = $4
             RETURNING account_id, full_name, email, contact_number, address`,
            [full_name || null, contact_number || null, address || null, req.user.account_id]
        );
        return sendSuccess(res, 200, "Profile updated.", result.rows[0]);
    } catch (err) {
        console.error("[Account] updateProfile error:", err.message);
        return sendError(res, 500, "Could not update profile.");
    }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
const changePassword = async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return sendError(res, 400, "Current password and new password are required.");
    }
    if (new_password.length < 6) {
        return sendError(res, 400, "New password must be at least 6 characters.");
    }

    try {
        const result = await pool.query(
            "SELECT password_hash FROM accounts WHERE account_id = $1",
            [req.user.account_id]
        );
        const user = result.rows[0];

        if (!user.password_hash) {
            return sendError(res, 400, "Google accounts cannot change password here. Use Google account settings.");
        }

        const isValid = await comparePassword(current_password, user.password_hash);
        if (!isValid) {
            return sendError(res, 401, "Current password is incorrect.");
        }

        const newHash = await hashPassword(new_password);
        await pool.query(
            "UPDATE accounts SET password_hash = $1 WHERE account_id = $2",
            [newHash, req.user.account_id]
        );

        return sendSuccess(res, 200, "Password changed successfully.");
    } catch (err) {
        console.error("[Account] changePassword error:", err.message);
        return sendError(res, 500, "Could not change password.");
    }
};

// ─── SETUP 2FA ────────────────────────────────────────────────────────────────
const setup2FA = async (req, res) => {
    try {
        const qrcode = require("qrcode");
        // Generate a new TOTP secret
        const secret = speakeasy.generateSecret({
            name: `SudsTrack (${req.user.email})`,
            length: 20
        });

        // Store the secret temporarily (not enabled yet — user must verify first)
        await pool.query(
            "UPDATE accounts SET totp_secret = $1 WHERE account_id = $2",
            [secret.base32, req.user.account_id]
        );

        // Generate a base64 Data URI directly on the server (Secure)
        const qrURL = await qrcode.toDataURL(secret.otpauth_url);

        return sendSuccess(res, 200, "2FA setup initiated. Scan the QR code with your authenticator app.", {
            secret:     secret.base32,
            qr_code_url: qrURL,
            otpauth_url: secret.otpauth_url
        });
    } catch (err) {
        console.error("[Account] setup2FA error:", err.message);
        return sendError(res, 500, "Could not set up 2FA.");
    }
};

// ─── VERIFY & ENABLE 2FA ──────────────────────────────────────────────────────
const verify2FA = async (req, res) => {
    const { token } = req.body;
    if (!token) return sendError(res, 400, "Verification token is required.");

    try {
        const result = await pool.query(
            "SELECT totp_secret FROM accounts WHERE account_id = $1",
            [req.user.account_id]
        );
        const { totp_secret } = result.rows[0];

        if (!totp_secret) {
            return sendError(res, 400, "Please set up 2FA first.");
        }

        const verified = speakeasy.totp.verify({
            secret:   totp_secret,
            encoding: "base32",
            token,
            window:   1
        });

        if (!verified) {
            return sendError(res, 401, "Invalid verification code. Please try again.");
        }

        await pool.query(
            "UPDATE accounts SET two_factor_enabled = TRUE WHERE account_id = $1",
            [req.user.account_id]
        );

        return sendSuccess(res, 200, "Two-factor authentication enabled successfully.");
    } catch (err) {
        console.error("[Account] verify2FA error:", err.message);
        return sendError(res, 500, "Could not verify 2FA code.");
    }
};

// ─── DISABLE 2FA ─────────────────────────────────────────────────────────────
const disable2FA = async (req, res) => {
    try {
        await pool.query(
            "UPDATE accounts SET two_factor_enabled = FALSE, totp_secret = NULL WHERE account_id = $1",
            [req.user.account_id]
        );
        return sendSuccess(res, 200, "Two-factor authentication disabled.");
    } catch (err) {
        return sendError(res, 500, "Could not disable 2FA.");
    }
};

// ─── VALIDATE 2FA TOKEN AT LOGIN ──────────────────────────────────────────────
const validate2FA = async (req, res) => {
    const { account_id, token } = req.body;
    if (!account_id || !token) {
        return sendError(res, 400, "account_id and token are required.");
    }

    try {
        const result = await pool.query(
            "SELECT totp_secret, two_factor_enabled FROM accounts WHERE account_id = $1",
            [account_id]
        );
        if (result.rows.length === 0) return sendError(res, 404, "Account not found.");

        const { totp_secret, two_factor_enabled } = result.rows[0];
        if (!two_factor_enabled || !totp_secret) {
            return sendError(res, 400, "2FA is not enabled on this account.");
        }

        const verified = speakeasy.totp.verify({
            secret:   totp_secret,
            encoding: "base32",
            token,
            window:   1
        });

        if (!verified) return sendError(res, 401, "Invalid 2FA code.");
        return sendSuccess(res, 200, "2FA verified successfully.");
    } catch (err) {
        return sendError(res, 500, "Could not validate 2FA.");
    }
};

const uploadProfilePicture = async (req, res) => {
    const { image } = req.body; // base64 data URI e.g. "data:image/jpeg;base64,..."

    if (!image) return sendError(res, 400, "No image provided.");

    // Basic validation — must be a data URI image
    if (!image.startsWith("data:image/")) {
        return sendError(res, 400, "Invalid image format. Please upload a JPG, PNG, or WebP.");
    }

    // Size guard: base64 encodes ~1.37x, so 2MB file ≈ 2.7MB base64 string
    if (image.length > 2_800_000) {
        return sendError(res, 400, "Image is too large. Please upload an image under 2MB.");
    }

    try {
        await pool.query(
            "UPDATE accounts SET profile_picture = $1 WHERE account_id = $2",
            [image, req.user.account_id]
        );
        return sendSuccess(res, 200, "Profile picture updated.", { profile_picture: image });
    } catch (err) {
        console.error("[Account] uploadProfilePicture error:", err.message);
        return sendError(res, 500, "Could not update profile picture.");
    }
};

module.exports = {
    updateProfile,
    changePassword,
    setup2FA,
    verify2FA,
    disable2FA,
    validate2FA,
    uploadProfilePicture
};
