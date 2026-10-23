const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
];

const MIME_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates and safely persists payment proof file.
 * Returns relative path or fallback dataURI.
 */
function savePaymentProof(dataUri, orderCode = '') {
    if (!dataUri || typeof dataUri !== 'string') return null;

    // Check data URI structure
    const match = dataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!match) {
        // If it's already a saved URL, return as-is
        if (dataUri.startsWith('/uploads/') || dataUri.startsWith('http://') || dataUri.startsWith('https://')) {
            return dataUri;
        }
        throw new Error('Invalid file format. Upload must be a valid base64 image or PDF data URI.');
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new Error('Unsupported file type. Only JPG, PNG, WEBP, and PDF files are accepted.');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error('File exceeds maximum allowed size of 5MB.');
    }

    try {
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'proofs');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = MIME_EXTENSIONS[mimeType] || '.bin';
        const cleanCode = (orderCode || 'order').replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `proof_${cleanCode}_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, buffer);
        return `/uploads/proofs/${filename}`;
    } catch (err) {
        console.warn('[UploadUtils] Could not write file to disk (likely serverless). Storing data URI fallback:', err.message);
        // Fallback for Vercel / serverless: return full data URI so proof is never lost
        return dataUri;
    }
}

module.exports = {
    savePaymentProof,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE
};
