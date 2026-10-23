const nodemailer = require("nodemailer");

const createTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        }
    });
};

/**
 * Send a password reset email with a reset link
 */
const sendPasswordResetEmail = async (toEmail, resetToken, fullName) => {
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "placeholder@gmail.com") {
        console.log("[EMAIL STUB] Password reset email to:", toEmail);
        console.log("[EMAIL STUB] Reset token:", resetToken);
        return { success: true, stub: true };
    }

    try {
        const transporter = createTransporter();

        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || "SudsTrack"}" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "SudsTrack — Password Reset Code",
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
                    <h2 style="color:#1a2e4a;">Reset your SudsTrack password</h2>
                    <p>Hi ${fullName},</p>
                    <p>We received a request to reset your password. Use the code below to securely reset it:</p>
                    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a2e4a;margin:24px 0;text-align:center;background:#f8fafc;padding:16px;border-radius:12px;border:1px dashed #cbd5e1;">${resetToken}</div>
                    <p style="color:#666;font-size:13px;">This code expires in <strong>15 minutes</strong>.</p>
                    <p style="color:#666;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                    <p style="color:#999;font-size:12px;">SudsTrack Laundry Management System &mdash; TIP QC</p>
                </div>
            `
        });

        console.log("[Email] Password reset sent to:", toEmail);
        return { success: true };
    } catch (err) {
        console.error("[Email] Failed to send reset email:", err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Send a 2FA verification code email
 */
const send2FACodeEmail = async (toEmail, code, fullName) => {
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "placeholder@gmail.com") {
        console.log("[EMAIL STUB] 2FA code to:", toEmail, "Code:", code);
        return { success: true, stub: true };
    }

    try {
        const transporter = createTransporter();

        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || "SudsTrack"}" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "SudsTrack — Your Verification Code",
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
                    <h2 style="color:#1a2e4a;">Your verification code</h2>
                    <p>Hi ${fullName},</p>
                    <p>Use the code below to complete your login:</p>
                    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a2e4a;margin:24px 0;">${code}</div>
                    <p style="color:#666;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
                    <p style="color:#666;font-size:13px;">If you did not attempt to log in, please reset your password immediately.</p>
                </div>
            `
        });

        return { success: true };
    } catch (err) {
        console.error("[Email] Failed to send 2FA email:", err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Send a welcome / account-created email on successful registration
 */
const sendWelcomeEmail = async (toEmail, fullName) => {
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "placeholder@gmail.com") {
        console.log("[EMAIL STUB] Welcome email to:", toEmail, "name:", fullName);
        return { success: true, stub: true };
    }

    try {
        const transporter = createTransporter();
        const firstName = (fullName || "").split(" ")[0] || "there";

        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || "SudsTrack"}" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: "Welcome to SudsTrack! 🧺 Your account is ready",
            html: `
                <div style="font-family:'Nunito',sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <div style="background:#1a2e4a;padding:32px 24px;text-align:center;">
                        <h1 style="color:#38bdf8;margin:0;font-size:28px;letter-spacing:-0.5px;">SudsTrack</h1>
                        <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">Laundry Pickup & Delivery · TIP QC</p>
                    </div>
                    <!-- Body -->
                    <div style="padding:32px 28px;">
                        <h2 style="color:#1a2e4a;font-size:22px;margin:0 0 12px;">Hi ${firstName}, welcome aboard! 👋</h2>
                        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px;">
                            Your SudsTrack account has been created successfully. You can now book laundry
                            pickups and track your orders in real time.
                        </p>

                        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;margin-bottom:24px;">
                            <p style="margin:0 0 10px;color:#0369a1;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">What you can do now</p>
                            <ul style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:2;">
                                <li>Browse our laundry packages</li>
                                <li>Book a pickup at your doorstep</li>
                                <li>Track your order status in real time</li>
                                <li>Receive SMS updates on your order</li>
                            </ul>
                        </div>

                        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/pages/user/booking.html"
                           style="display:inline-block;background:#38bdf8;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:24px;">
                            Book your first laundry →
                        </a>

                        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
                        <p style="color:#94a3b8;font-size:12px;margin:0;">
                            If you did not sign up for SudsTrack, please ignore this email or
                            <a href="mailto:${process.env.EMAIL_USER}" style="color:#38bdf8;">contact us</a>.
                        </p>
                    </div>
                    <!-- Footer -->
                    <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">
                        <p style="color:#94a3b8;font-size:12px;margin:0;">
                            SudsTrack Laundry Management System &mdash; Cubao / TIP QC, Philippines
                        </p>
                    </div>
                </div>
            `
        });

        console.log("[Email] Welcome email sent to:", toEmail);
        return { success: true };
    } catch (err) {
        console.error("[Email] Failed to send welcome email:", err.message);
        return { success: false, error: err.message };
    }
};

module.exports = { sendPasswordResetEmail, send2FACodeEmail, sendWelcomeEmail };
