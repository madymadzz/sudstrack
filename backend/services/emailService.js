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

module.exports = { sendPasswordResetEmail, send2FACodeEmail };
