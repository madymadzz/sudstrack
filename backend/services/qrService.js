const axios = require("axios");
const { logAPIEvent } = require("./apiLogger");
const { API_LOG_SEVERITY } = require("../config/constants");

const QR_BASE_URL = process.env.QR_API_BASE_URL || "https://api.qrserver.com/v1/create-qr-code";

/**
 * Generate a QR code image URL for a given order code
 * Uses api.qrserver.com (free, no key needed)
 * Returns a direct image URL string
 */
const generateQRCodeURL = async (orderCode, size = 200) => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            attempt++;

            // If the value is already a full URL (e.g. otpauth:// for 2FA), use it directly.
            // Otherwise prefix it as a SudsTrack order code.
            const qrData = orderCode.startsWith("otpauth://") || orderCode.startsWith("http")
                ? orderCode
                : `SUDSTRACK-ORDER:${orderCode}`;

            const qrURL = `${QR_BASE_URL}?size=${size}x${size}&data=${encodeURIComponent(qrData)}&color=1a2e4a&bgcolor=ffffff&margin=10`;

            // Verify the API is reachable by making a HEAD request
            await axios.head(qrURL, { timeout: 5000 });

            await logAPIEvent({
                api_name: "QRServer",
                endpoint: "/create-qr-code",
                error_type: null,
                error_message: null,
                retry_count: attempt - 1,
                recovered: true,
                severity: API_LOG_SEVERITY.LOW
            });

            return qrURL;

        } catch (err) {
            console.error(`[QRService] Attempt ${attempt} failed:`, err.message);

            if (attempt >= MAX_RETRIES) {
                await logAPIEvent({
                    api_name: "QRServer",
                    endpoint: "/create-qr-code",
                    error_type: err.code || "REQUEST_FAILED",
                    error_message: err.message,
                    retry_count: attempt,
                    recovered: false,
                    severity: API_LOG_SEVERITY.MEDIUM
                });

                // Fallback: return null so the system can handle it gracefully
                return null;
            }

            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
};

module.exports = { generateQRCodeURL };
