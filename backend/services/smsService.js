const axios = require("axios");
const { logAPIEvent } = require("./apiLogger");
const { API_LOG_SEVERITY } = require("../config/constants");

const SEMAPHORE_URL = "https://api.semaphore.co/api/v4/messages";

/**
 * Send an SMS notification via Semaphore API
 * NOTE: Semaphore credits will be added September 15.
 * Until then, this function logs the SMS to console instead of sending.
 */
const sendSMS = async (contactNumber, message) => {
    // STUB MODE: Log instead of sending (until Sep 15)
    if (!process.env.SEMAPHORE_API_KEY || process.env.SEMAPHORE_API_KEY === "placeholder") {
        console.log(`[SMS STUB] To: ${contactNumber}`);
        console.log(`[SMS STUB] Message: ${message}`);
        return { success: true, stub: true };
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            attempt++;

            const payload = {
                apikey:      process.env.SEMAPHORE_API_KEY,
                number:      contactNumber,
                message:     message
            };
            
            if (process.env.SEMAPHORE_SENDER_NAME) {
                payload.sendername = process.env.SEMAPHORE_SENDER_NAME;
            }

            const response = await axios.post(SEMAPHORE_URL, payload, { timeout: 10000 });

            await logAPIEvent({
                api_name: "Semaphore",
                endpoint: "/messages",
                error_type: null,
                error_message: null,
                retry_count: attempt - 1,
                recovered: true,
                severity: API_LOG_SEVERITY.LOW
            });

            console.log(`[SMS] Sent to ${contactNumber}: ${message}`);
            return { success: true, data: response.data };

        } catch (err) {
            console.error(`[SMSService] Attempt ${attempt} failed:`, err.message);

            if (attempt >= MAX_RETRIES) {
                await logAPIEvent({
                    api_name: "Semaphore",
                    endpoint: "/messages",
                    error_type: err.code || "REQUEST_FAILED",
                    error_message: err.message,
                    retry_count: attempt,
                    recovered: false,
                    severity: API_LOG_SEVERITY.HIGH
                });

                return { success: false, error: err.message };
            }

            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
};

/**
 * Pre-built SMS message templates
 */
const SMS_TEMPLATES = {
    orderConfirmed: (orderCode) =>
        `SudsTrack: Your order ${orderCode} has been confirmed! We will pick up your laundry at your scheduled time. Track it on your account.`,

    statusUpdate: (orderCode, status) =>
        `SudsTrack: Your order ${orderCode} is now ${status}. Log in to track your order.`,

    outForDelivery: (orderCode) =>
        `SudsTrack: Your order ${orderCode} is out for delivery! Expect it soon.`,

    completed: (orderCode) =>
        `SudsTrack: Your order ${orderCode} has been delivered. Thank you for using SudsTrack!`,

    passwordReset: (code) =>
        `SudsTrack: Your password reset code is ${code}. It expires in 1 hour. Do not share this code.`
};

module.exports = { sendSMS, SMS_TEMPLATES };
