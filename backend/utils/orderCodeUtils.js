const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique order code in the format: SD-XXXX
 * e.g. SD-4F2A, SD-9C31
 */
const generateOrderCode = () => {
    const part = uuidv4().replace(/-/g, '').toUpperCase().substring(0, 4);
    return `SD-${part}`;
};

module.exports = { generateOrderCode };
