const nodemailer = require("nodemailer");
const { sendSuccess, sendError } = require("../utils/responseUtils");

const submitContact = async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return sendError(res, 400, "Name, email, and message are required.");
    if (name.length > 100 || message.length > 2000) return sendError(res, 400, "Input too long.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return sendError(res, 400, "Invalid email address.");
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD }
        });
        const safeName    = String(name).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeEmail   = String(email).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeMessage = String(message).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: "[SudsTrack] New Contact from " + name,
            html: "<div style='font-family:sans-serif;max-width:560px;padding:24px;border:1px solid #e2e8f0;border-radius:12px;'><h2 style='color:#1a2e4a;margin-top:0;'>New Contact Message</h2><p><strong>Name:</strong> " + safeName + "</p><p><strong>Email:</strong> <a href='mailto:" + safeEmail + "'>" + safeEmail + "</a></p><div style='background:#f8fafc;border-radius:8px;padding:16px;'><p style='color:#374151;line-height:1.7;margin:0;'>" + safeMessage + "</p></div><hr style='border:none;border-top:1px solid #eee;margin:20px 0;'><p style='color:#94a3b8;font-size:12px;'>SudsTrack Laundry - TIP QC</p></div>"
        });
        console.log("[Contact] Forwarded message from:", name);
        return sendSuccess(res, 200, "Your message has been sent! We will get back to you soon.");
    } catch (err) {
        console.error("[Contact] Failed:", err.message);
        return sendError(res, 500, "Could not send your message.");
    }
};

module.exports = { submitContact };
