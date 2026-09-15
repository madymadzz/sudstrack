/**
 * SudsTrack API Client
 * Central module for all backend communication.
 * Replaces SudsAuth localStorage layer.
 */

const API_BASE = (() => {
    // On Vercel (or any non-localhost host), use the same host as the frontend
    const host = window.location.hostname;
    if (host === "127.0.0.1" || host === "localhost") {
        return "http://127.0.0.1:3000/api";
    }
    return `${window.location.origin}/api`;
})();

/**
 * Core fetch wrapper — handles credentials, JSON, and error responses
 */
async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",           // Send httpOnly cookie
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
    });

    const data = await res.json();

    if (!res.ok) {
        const err = new Error(data.message || "Request failed");
        err.status  = res.status;
        err.data    = data;
        throw err;
    }

    return data;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

const Auth = {
    async login(email, password) {
        return apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    },

    async register(full_name, email, password) {
        return apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({ full_name, email, password })
        });
    },

    async adminLogin(email, password) {
        return apiFetch("/auth/admin-login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    },

    async logout() {
        return apiFetch("/auth/logout", { method: "POST" });
    },

    async getMe() {
        return apiFetch("/auth/me");
    },

    async checkEmail(email) {
        return apiFetch("/auth/check-email", {
            method: "POST",
            body: JSON.stringify({ email })
        });
    },

    async forgotPassword(email) {
        return apiFetch("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email })
        });
    },

    async resetPassword(token, newPassword) {
        return apiFetch("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token, newPassword })
        });
    },

    loginWithGoogle() {
        window.location.href = `${API_BASE}/auth/google`;
    }
};

// ─── ACCOUNT ──────────────────────────────────────────────────────────────────

const Account = {
    async updateProfile(contact_number, address) {
        return apiFetch("/account/profile", {
            method: "PUT",
            body: JSON.stringify({ contact_number, address })
        });
    },

    async changePassword(current_password, new_password) {
        return apiFetch("/account/change-password", {
            method: "POST",
            body: JSON.stringify({ current_password, new_password })
        });
    },

    async setup2FA() {
        return apiFetch("/account/2fa/setup", { method: "POST" });
    },

    async verify2FA(token) {
        return apiFetch("/account/2fa/verify", {
            method: "POST",
            body: JSON.stringify({ token })
        });
    },

    async disable2FA() {
        return apiFetch("/account/2fa/disable", { method: "POST" });
    },

    async uploadProfilePicture(imageDataURI) {
        return apiFetch("/account/profile-picture", {
            method: "POST",
            body: JSON.stringify({ image: imageDataURI })
        });
    }
};

// ─── PACKAGES ─────────────────────────────────────────────────────────────────

const Packages = {
    async getAll() {
        return apiFetch("/packages");
    },

    async getById(id) {
        return apiFetch(`/packages/${id}`);
    }
};

// ─── ORDERS ───────────────────────────────────────────────────────────────────

const Orders = {
    async create(orderData) {
        return apiFetch("/orders", {
            method: "POST",
            body: JSON.stringify(orderData)
        });
    },

    async getMyOrders() {
        return apiFetch("/orders/my");
    },

    async getSavedOrders() {
        return apiFetch("/orders/saved");
    },

    async saveOrder(id) {
        return apiFetch(`/orders/${id}/save`, { method: "POST" });
    },

    async unsaveOrder(id) {
        return apiFetch(`/orders/${id}/save`, { method: "DELETE" });
    },

    async getQR(id) {
        return apiFetch(`/orders/${id}/qr`);
    },

    async getTracking(id) {
        return apiFetch(`/orders/${id}/tracking`);
    }
};

// ─── WEATHER ──────────────────────────────────────────────────────────────────

const Weather = {
    async check(pickup_date, order_id = null) {
        return apiFetch("/weather/check", {
            method: "POST",
            body: JSON.stringify({ pickup_date, order_id })
        });
    }
};

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────

const Feedback = {
    async submit(order_id, rating, comment) {
        return apiFetch("/feedback", {
            method: "POST",
            body: JSON.stringify({ order_id, rating, comment })
        });
    }
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

const Admin = {
    async getStats() {
        return apiFetch("/admin/stats");
    },

    async getOrders(search = "", status = "") {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (status) params.set("status", status);
        return apiFetch(`/admin/orders?${params}`);
    },

    async updateOrderStatus(id, status, rider_name) {
        return apiFetch(`/admin/orders/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status, rider_name })
        });
    },

    async cancelOrder(id) {
        return apiFetch(`/admin/orders/${id}/cancel`, { method: "PUT" });
    },

    async getCustomers(search = "") {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        return apiFetch(`/admin/customers?${params}`);
    },

    async editCustomer(id, data) {
        return apiFetch(`/admin/customers/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        });
    },

    async toggleCustomerBan(id) {
        return apiFetch(`/admin/customers/${id}/ban`, { method: "PUT" });
    },

    async deleteCustomer(id) {
        return apiFetch(`/admin/customers/${id}`, { method: "DELETE" });
    },

    async getStaff() {
        return apiFetch("/admin/staff");
    },

    async addStaff(full_name, email, password) {
        return apiFetch("/admin/staff", {
            method: "POST",
            body: JSON.stringify({ full_name, email, password })
        });
    },

    async deleteStaff(id) {
        return apiFetch(`/admin/staff/${id}`, { method: "DELETE" });
    }
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Check if the user is logged in — returns user object or null
 */
async function getCurrentUser() {
    try {
        const res = await Auth.getMe();
        return res.data;
    } catch {
        return null;
    }
}

/**
 * Status badge CSS class helper
 */
function statusClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("cancel"))  return "status-cancelled";
    if (s.includes("ready"))   return "status-ready";
    if (s.includes("complet")) return "status-completed";
    if (s.includes("wash"))    return "status-washing";
    if (s.includes("dry"))     return "status-drying";
    if (s.includes("out"))     return "status-out";
    return "status-received";
}

/**
 * Format a datetime string for display
 */
function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
         + " · "
         + d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Show a toast/notification message
 */
function showToast(message, type = "success") {
    let toast = document.getElementById("sudsToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "sudsToast";
        toast.style.cssText = `
            position:fixed;bottom:24px;right:24px;z-index:9999;
            padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;
            color:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.2);
            transition:opacity 0.3s;opacity:0;pointer-events:none;max-width:320px;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = type === "error" ? "#dc2626" : type === "warning" ? "#d97706" : "#16a34a";
    toast.style.opacity = "1";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = "0"; }, 3500);
}

/**
 * Redirect to login if not authenticated
 */
async function requireAuth(redirectUrl) {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = redirectUrl || "/pages/auth/login.html?redirect=" + encodeURIComponent(window.location.pathname);
        return null;
    }
    return user;
}


// --- Mobile Menu Toggle ---
document.addEventListener("DOMContentLoaded", () => {
    const navToggle = document.getElementById("navToggle");
    const navMenu = document.getElementById("navMenu");
    
    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
            const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
            navToggle.setAttribute("aria-expanded", !isExpanded);
            navToggle.classList.toggle("open");
            navMenu.classList.toggle("open");
        });
    }
});
