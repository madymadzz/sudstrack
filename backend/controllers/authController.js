const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/passwordUtils");
const { signToken, setTokenCookie, clearTokenCookie } = require("../utils/tokenUtils");
const { sendSuccess, sendError } = require("../utils/responseUtils");
const { sendPasswordResetEmail } = require("../services/emailService");
const { ROLES, AUTH_PROVIDERS, LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_MINUTES } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const logSecurityEvent = async (accountId, emailAttempted, eventType, ipAddress, attemptsCount, lockoutTriggered) => {
    try {
        await pool.query(
            `INSERT INTO security_logs (account_id, email_attempted, event_type, ip_address, attempts_count, lockout_triggered, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [accountId, emailAttempted, eventType, ipAddress, attemptsCount, lockoutTriggered]
        );
    } catch (e) {
        console.error("[SecurityLog] Failed:", e.message);
    }
};

// ─── REGISTER ─────────────────────────────────────────────────────────────────

const register = async (req, res) => {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
        return sendError(res, 400, "Full name, email, and password are required.");
    }
    if (password.length < 6) {
        return sendError(res, 400, "Password must be at least 6 characters.");
    }

    try {
        const existing = await pool.query("SELECT account_id FROM accounts WHERE email = $1", [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return sendError(res, 409, "An account with that email already exists.");
        }

        const password_hash = await hashPassword(password);
        const result = await pool.query(
            `INSERT INTO accounts (full_name, email, password_hash, role, auth_provider, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING account_id, full_name, email, role`,
            [full_name.trim(), email.toLowerCase(), password_hash, ROLES.CUSTOMER, AUTH_PROVIDERS.LOCAL]
        );

        const user = result.rows[0];
        const token = signToken(user.account_id, user.role);
        setTokenCookie(res, token);

        return sendSuccess(res, 201, "Account created successfully.", {
            account_id: user.account_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        console.error("[Auth] Register error:", err.message);
        return sendError(res, 500, "Registration failed. Please try again.");
    }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

const login = async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

    if (!email || !password) {
        return sendError(res, 400, "Email and password are required.");
    }

    try {
        const result = await pool.query(
            "SELECT * FROM accounts WHERE email = $1",
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return sendError(res, 401, "Invalid email or password.");
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return sendError(res, 403, "This account has been banned or deactivated by an administrator.");
        }

        // Check lockout
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            return sendError(res, 429, `Too many failed attempts. Try again in ${remaining} minute(s), or reset your password.`);
        }

        // Google-only account
        if (user.auth_provider === AUTH_PROVIDERS.GOOGLE && !user.password_hash) {
            return sendError(res, 400, "This account uses Google login. Please sign in with Google.");
        }

        const isValid = await comparePassword(password, user.password_hash);

        if (!isValid) {
            const newAttempts = user.login_attempts + 1;
            let lockedUntil = null;
            let lockoutTriggered = false;

            if (newAttempts >= LOGIN_MAX_ATTEMPTS) {
                lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000);
                lockoutTriggered = true;
            }

            await pool.query(
                "UPDATE accounts SET login_attempts = $1, locked_until = $2 WHERE account_id = $3",
                [newAttempts, lockedUntil, user.account_id]
            );

            await logSecurityEvent(user.account_id, email, "FAILED_LOGIN", ip, newAttempts, lockoutTriggered);

            if (lockoutTriggered) {
                return sendError(res, 429, `Account temporarily locked after ${LOGIN_MAX_ATTEMPTS} failed attempts. Try again in ${LOGIN_LOCKOUT_MINUTES} minutes, or reset your password.`);
            }

            const remaining = LOGIN_MAX_ATTEMPTS - newAttempts;
            return sendError(res, 401, `Invalid email or password. ${remaining} attempt(s) remaining before lockout.`);
        }

        // Success — reset attempts, clear lockout
        await pool.query(
            "UPDATE accounts SET login_attempts = 0, locked_until = NULL WHERE account_id = $1",
            [user.account_id]
        );

        if (user.two_factor_enabled) {
            // Do not issue JWT yet. Issue a temporary token for 2FA verification.
            const crypto = require('crypto');
            const tempToken = crypto.randomUUID();
            
            // Store temp token in memory for 5 minutes
            global.loginTempTokens = global.loginTempTokens || new Map();
            global.loginTempTokens.set(tempToken, { account_id: user.account_id, role: user.role, expires: Date.now() + 5 * 60000 });
            
            return res.status(200).json({
                success: true,
                require_2fa: true,
                temp_token: tempToken,
                message: "2FA required to complete login."
            });
        }

        const token = signToken(user.account_id, user.role);
        setTokenCookie(res, token);

        return sendSuccess(res, 200, "Logged in successfully.", {
            account_id: user.account_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            two_factor_enabled: user.two_factor_enabled,
            contact_number: user.contact_number,
            address: user.address
        });
    } catch (err) {
        console.error("[Auth] Login error:", err.message);
        return sendError(res, 500, "Login failed. Please try again.");
    }
};

// ─── VERIFY 2FA LOGIN ──────────────────────────────────────────────────────────
const verifyLogin2FA = async (req, res) => {
    const { temp_token, code } = req.body;
    
    if (!temp_token || !code) {
        return sendError(res, 400, "Temporary token and 2FA code are required.");
    }

    if (!global.loginTempTokens) {
        return sendError(res, 401, "Session expired. Please log in again.");
    }

    const session = global.loginTempTokens.get(temp_token);
    if (!session || Date.now() > session.expires) {
        if (session) global.loginTempTokens.delete(temp_token);
        return sendError(res, 401, "Session expired. Please log in again.");
    }

    try {
        const result = await pool.query("SELECT totp_secret FROM accounts WHERE account_id = $1", [session.account_id]);
        if (result.rows.length === 0) return sendError(res, 404, "Account not found.");

        const secret = result.rows[0].totp_secret;
        const speakeasy = require('speakeasy');
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) {
            return sendError(res, 400, "Invalid 2FA code.");
        }

        // Success! Remove temp token and issue JWT
        global.loginTempTokens.delete(temp_token);
        
        const token = signToken(session.account_id, session.role);
        setTokenCookie(res, token);
        
        return sendSuccess(res, 200, "2FA verified successfully.");
    } catch (err) {
        console.error("[Auth] Verify 2FA error:", err.message);
        return sendError(res, 500, "Could not verify 2FA.");
    }
};

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────

const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return sendError(res, 400, "Email and password are required.");
    }

    try {
        const result = await pool.query(
            "SELECT * FROM accounts WHERE email = $1 AND role IN ('Staff', 'SuperAdmin')",
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return sendError(res, 401, "Invalid credentials or insufficient permissions.");
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return sendError(res, 403, "This account has been banned or deactivated by an administrator.");
        }

        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            return sendError(res, 429, "Account temporarily locked. Please try again later.");
        }

        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            return sendError(res, 401, "Invalid email or password.");
        }

        await pool.query(
            "UPDATE accounts SET login_attempts = 0, locked_until = NULL WHERE account_id = $1",
            [user.account_id]
        );

        const token = signToken(user.account_id, user.role);
        setTokenCookie(res, token);

        return sendSuccess(res, 200, "Admin logged in successfully.", {
            account_id: user.account_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        console.error("[Auth] Admin Login error:", err.message);
        return sendError(res, 500, "Login failed: " + err.message);
    }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

const logout = (req, res) => {
    clearTokenCookie(res);
    return sendSuccess(res, 200, "Logged out successfully.");
};

// ─── GET ME ───────────────────────────────────────────────────────────────────

const getMe = (req, res) => {
    return sendSuccess(res, 200, "Authenticated.", {
        account_id: req.user.account_id,
        full_name: req.user.full_name,
        email: req.user.email,
        role: req.user.role,
        contact_number: req.user.contact_number,
        address: req.user.address,
        two_factor_enabled: req.user.two_factor_enabled,
        profile_picture: req.user.profile_picture || null
    });
};

// ─── CHECK EMAIL ──────────────────────────────────────────────────────────────

const checkEmail = async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, 400, "Email is required.");

    try {
        const result = await pool.query(
            "SELECT account_id FROM accounts WHERE email = $1",
            [email.toLowerCase()]
        );
        return sendSuccess(res, 200, "Email checked.", { available: result.rows.length === 0 });
    } catch (err) {
        return sendError(res, 500, "Could not check email.");
    }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, 400, "Email is required.");

    try {
        const result = await pool.query(
            "SELECT account_id, full_name, email FROM accounts WHERE email = $1",
            [email.toLowerCase()]
        );

        // Always return success to prevent email enumeration
        if (result.rows.length === 0) {
            return sendSuccess(res, 200, "If that email exists, a reset link has been sent.");
        }

        const user = result.rows[0];
        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const tokenHash = crypto.createHash("sha256").update(otpCode).digest("hex");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Invalidate old tokens for this user
        await pool.query(
            "UPDATE password_reset_tokens SET used = TRUE WHERE account_id = $1 AND used = FALSE",
            [user.account_id]
        );

        // Store new token
        await pool.query(
            `INSERT INTO password_reset_tokens (account_id, token_hash, expires_at, used, created_at)
             VALUES ($1, $2, $3, FALSE, NOW())`,
            [user.account_id, tokenHash, expiresAt]
        );

        const emailResult = await sendPasswordResetEmail(user.email, otpCode, user.full_name);
        
        if (!emailResult.success) {
            throw new Error(emailResult.error || "Failed to send email.");
        }

        return sendSuccess(res, 200, "If that email exists, a 6-digit code has been sent.");
    } catch (err) {
        console.error("[Auth] Forgot password error:", err.message);
        return sendError(res, 500, "Could not process request.");
    }
};

// ─── VERIFY RESET CODE ──────────────────────────────────────────────────────
const verifyResetCode = async (req, res) => {
    const { token } = req.body;
    if (!token) return sendError(res, 400, "Reset code is required.");

    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const result = await pool.query(
            `SELECT * FROM password_reset_tokens
             WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return sendError(res, 400, "Invalid or expired reset code.");
        }

        return sendSuccess(res, 200, "Code is valid.");
    } catch (err) {
        console.error("[Auth] Verify reset code error:", err.message);
        return sendError(res, 500, "Could not verify code.");
    }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return sendError(res, 400, "Token and new password are required.");
    }
    if (newPassword.length < 6) {
        return sendError(res, 400, "Password must be at least 6 characters.");
    }

    try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const result = await pool.query(
            `SELECT * FROM password_reset_tokens
             WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return sendError(res, 400, "Invalid or expired reset code. Please request a new one.");
        }

        const resetRecord = result.rows[0];
        const newHash = await hashPassword(newPassword);

        await pool.query(
            "UPDATE accounts SET password_hash = $1, login_attempts = 0, locked_until = NULL WHERE account_id = $2",
            [newHash, resetRecord.account_id]
        );

        await pool.query(
            "UPDATE password_reset_tokens SET used = TRUE WHERE token_id = $1",
            [resetRecord.token_id]
        );

        clearTokenCookie(res);
        return sendSuccess(res, 200, "Password reset successfully. Please log in with your new password.");
    } catch (err) {
        console.error("[Auth] Reset password error:", err.message);
        return sendError(res, 500, "Could not reset password.");
    }
};

// ─── SET INITIAL PASSWORD ──────────────────────────────────────────────────────
const setInitialPassword = async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) return sendError(res, 400, "Password must be at least 6 characters.");

    try {
        // req.user exists because this is protected route
        const result = await pool.query("SELECT password_hash FROM accounts WHERE account_id = $1", [req.user.account_id]);
        if (result.rows.length === 0) return sendError(res, 404, "Account not found.");
        
        if (result.rows[0].password_hash) {
            return sendError(res, 400, "Password is already set. Use Change Password instead.");
        }

        const newHash = await hashPassword(password);
        await pool.query(
            "UPDATE accounts SET password_hash = $1 WHERE account_id = $2",
            [newHash, req.user.account_id]
        );
        return sendSuccess(res, 200, "Password set successfully.");
    } catch (err) {
        console.error("[Auth] setInitialPassword error:", err.message);
        return sendError(res, 500, "Could not set password.");
    }
};

// ─── GOOGLE OAUTH CALLBACK ────────────────────────────────────────────────────

// In-memory one-time token store (keyed by random token → JWT, expires in 2 min)
const googleTokenStore = new Map();

// Helper: get the correct frontend base URL (auto-detects in production)
const getFrontendUrl = (req) => {
    // If a valid FRONTEND_URL is set (not the placeholder), use it
    const envUrl = process.env.FRONTEND_URL;
    if (envUrl && !envUrl.includes('example.com') && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost')) {
        return envUrl;
    }
    // Auto-detect from the request host (works on Vercel automatically)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}`;
};

const googleCallback = (req, res) => {
    try {
        const frontendUrl = getFrontendUrl(req);

        if (!req.user) {
            return res.redirect(`${frontendUrl}/pages/auth/login.html?error=google_failed`);
        }

        const jwt = signToken(req.user.account_id, req.user.role);

        // Serverless fix: directly set the cookie instead of using in-memory store
        setTokenCookie(res, jwt);

        // Redirect directly to the correct page
        let redirectUrl = `${frontendUrl}/pages/auth/login.html`; // login.js will auto-redirect if logged in
        if (req.user.is_new) {
            redirectUrl = `${frontendUrl}/pages/auth/complete-profile.html`;
        }
        console.log("[Auth] Google callback redirecting to:", redirectUrl);
        return res.redirect(redirectUrl);
    } catch (err) {
        console.error("[Auth] Google callback error:", err.message);
        return res.redirect(`${process.env.FRONTEND_URL}/pages/auth/login.html?error=google_failed`);
    }
};

// ─── GOOGLE SESSION EXCHANGE ──────────────────────────────────────────────────
// Called by the frontend after Google redirect; exchanges the one-time key for a real cookie
const exchangeGoogleToken = (req, res) => {
    const { t } = req.query;
    if (!t) return sendError(res, 400, "Missing token.");

    const entry = googleTokenStore.get(t);
    if (!entry || Date.now() > entry.expires) {
        googleTokenStore.delete(t);
        return sendError(res, 401, "Token expired or invalid. Please sign in again.");
    }

    googleTokenStore.delete(t); // one-time use
    setTokenCookie(res, entry.jwt);
    return sendSuccess(res, 200, "Authenticated via Google.");
};

module.exports = {
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
    setInitialPassword,
    googleCallback,
    exchangeGoogleToken
};
