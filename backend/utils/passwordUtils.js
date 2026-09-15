const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password
 */
const hashPassword = async (plainPassword) => {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a plain-text password against a stored hash
 */
const comparePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = { hashPassword, comparePassword };
