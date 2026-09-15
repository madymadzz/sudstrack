// Order status pipeline (in sequence)
const ORDER_STATUSES = [
    'Received',
    'Washing',
    'Drying',
    'Ready for Delivery',
    'Out for Delivery',
    'Completed',
    'Cancelled'
];

// User roles
const ROLES = {
    CUSTOMER: 'Customer',
    STAFF: 'Staff',
    SUPER_ADMIN: 'SuperAdmin'
};

// Auth providers
const AUTH_PROVIDERS = {
    LOCAL: 'Local',
    GOOGLE: 'Google'
};

// Payment methods
const PAYMENT_METHODS = {
    CASH: 'Cash',
    ONLINE: 'Online'
};

// Payment statuses
const PAYMENT_STATUSES = {
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded'
};

// Login security
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_LOCKOUT_MINUTES = 5;

// Password reset
const RESET_TOKEN_EXPIRY_HOURS = 1;

// API log severity levels
const API_LOG_SEVERITY = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    CRITICAL: 'Critical'
};

// Load sizes and base prices
const LOAD_SIZES = {
    Small:  { label: 'Small (up to 3kg)',  price: 150 },
    Medium: { label: 'Medium (4–7kg)',     price: 250 },
    Large:  { label: 'Large (8–12kg)',     price: 350 }
};

// Shop coordinates (Cubao / TIP QC area) for simulated rider tracking
const SHOP_COORDINATES = {
    lat: 14.6256536,
    lng: 121.0619890
};

module.exports = {
    ORDER_STATUSES,
    ROLES,
    AUTH_PROVIDERS,
    PAYMENT_METHODS,
    PAYMENT_STATUSES,
    LOGIN_MAX_ATTEMPTS,
    LOGIN_LOCKOUT_MINUTES,
    RESET_TOKEN_EXPIRY_HOURS,
    API_LOG_SEVERITY,
    LOAD_SIZES,
    SHOP_COORDINATES
};
