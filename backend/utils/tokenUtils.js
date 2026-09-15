const jwt = require('jsonwebtoken');

/**
 * Sign a JWT token for a given account
 */
const signToken = (accountId, role) => {
    return jwt.sign(
        { accountId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * Verify a JWT token and return the payload
 */
const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Set JWT as an httpOnly cookie on the response
 */
const setTokenCookie = (res, token) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('sudstrack_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
    });
};

/**
 * Clear the JWT cookie
 */
const clearTokenCookie = (res) => {
    res.clearCookie('sudstrack_token', {
        httpOnly: true,
        sameSite: 'Lax'
    });
};

module.exports = { signToken, verifyToken, setTokenCookie, clearTokenCookie };
