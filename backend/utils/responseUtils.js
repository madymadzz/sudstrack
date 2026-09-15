/**
 * Send a standard success response
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    return res.status(statusCode).json(response);
};

/**
 * Send a standard error response
 */
const sendError = (res, statusCode = 500, message = 'Something went wrong', errors = null) => {
    const response = { success: false, message };
    if (errors !== null) response.errors = errors;
    return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError };
