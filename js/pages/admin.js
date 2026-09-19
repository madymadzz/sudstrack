// SudsTrack Admin Dashboard — connected to real backend API

const adminGate    = document.getElementById("adminGate");
const adminApp     = document.getElementById("adminApp");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminRolePill  = document.getElementById("adminRolePill");
let currentAdmin     = null;
let adminAppReady    = false;

function markInvalid(fieldId, msg) {
    const field = document.getElementById(fieldId);
    field.classList.add("invalid");
    const err = field.querySelector(".field-error");
    if (err && msg) err.textContent = msg;
}
function clearInvalid(fieldId) {
    document.getElementById(fieldId).classList.remove("invalid");
}

async function init() {
    try {
        const res = await Auth.getMe();
        currentAdmin = res.data;

        if (!currentAdmin || (currentAdmin.role !== "Staff" && currentAdmin.role !== "SuperAdmin")) {
            showAdminGate();
            return;
        }

        showAdminApp();
    } catch {
        showAdminGate();
    }
}

function showAdminApp() {
    adminGate.style.display  = "none";
    adminApp.style.display   = "flex";
    if (adminLogoutBtn) adminLogoutBtn.style.display = "inline-block";
    const notifBtn = document.getElementById("notifBtn");
    if (notifBtn) notifBtn.style.display = "block";
    loadNotifications();
    setInterval(loadNotifications, 10000);

    if (adminRolePill && currentAdmin) {
        adminRolePill.textContent = `${currentAdmin.role} — ${currentAdmin.full_name}`;
        adminRolePill.style.display = "inline-block";
    }

    // Sidebar user info
    const sidebarUserNameEl = document.getElementById("sidebarUserName");
    const sidebarUserRoleEl = document.getElementById("sidebarUserRole");
    const sidebarAvatarEl   = document.getElementById("sidebarAvatar");
    if (sidebarUserNameEl && currentAdmin) sidebarUserNameEl.textContent = currentAdmin.full_name || "Staff";
    if (sidebarUserRoleEl && currentAdmin) sidebarUserRoleEl.textContent = currentAdmin.role || "Staff";
    if (sidebarAvatarEl && currentAdmin) {
        sidebarAvatarEl.src = currentAdmin.profile_picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(currentAdmin.full_name || "S")}&background=2e4c6e&color=ffffff`;
    }

    
    const staffTabBtn = document.getElementById("staffTabBtn");
    const auditTabBtn = document.getElementById("auditTabBtn");
    const chatLogsTabBtn = document.getElementById("chatLogsTabBtn");
    const promosTabBtn = document.getElementById("promosTabBtn");
    const settingsTabBtn = document.getElementById("settingsTabBtn");
    const packagesTabBtn = document.getElementById("packagesTabBtn");
    
    if (staffTabBtn) staffTabBtn.style.display = currentAdmin.role === "SuperAdmin" ? "flex" : "none";
    if (auditTabBtn) auditTabBtn.style.display = currentAdmin.role === "SuperAdmin" ? "flex" : "none";
    if (chatLogsTabBtn) chatLogsTabBtn.style.display = currentAdmin.role === "SuperAdmin" ? "flex" : "none";
    if (promosTabBtn) promosTabBtn.style.display = currentAdmin.role === "SuperAdmin" ? "inline-block" : "none";
    const wa = document.getElementById("wipeAuditBtn"); if(wa) wa.style.display = currentAdmin.role==="SuperAdmin" ? "block" : "none";
        const wc = document.getElementById("wipeChatLogsBtn"); if(wc) wc.style.display = currentAdmin.role==="SuperAdmin" ? "block" : "none";
        if (settingsTabBtn) settingsTabBtn.style.display = currentAdmin.role === "SuperAdmin" ? "flex" : "none";
    if (packagesTabBtn) packagesTabBtn.style.display = currentAdmin.role === "SuperAdmin" ? "flex" : "none";
    const adminSectionLabel = document.getElementById("adminSectionLabel");
    if (adminSectionLabel) adminSectionLabel.style.display = currentAdmin.role === "SuperAdmin" ? "block" : "none";


    if (!adminAppReady) {
        adminAppReady = true;
        initAdminApp();
    }
}

function showAdminGate() {
    adminGate.style.display  = "block";
    adminApp.style.display   = "none";
    if (adminLogoutBtn) adminLogoutBtn.style.display = "none";
    if (adminRolePill)  adminRolePill.style.display  = "none";
}

// ---- Admin login ----
document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email    = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;
    const btn      = e.target.querySelector("[type=submit]");

    btn.disabled = true; btn.textContent = "Logging in…";

    try {
        const res    = await Auth.adminLogin(email, password);
        currentAdmin = res.data;
        clearInvalid("adminEmailField");
        clearInvalid("adminPasswordField");
        showAdminApp();
    } catch (err) {
        markInvalid("adminEmailField",    " ");
        markInvalid("adminPasswordField", err.message || "Invalid credentials.");
    } finally {
        btn.disabled = false; btn.textContent = "Log in";
    }
});

// ---- Admin logout ----
if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", async () => {
        try { await Auth.logout(); } catch {}
        currentAdmin = null;
        window.location.reload();
    });
}

const STATUS_STAGES = ["Received","Washing","Drying","Ready for Delivery","Out for Delivery","Completed","Cancelled"];


function initAdminApp() {

    // ---- Stats ----
    async function renderStats() {
        try {
            const res   = await Admin.getStats();
            const stats = res.data;
            document.getElementById("adminStats").innerHTML = `
                <div class="admin-stat-card"><h2>${stats.daily_orders}</h2><p>Today's orders</p></div>
                <div class="admin-stat-card"><h2>${stats.pending_orders}</h2><p>Active orders</p></div>
                <div class="admin-stat-card"><h2>${stats.completed_orders}</h2><p>Completed</p></div>
                <div class="admin-stat-card"><h2>${stats.total_customers}</h2><p>Customers</p></div>
                <div class="admin-stat-card" style="grid-column:1/-1;"><h2>₱${(stats.total_revenue || 0).toLocaleString()}</h2><p>Total revenue (paid)</p></div>
            `;
        } catch (err) {
            console.error("Stats error:", err.message);
        }
    }

    // ---- Orders ----
    const orderSearch  = document.getElementById("orderSearch");
    const statusFilter = document.getElementById("statusFilter");

    function orderCardHTML(order) {
        const isCancelled = order.status === "Cancelled";
        const isSuper     = currentAdmin.role === "SuperAdmin";

        const stageOptions = STATUS_STAGES.map(s =>
            `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`
        ).join("");

        return `
        <div class="admin-card">
            <div class="admin-card-top">
                <span class="admin-card-code">#${order.order_code}</span>
                <span class="status-badge ${statusClass(order.status)}">${order.status}</span>
            </div>
            <div class="admin-grid">
                <span>Customer</span><span>${order.full_name || "—"}</span>
                <span>Contact</span><span>${order.contact_number || "—"}</span>
                <span>Package</span><span>${order.package_name || "—"}</span>
                <span>Load size</span><span>${order.load_size || "—"}</span>
                <span>Pickup</span><span>${formatDateTime(order.pickup_slot)}</span>
                <span>Delivery</span><span>${formatDateTime(order.delivery_slot)}</span>
                <span>Payment</span><span>${order.payment_method || "—"} · ${order.payment_status || "—"}</span>
                <span>Total</span><span>₱${order.amount || "—"}</span>
            </div>
            <div class="admin-card-actions">
                <select class="admin-stage-select" data-order-id="${order.order_id}" ${isCancelled ? "disabled" : ""}>
                    ${stageOptions}
                </select>
                <input type="text" class="admin-rider-input" placeholder="Rider name (optional)" data-rider-for="${order.order_id}" value="${order.rider_name || ""}" style="padding:6px 10px;border-radius:6px;border:1px solid #ddd;font-size:13px;">
                <button type="button" class="admin-btn" data-claim="${order.order_id}" data-qr-url="${order.claim_qr_code || ""}">View claim QR</button>
                <button type="button" class="admin-btn" onclick="printInvoice(${JSON.stringify(order).replace(/"/g, '&quot;')})"><i class="ph ph-printer"></i> Invoice</button>
                ${(["Ready for Delivery", "Out for Delivery"].includes(order.status)) ? `<button type="button" class="admin-btn" data-track="${order.order_id}" style="background-color:#10b981;color:#fff;"><i class="ph ph-map-pin"></i> Track Rider</button>` : ""}
                ${!isCancelled ? `<button type="button" class="admin-btn admin-btn-warn" data-cancel-order="${order.order_id}">Cancel</button>` : ""}
            </div>
            <div class="order-qr-panel" id="admin-qr-${order.order_id}" style="display:none;"></div>
            <div class="order-track-panel" id="admin-track-${order.order_id}" style="display:none; margin-top:12px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;"></div>
        </div>`;
    }

    async function renderOrders() {
        const search = orderSearch ? orderSearch.value.trim() : "";
        const status = statusFilter ? statusFilter.value : "";
        try {
            const res    = await Admin.getOrders(search, status);
            const orders = res.data || [];
            const list   = document.getElementById("ordersList");

            if (orders.length === 0) {
                list.innerHTML = `<div class="empty-state">No orders match this view.</div>`;
                return;
            }

            list.innerHTML = orders.map(orderCardHTML).join("");
            attachOrderListeners(list);
        } catch (err) {
            console.error("Orders error:", err.message);
        }
    }

    function attachOrderListeners(list) {
        list.querySelectorAll(".admin-stage-select").forEach(sel => {
            sel.addEventListener("change", async () => {
                const id       = sel.dataset.orderId;
                const riderInput = list.querySelector(`[data-rider-for="${id}"]`);
                const rider    = riderInput ? riderInput.value.trim() : "";
                try {
                    await Admin.updateOrderStatus(id, sel.value, rider);
                    showToast(`Order status updated to "${sel.value}"`);
                    renderStats();
                } catch (err) {
                    showToast(err.message, "error");
                }
            });
        });

        
        // Track Rider
        list.querySelectorAll("[data-track]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id    = btn.dataset.track;
                const panel = document.getElementById(`admin-track-${id}`);
                if (panel.style.display !== "none") { panel.style.display = "none"; return; }
                panel.style.display = "block";
                panel.innerHTML = `<p class="order-tool-loading" style="font-size:13px; color:#64748b;">Loading tracking data...</p>`;

                try {
                    const res   = await apiFetch(`/orders/${id}/tracking`);
                    const track = res.data;

                    if (!track.map_data) {
                        panel.innerHTML = `<p style="font-size:13px; color:#dc2626;">Map route not available for this address.</p>`;
                        return;
                    }

                    const m = track.map_data;
                    panel.innerHTML = `
                        <div style="font-size:13px; color:#1e293b; margin-bottom:8px; display:flex; justify-content:space-between;">
                            <div>
                                <p style="margin:0 0 4px;"><strong>Rider:</strong> ${track.rider_name || "On the way"}</p>
                                <p style="margin:0;"><strong>Destination:</strong> ${m.deliveryAddress}</p>
                            </div>
                            <div style="text-align:right;">
                                <p style="margin:0 0 4px;"><strong>ETA:</strong> ${m.duration}</p>
                                <p style="margin:0;"><strong>Distance:</strong> ${m.distance}</p>
                            </div>
                        </div>
                        <iframe
                            width="100%" height="250" style="border:0;border-radius:8px;"
                            loading="lazy" allowfullscreen
                            src="https://maps.google.com/maps?saddr=${m.shopCoords.lat},${m.shopCoords.lng}&daddr=${encodeURIComponent(m.deliveryAddress)}&output=embed">
                        </iframe>
                    `;
                } catch (err) {
                    panel.innerHTML = `<p style="color:#dc2626;font-size:13px;">Could not load tracking map.</p>`;
                }
            });
        });

        list.querySelectorAll("[data-cancel-order]").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm(`Cancel this order? The customer will see it as Cancelled.`)) return;
                try {
                    await Admin.cancelOrder(btn.dataset.cancelOrder);
                    showToast("Order cancelled.");
                    renderOrders();
                    renderStats();
                } catch (err) {
                    showToast(err.message, "error");
                }
            });
        });

        list.querySelectorAll("[data-claim]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id    = btn.dataset.claim;
                const panel = document.getElementById(`admin-qr-${id}`);
                if (panel.style.display !== "none") { panel.style.display = "none"; return; }
                panel.style.display = "flex";

                const qrUrl = btn.dataset.qrUrl;
                if (qrUrl) {
                    panel.innerHTML = `<img src="${qrUrl}" alt="Claim QR" style="width:80px;height:80px;">`;
                    return;
                }
                panel.innerHTML = `<p class="order-tool-loading">Loading QR…</p>`;
                try {
                    const res = await Orders.getQR(id);
                    panel.innerHTML = `<img src="${res.data.qr_code_url}" alt="Claim QR" style="width:80px;height:80px;">`;
                } catch {
                    panel.innerHTML = `<p style="color:#dc2626;font-size:13px;">Could not load QR.</p>`;
                }
            });
        });
    }

    if (orderSearch)  orderSearch.addEventListener("input",  renderOrders);
    if (statusFilter) statusFilter.addEventListener("change", renderOrders);

    // ---- Customers ----
    const customerSearch = document.getElementById("customerSearch");

    function customerCardHTML(c) {
        const pic = c.profile_picture || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(c.full_name || "Customer") + "&background=e2e8f0&color=475569");
        return `
        <div class="admin-card">
            <div class="admin-card-top">
                <div class="customer-top">
                    <img src="${pic}" alt="Avatar" class="avatar" style="object-fit:cover; border-radius:12px; ${!c.is_active ? 'opacity:0.5;' : ''}">
                    <div>
                        <div class="customer-name" style="${!c.is_active ? 'text-decoration:line-through;color:#94a3b8;' : ''}">${c.full_name || "-"}</div>
                        <div class="customer-email">${c.email || "-"}</div>
                    </div>
                </div>
                <span class="status-badge">${c.total_orders} order${c.total_orders == 1 ? "" : "s"}</span>
            </div>
            <div class="admin-grid">
                <span>Contact</span><span>${c.contact_number || "-"}</span>
                <span>Address</span><span>${c.address || "-"}</span>
                <span>Status</span><span style="font-weight:600; color:${c.is_active ? '#16a34a' : '#dc2626'}">${c.is_active ? 'Active' : 'Banned'}</span>
                <span>Joined</span><span>${formatDateTime(c.created_at)}</span>
            </div>
            ${currentAdmin.role === "SuperAdmin" ? `
            <div class="admin-card-actions">
                <button type="button" class="admin-btn admin-btn-danger" data-toggle-ban="${c.account_id}">${c.is_active ? "Ban User" : "Unban User"}</button>
                <button type="button" class="admin-btn admin-btn-danger" data-delete-customer="${c.account_id}" style="background:transparent; color:#dc2626; border:1px solid #fca5a5;">Delete</button>
            </div>
            ` : ""}
        </div>`;
    }

    async function renderCustomers() {
        const search = customerSearch ? customerSearch.value.trim() : "";
        try {
            const res   = await Admin.getCustomers(search);
            const users = res.data || [];
            const list  = document.getElementById("customersList");
            list.innerHTML = users.length === 0
                ? `<div class="empty-state">No customers found.</div>`
                : users.map(customerCardHTML).join("");

            // Wire up SuperAdmin actions
            if (currentAdmin.role === "SuperAdmin") {
                list.querySelectorAll("[data-toggle-ban]").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        const isBan = btn.textContent.includes("Ban");
                        if (!confirm(`Are you sure you want to ${isBan ? 'ban' : 'unban'} this user?`)) return;
                        try {
                            const res = await Admin.toggleCustomerBan(btn.dataset.toggleBan);
                            showToast(res.message);
                            renderCustomers();
                        } catch (err) {
                            showToast(err.message, "error");
                        }
                    });
                });

                list.querySelectorAll("[data-delete-customer]").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        if (!confirm("Are you absolutely sure you want to DELETE this user? This cannot be undone.")) return;
                        try {
                            const res = await Admin.deleteCustomer(btn.dataset.deleteCustomer);
                            showToast(res.message);
                            renderCustomers();
                        } catch (err) {
                            showToast(err.message, "error");
                        }
                    });
                });
            }
        } catch (err) {
            console.error("Customers error:", err.message);
        }
    }

    if (customerSearch) customerSearch.addEventListener("input", renderCustomers);

    // ---- Staff (SuperAdmin only) ----
    const addStaffForm = document.getElementById("addStaffForm");

    function staffCardHTML(s) {
        const pic = s.profile_picture || ("https://ui-avatars.com/api/?name=" + encodeURIComponent(s.full_name || "Staff") + "&background=e2e8f0&color=475569");
        return `
        <div class="admin-card">
            <div class="admin-card-top">
                <div class="customer-top">
                    <img src="${pic}" alt="Avatar" class="avatar" style="object-fit:cover; border-radius:12px; width:40px; height:40px;">
                    <div>
                        <div class="customer-name">${s.full_name || "-"}</div>
                        <div class="customer-email">${s.email || "-"}</div>
                    </div>
                </div>
                <span class="status-badge">${s.role}</span>
            </div>
            <div class="admin-card-actions">
                <button type="button" class="admin-btn admin-btn-danger" data-delete-staff="${s.account_id}">Remove</button>
            </div>
        </div>`;
    }

    async function renderStaff() {
        const list = document.getElementById("staffList");
        if (!list) return;

        if (currentAdmin.role !== "SuperAdmin") {
            list.innerHTML = `<div class="empty-state">Staff accounts are managed by the Super Admin.</div>`;
            return;
        }

        try {
            const res   = await Admin.getStaff();
            const staff = (res.data || []).filter(s => s.role === "Staff");
            list.innerHTML = staff.length === 0
                ? `<div class="empty-state">No staff accounts yet. Add one above.</div>`
                : staff.map(staffCardHTML).join("");

            list.querySelectorAll("[data-delete-staff]").forEach(btn => {
                btn.addEventListener("click", async () => {
                    if (!confirm("Remove this staff account? This cannot be undone.")) return;
                    try {
                        await Admin.deleteStaff(btn.dataset.deleteStaff);
                        showToast("Staff account removed.");
                        renderStaff();
                    } catch (err) {
                        showToast(err.message, "error");
                    }
                });
            });
        } catch (err) {
            list.innerHTML = `<div class="empty-state">Could not load staff.</div>`;
        }
    }

    if (addStaffForm) {
        addStaffForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (currentAdmin.role !== "SuperAdmin") return;

            const name     = document.getElementById("staffName").value.trim();
            const email    = document.getElementById("staffEmail").value.trim();
            const password = document.getElementById("staffPassword").value;
            const btn      = addStaffForm.querySelector("[type=submit]");

            let valid = true;
            if (!name)  { markInvalid("staffNameField", "Name is required.");     valid = false; } else clearInvalid("staffNameField");
            if (!email || !email.includes("@")) { markInvalid("staffEmailField", "Valid email required."); valid = false; } else clearInvalid("staffEmailField");
            if (!password || password.length < 6) { markInvalid("staffPasswordField", "Min 6 characters."); valid = false; } else clearInvalid("staffPasswordField");
            if (!valid) return;

            btn.disabled = true; btn.textContent = "Adding…";
            try {
                await Admin.addStaff(name, email, password);
                showToast("Staff account created.");
                addStaffForm.reset();
                renderStaff();
            } catch (err) {
                if (err.status === 409) markInvalid("staffEmailField", "That email is already in use.");
                else showToast(err.message, "error");
            } finally {
                btn.disabled = false; btn.textContent = "Add staff";
            }
        });
    }

    // ---- Tabs ----
    let analyticsLoaded = false;
    document.querySelectorAll(".sidebar-btn[data-tab]").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-btn[data-tab]").forEach(t => t.classList.toggle("active", t === tab));
            const name = tab.dataset.tab;
            document.querySelectorAll(".admin-panel").forEach(p => {
                p.style.display = p.dataset.panel === name ? "block" : "none";
            });
            if (name === "dashboard")  renderStats();
            if (name === "riders")    renderRiders();
            if (name === "feedback")  renderFeedback();
            if (name === "promotions") loadPromotions();
            if (name === "audit")     loadAuditLogs();
            if (name === "chat-logs") loadChatLogs();
            if (name === "packages") loadPackagesAdmin();
            if (name === "settings")  loadSettings();
            if (name === "chat")      loadChatRooms();
            if (name === "staff-chat") loadStaffChat();
            if (name === "profile")   loadAdminProfile();
            if (name === "analytics" && !analyticsLoaded) { loadAnalytics(); analyticsLoaded = true; }
        });
    });

    // ---- Initial load ----
    renderStats();
    renderOrders();
    renderCustomers();
    renderStaff();
    // Ensure dashboard panel is shown on first load
    document.querySelectorAll(".admin-panel").forEach(p => {
        p.style.display = p.dataset.panel === "dashboard" ? "block" : "none";
    });
    const dashBtn = document.querySelector(".sidebar-btn[data-tab='dashboard']");
    if (dashBtn) {
        document.querySelectorAll(".sidebar-btn[data-tab]").forEach(t => t.classList.remove("active"));
        dashBtn.classList.add("active");
    }
    setupRidersTab();

    // Refresh every 20s
    setInterval(() => { renderStats(); renderOrders(); }, 20000);

    // ---- QR Scanner Logic ----
    const openScannerBtn = document.getElementById("openScannerBtn");
    const closeScannerBtn = document.getElementById("closeScannerBtn");
    const qrScannerModal = document.getElementById("qrScannerModal");
    const qrResult = document.getElementById("qr-result");
    let html5QrcodeScanner = null;

    if (openScannerBtn) {
        openScannerBtn.addEventListener("click", () => {
            qrScannerModal.style.display = "flex";
            qrResult.textContent = "";

            if (!html5QrcodeScanner) {
                html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
            }

            html5QrcodeScanner.render(async (decodedText, decodedResult) => {
                // Success callback
                html5QrcodeScanner.clear();
                qrResult.textContent = `Found: ${decodedText}. Searching...`;
                
                // Remove prefix if exists
                let orderCode = decodedText;
                if (orderCode.startsWith("SUDSTRACK-ORDER:")) {
                    orderCode = orderCode.replace("SUDSTRACK-ORDER:", "");
                }

                try {
                    // Try to filter the orders table by this order code
                    document.getElementById("orderSearch").value = orderCode;
                    await renderOrders();
                    
                    const orderRes = await apiFetch(`/admin/orders?search=${encodeURIComponent(orderCode)}`);
                    const orders = orderRes.data || [];
                    
                    if (orders.length > 0) {
                        const targetOrder = orders[0];
                        qrResult.textContent = `Order ${orderCode} found! Prompting for completion...`;
                        setTimeout(() => { qrScannerModal.style.display = "none"; }, 500);
                        
                        showConfirmModal("Mark as Completed?", `You scanned the claim QR for Order #${orderCode} (${targetOrder.full_name}). Do you want to mark this order as 'Completed'?`, "Yes, Mark Completed", async () => {
                            try {
                                await apiFetch(`/admin/orders/${targetOrder.order_id}/status`, {
                                    method: "PUT",
                                    body: JSON.stringify({ status: "Completed", rider_name: targetOrder.rider_name || "" })
                                });
                                showToast(`Order #${orderCode} marked as Completed.`, "success");
                                await renderOrders();
                            } catch(err) {
                                showToast(err.message, "error");
                            }
                        });
                    } else {
                        qrResult.textContent = `Order ${orderCode} not found in database.`;
                        setTimeout(() => { qrScannerModal.style.display = "none"; }, 1500);
                    }
                } catch (err) {
                    qrResult.textContent = `Error processing scan.`;
                }
            }, (errorMessage) => {
                // Ignore parsing errors while scanning empty space
            });
        });
    }

    if (closeScannerBtn) {
        closeScannerBtn.addEventListener("click", () => {
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear();
            }
            qrScannerModal.style.display = "none";
        });
    }
}

// ─── RIDERS ─────────────────────────────────────────────────────────────────

async function renderRiders() {
    const list = document.getElementById("ridersList");
    if (!list) return;
    list.innerHTML = "<p style='color:#94a3b8;'>Loading riders.</p>";

    // Show/hide Add Rider button based on role
    const addRiderBtn = document.getElementById("addRiderBtn");
    const addRiderFormWrapper = document.getElementById("addRiderForm");
    const isSuperAdmin = currentAdmin && currentAdmin.role === "SuperAdmin";
    if (addRiderBtn) addRiderBtn.style.display = isSuperAdmin ? "inline-block" : "none";
    if (addRiderFormWrapper && !isSuperAdmin) addRiderFormWrapper.style.display = "none";
    
    try {
        const res = await apiFetch("/riders");
        const riders = res.data || [];
        
        if (riders.length === 0) {
            list.innerHTML = "<p style='color:#94a3b8; text-align:center; padding:32px;'>No riders added yet.</p>";
            return;
        }

        list.innerHTML = riders.map(r => {
            const statusColor = r.status === 'Available' ? '#166534' : r.status === 'Occupied' ? '#92400e' : '#6b7280';
            const statusBg = r.status === 'Available' ? '#f0fdf4' : r.status === 'Occupied' ? '#fffbeb' : '#f1f5f9';
            return `
            <div class="admin-order-card" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <div style="width:44px; height:44px; background:#dbeafe; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px;"><i class="ph ph-motorcycle"></i></div>
                    <div>
                        <p style="font-weight:700; color:#1e293b; margin:0 0 4px;">${r.name}</p>
                        <p style="font-size:13px; color:#64748b; margin:0;">${r.phone || 'No phone'} · ${r.vehicle || 'No vehicle info'}</p>
                        ${r.current_order ? `<p style="font-size:12px; color:#3b82f6; margin-top:4px;">Currently on Order #${r.current_order}</p>` : ''}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="background:${statusBg}; color:${statusColor}; font-size:12px; font-weight:700; padding:4px 12px; border-radius:20px;">${r.status}</span>
                    <select onchange="updateRiderStatus(${r.rider_id}, this.value)" style="border:1px solid #e2e8f0; border-radius:8px; padding:5px 8px; font-size:13px;">
                        <option value="Available" ${r.status === 'Available' ? 'selected' : ''}>Available</option>
                        <option value="Occupied" ${r.status === 'Occupied' ? 'selected' : ''}>Occupied</option>
                        <option value="Offline" ${r.status === 'Offline' ? 'selected' : ''}>Offline</option>
                    </select>
                    ${isSuperAdmin ? `<button onclick="deleteRider(${r.rider_id})" class="admin-btn admin-btn-warn" style="padding:5px 12px; font-size:12px;">Remove</button>` : ''}
                </div>
            </div>`;
        }).join("");
    } catch (err) {
        list.innerHTML = `<p style='color:#ef4444;'>Failed to load riders: ${err.message}</p>`;
    }
}

async function updateRiderStatus(riderId, status) {
    try {
        await apiFetch(`/riders/${riderId}`, { method: "PUT", body: JSON.stringify({ status }) });
        renderRiders();
        showToast(`Rider status updated to ${status}.`, "success");
    } catch(err) {
        showToast("Failed to update rider status.", "error");
    }
}

async function deleteRider(riderId) {
    if (!confirm("Remove this rider? They will be unassigned from any current orders.")) return;
    try {
        await apiFetch(`/riders/${riderId}`, { method: "DELETE" });
        renderRiders();
        showToast("Rider removed.", "success");
    } catch(err) {
        showToast("Failed to remove rider.", "error");
    }
}

function setupRidersTab() {
    const addRiderBtn = document.getElementById("addRiderBtn");
    const addRiderForm = document.getElementById("addRiderForm");
    const cancelRiderBtn = document.getElementById("cancelRiderBtn");
    const saveRiderBtn = document.getElementById("saveRiderBtn");
    
    if (!addRiderBtn) return;
    
    addRiderBtn.addEventListener("click", () => { addRiderForm.style.display = "block"; });
    cancelRiderBtn.addEventListener("click", () => { addRiderForm.style.display = "none"; });
    
    saveRiderBtn.addEventListener("click", async () => {
        const name = document.getElementById("riderName").value.trim();
        const phone = document.getElementById("riderPhone").value.trim();
        const vehicle = document.getElementById("riderVehicle").value.trim();
        
        if (!name) { showToast("Rider name is required.", "error"); return; }
        
        saveRiderBtn.disabled = true;
        saveRiderBtn.textContent = "Saving…";
        
        try {
            await apiFetch("/riders", { method: "POST", body: JSON.stringify({ name, phone, vehicle }) });
            addRiderForm.style.display = "none";
            document.getElementById("riderName").value = "";
            document.getElementById("riderPhone").value = "";
            document.getElementById("riderVehicle").value = "";
            renderRiders();
            showToast("Rider added!", "success");
        } catch(err) {
            showToast(err.message || "Failed to add rider.", "error");
        } finally {
            saveRiderBtn.disabled = false;
            saveRiderBtn.textContent = "Save Rider";
        }
    });
}

// ─── FEEDBACK ────────────────────────────────────────────────────────────────

async function renderFeedback() {
    const list = document.getElementById("feedbackList");
    const summary = document.getElementById("feedbackSummary");
    if (!list) return;
    list.innerHTML = "<p style='color:#94a3b8;'>Loading feedback…</p>";
    
    try {
        const res = await apiFetch("/feedback/all");
        const items = res.data || [];
        
        if (items.length === 0) {
            list.innerHTML = "<p style='color:#94a3b8; text-align:center; padding:32px;'>No feedback submitted yet.</p>";
            return;
        }

        // Summary stats
        const avgRating = (items.reduce((s, i) => s + i.rating, 0) / items.length).toFixed(1);
        const stars = "★".repeat(Math.round(avgRating)) + "☆".repeat(5 - Math.round(avgRating));
        if (summary) {
            summary.innerHTML = `
                <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:16px 24px; display:flex; align-items:center; gap:16px;">
                    <div style="font-size:36px; font-weight:900; color:#ea580c;">${avgRating}</div>
                    <div>
                        <div style="color:#f59e0b; font-size:20px; letter-spacing:2px;">${stars}</div>
                        <div style="font-size:13px; color:#78716c; margin-top:2px;">Average from ${items.length} review${items.length !== 1 ? 's' : ''}</div>
                    </div>
                </div>`;
        }

        list.innerHTML = items.map(f => {
            const stars = Array(f.rating).fill(`<i class="ph-fill ph-star" style="color:#fbbf24"></i>`).join("") + Array(5 - f.rating).fill(`<i class="ph ph-star" style="color:#cbd5e1"></i>`).join("");
            const date = new Date(f.submitted_at).toLocaleDateString("en-PH", { year:"numeric", month:"short", day:"numeric" });
            return `
            <div class="admin-order-card" style="border-left:4px solid #f59e0b;">
                <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:8px;">
                    <div>
                        <p style="font-weight:700; color:#1e293b; margin:0 0 2px;">${f.customer_name}</p>
                        <p style="font-size:12px; color:#94a3b8; margin:0;">Order #${f.order_code} · ${date}</p>
                    </div>
                    <div style="font-size:20px; color:#f59e0b; letter-spacing:2px;">${stars}</div>
                </div>
                ${f.comment ? `<p style="margin-top:12px; color:#475569; font-size:14px; line-height:1.6; font-style:italic;">"${f.comment}"</p>` : '<p style="margin-top:12px; color:#94a3b8; font-size:13px; font-style:italic;">No written comment.</p>'}
            </div>`;
        }).join("");
    } catch(err) {
        list.innerHTML = `<p style='color:#ef4444;'>Failed to load feedback: ${err.message}</p>`;
    }
}

// ─── ANALYTICS CHARTS ─────────────────────────────────────────────────────────

const STATUS_COLORS = {
    "Received":          "#3b82f6",
    "Washing":           "#8b5cf6",
    "Drying":            "#06b6d4",
    "Ready for Delivery":"#f59e0b",
    "Out for Delivery":  "#f97316",
    "Completed":         "#10b981",
    "Cancelled":         "#ef4444"
};

let chartInstances = {};

async function loadAnalytics() {
    try {
        const res = await apiFetch("/admin/analytics");
        const d   = res.data;

        // Destroy old charts if navigating back
        Object.values(chartInstances).forEach(c => c.destroy());
        chartInstances = {};

        // 1. Revenue (last 7 days) — Line chart
        chartInstances.revenue = new Chart(document.getElementById("chartRevenue"), {
            type: "line",
            data: {
                labels:   d.revenue_by_day.map(r => r.day),
                datasets: [{
                    label:           "Revenue (₱)",
                    data:            d.revenue_by_day.map(r => parseFloat(r.revenue)),
                    borderColor:     "#6366f1",
                    backgroundColor: "rgba(99,102,241,0.12)",
                    tension:         0.4,
                    fill:            true,
                    pointRadius:     5,
                    pointBackgroundColor: "#6366f1"
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => "₱" + v.toLocaleString() } } } }
        });

        // 2. Orders by status — Doughnut
        const statusLabels = d.orders_by_status.map(s => s.status);
        chartInstances.status = new Chart(document.getElementById("chartStatus"), {
            type: "doughnut",
            data: {
                labels:   statusLabels,
                datasets: [{ data: d.orders_by_status.map(s => parseInt(s.count)), backgroundColor: statusLabels.map(s => STATUS_COLORS[s] || "#94a3b8"), borderWidth: 2 }]
            },
            options: { responsive: true, plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } } }
        });

        // 3. Orders per day — Bar chart
        chartInstances.orders = new Chart(document.getElementById("chartOrders"), {
            type: "bar",
            data: {
                labels:   d.orders_by_day.map(r => r.day),
                datasets: [{ label: "Orders", data: d.orders_by_day.map(r => parseInt(r.count)), backgroundColor: "#818cf8", borderRadius: 6 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });

        // 4. Load size — Horizontal bar
        chartInstances.load = new Chart(document.getElementById("chartLoad"), {
            type: "bar",
            data: {
                labels:   d.orders_by_load.map(r => r.load_size),
                datasets: [{ label: "Orders", data: d.orders_by_load.map(r => parseInt(r.count)), backgroundColor: ["#34d399","#60a5fa","#f472b6"], borderRadius: 6 }]
            },
            options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });

    } catch (err) {
        console.error("[Analytics] Failed:", err.message);
    }
}

// ─── PRINT INVOICE ────────────────────────────────────────────────────────────

function printInvoice(order) {
    const formatDT = dt => dt ? new Date(dt).toLocaleString("en-PH", { dateStyle:"medium", timeStyle:"short" }) : "—";
    const win = window.open("", "_blank", "width=800,height=900");
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice #${order.order_code}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',sans-serif; color:#1e293b; padding:40px; background:#fff; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1a2e4a; padding-bottom:20px; margin-bottom:28px; }
  .brand h1 { font-size:26px; color:#1a2e4a; font-weight:800; }
  .brand p  { font-size:12px; color:#64748b; margin-top:4px; }
  .inv-meta { text-align:right; }
  .inv-meta h2 { font-size:18px; color:#6366f1; font-weight:700; }
  .inv-meta p  { font-size:13px; color:#64748b; margin-top:4px; }
  .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; background:#dbeafe; color:#1d4ed8; margin-top:6px; }
  .section-title { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; margin-top:24px; }
  .grid { display:grid; grid-template-columns:160px 1fr; gap:6px 12px; }
  .grid .k { font-size:13px; color:#64748b; font-weight:600; }
  .grid .v { font-size:13px; color:#1e293b; }
  .price-row { display:flex; justify-content:space-between; padding:12px 0; border-top:1px solid #f1f5f9; }
  .price-row.total { border-top:2px solid #1a2e4a; font-weight:800; font-size:17px; color:#1a2e4a; margin-top:4px; }
  .footer { margin-top:48px; padding-top:20px; border-top:1px solid #e2e8f0; text-align:center; font-size:12px; color:#94a3b8; }
  @media print { body { padding: 24px; } }
</style></head>
<body>
<div class="header">
  <div class="brand"><h1>SudsTrack</h1><p>TIP Quezon City Campus, Aurora Blvd</p><p>sudstrack@gmail.com</p></div>
  <div class="inv-meta"><h2>INVOICE</h2><p>Order #${order.order_code}</p><p>Issued: ${new Date().toLocaleDateString("en-PH",{dateStyle:"long"})}</p><span class="badge">${order.status}</span></div>
</div>

<div class="section-title">Customer Information</div>
<div class="grid">
  <span class="k">Name</span><span class="v">${order.full_name || "—"}</span>
  <span class="k">Email</span><span class="v">${order.email || "—"}</span>
  <span class="k">Contact</span><span class="v">${order.contact_number || "—"}</span>
  <span class="k">Address</span><span class="v">${order.pickup_address || "—"}</span>
</div>

<div class="section-title">Order Details</div>
<div class="grid">
  <span class="k">Package</span><span class="v">${order.package_name || "—"}</span>
  <span class="k">Load Size</span><span class="v">${order.load_size || "—"}</span>
  <span class="k">Pickup Slot</span><span class="v">${formatDT(order.pickup_slot)}</span>
  <span class="k">Delivery Slot</span><span class="v">${formatDT(order.delivery_slot)}</span>
  <span class="k">Rider</span><span class="v">${order.rider_name || "Not assigned"}</span>
</div>

<div class="section-title">Payment Summary</div>
<div class="price-row"><span>Payment Method</span><span>${order.payment_method || "—"}</span></div>
<div class="price-row"><span>Payment Status</span><span>${order.payment_status || "—"}</span></div>
<div class="price-row total"><span>Total Amount</span><span>₱${parseFloat(order.amount || 0).toLocaleString("en-PH", {minimumFractionDigits:2})}</span></div>

<div class="footer"><p>Thank you for choosing SudsTrack! <i class="ph ph-basket"></i></p><p style="margin-top:4px;">This is a computer-generated invoice. No signature required.</p></div>

<script>window.onload = () => { window.print(); }</script>
</body></html>`);
    win.document.close();
}

init();



/* ===========================================
        PROMOTIONS PANEL
=========================================== */
async function loadPromotions() {
    const list = document.getElementById("promosList");
    if (!list) return;
    try {
        const res = await apiFetch("/promotions");
        const promos = res.data || [];
        if (promos.length === 0) {
            list.innerHTML = `<p style="color:#94a3b8; font-style:italic;">No promotions found.</p>`;
            return;
        }
        list.innerHTML = promos.map(p => `
            <div class="admin-card" style="display:flex; align-items:center; gap:20px;">
                <img src="${p.image_url}" alt="${p.title}" style="width:120px; height:80px; object-fit:cover; border-radius:8px;">
                <div style="flex:1;">
                    <h4 style="margin:0 0 4px 0; color:var(--navy);">${p.title}</h4>
                    <p style="margin:0; font-size:14px; color:var(--muted);">${p.description || ''}</p>
                    <span style="font-size:12px; color:#64748b; display:block; margin-top:6px;">Added: ${new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button class="${p.is_active ? 'admin-btn' : 'btn-primary'}" onclick="togglePromo('${p.promo_id}')">
                        ${p.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button class="admin-btn admin-btn-warn" onclick="deletePromo('${p.promo_id}')">Delete</button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        showToast("Failed to load promotions.", "error");
    }
}

window.handlePromoSubmit = async function(e) {
    e.preventDefault();
    const title = document.getElementById("promoTitle").value;
    const desc = document.getElementById("promoDesc").value;
    const img = document.getElementById("promoImage").value;
    try {
        await apiFetch("/promotions", {
            method: "POST",
            body: JSON.stringify({ title, description: desc, image_url: img })
        });
        showToast("Promotion created!");
        document.getElementById("promoForm").reset();
        document.getElementById("addPromoForm").style.display = "none";
        loadPromotions();
    } catch (err) {
        showToast(err.message, "error");
    }
};

window.togglePromo = async function(id) {
    try {
        await apiFetch(`/promotions/${id}/toggle`, { method: "PUT" });
        loadPromotions();
    } catch (err) { showToast(err.message, "error"); }
};

window.deletePromo = async function(id) {
    if(!confirm("Delete this promotion?")) return;
    try {
        await apiFetch(`/promotions/${id}`, { method: "DELETE" });
        loadPromotions();
    } catch (err) { showToast(err.message, "error"); }
};

/* ===========================================
        AUDIT LOGS PANEL
=========================================== */
async function loadAuditLogs() {
    const tbody = document.getElementById("auditList");
    if (!tbody) return;
    tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
    try {
        const res = await apiFetch("/admin/audit-logs");
        const logs = res.data || [];
        if (logs.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' style='padding:16px; color:#64748b; text-align:center;'>No audit logs found.</td></tr>";
            return;
        }
        tbody.innerHTML = logs.map(l => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 8px; font-size:13px; color:#64748b;">${new Date(l.created_at).toLocaleString('en-PH')}</td>
                <td style="padding:12px 8px; font-size:14px; font-weight:600;">${l.admin_name || 'System'} <span style="font-size:11px; font-weight:normal; background:#e2e8f0; padding:2px 6px; border-radius:4px; margin-left:4px;">${l.admin_role || 'Auto'}</span></td>
                <td style="padding:12px 8px; font-size:14px; color:var(--navy); font-weight:500;">${l.action}</td>
                <td style="padding:12px 8px; font-size:14px; color:#475569;">${l.details || '-'}</td>
            </tr>
        `).join("");
    } catch (err) {
        showToast("Failed to load audit logs.", "error");
        tbody.innerHTML = "<tr><td colspan='4' style='color:red;'>Error loading logs.</td></tr>";
    }
}

/* ===========================================
        SETTINGS PANEL
=========================================== */
async function loadSettings() {
    try {
        const res = await apiFetch("/settings");
        const s = res.data;
        document.getElementById("set_email").value = s.contact_email || "";
        document.getElementById("set_phone").value = s.contact_phone || "";
        document.getElementById("set_hours").value = s.store_hours || "";
        document.getElementById("set_maintenance").checked = s.maintenance_mode === "true";
    } catch (err) {
        showToast("Failed to load settings.", "error");
    }
}

document.getElementById("settingsForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "Saving...";
    
    const payload = {
        contact_email: document.getElementById("set_email").value,
        contact_phone: document.getElementById("set_phone").value,
        store_hours: document.getElementById("set_hours").value,
        maintenance_mode: document.getElementById("set_maintenance").checked ? "true" : "false"
    };
    
    try {
        await apiFetch("/settings", { method: "PUT", body: JSON.stringify(payload) });
        showToast("Settings saved successfully!");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false; btn.textContent = "Save Settings";
    }
});

/* ===========================================
        LIVE CHAT PANEL
=========================================== */
let currentChatRoom = null;
let chatInterval = null;

async function loadChatRooms() {
    const list = document.getElementById("chatRoomsList");
    try {
        const res = await apiFetch("/chat/rooms");
        const rooms = res.data || [];
        if (rooms.length === 0) {
            list.innerHTML = `<div style="padding:16px; color:#64748b; text-align:center;">No active chats.</div>`;
            return;
        }
        list.innerHTML = rooms.map(r => `
            <div style="padding:12px 16px; border-bottom:1px solid #e2e8f0; cursor:pointer; background:${currentChatRoom === r.room_id ? '#e2e8f0' : 'transparent'}" 
                 onclick="openAdminChat(${r.room_id}, \`${r.customer_name}\`)">
                <div style="font-weight:600; color:var(--navy);">${r.customer_name}</div>
                <div style="font-size:12px; color:#64748b;">${r.email}</div>
            </div>
        `).join("");
    } catch (err) {
        list.innerHTML = `<div style="padding:16px; color:red; text-align:center;">Error loading rooms.</div>`;
    }
}

window.openAdminChat = async function(roomId, customerName) {
    currentChatRoom = roomId;
    document.getElementById("chatInput").disabled = false;
    document.getElementById("sendChatBtn").disabled = false;
    
    // Set Header
    const header = document.getElementById("activeChatHeader");
    const title = document.getElementById("activeChatTitle");
    const wipeBtn = document.getElementById("wipeChatBtn");
    
    if (header) header.style.display = "flex";
    if (title && customerName) title.textContent = "Chat with " + customerName;
    
    // Only SuperAdmin sees wipe button
    if (wipeBtn) wipeBtn.style.display = (currentAdmin && currentAdmin.role === "SuperAdmin") ? "block" : "none";
    
    loadChatRooms();
    
    if (chatInterval) clearInterval(chatInterval);
    await fetchChatMessages();
    chatInterval = setInterval(fetchChatMessages, 5000);
}

window.fetchChatMessages = async function() {
    if (!currentChatRoom) return;
    try {
        const res = await apiFetch(`/chat/${currentChatRoom}`);
        const msgs = res.data || [];
        const container = document.getElementById("chatMessages");
        
        container.innerHTML = msgs.map(m => {
            const isAdmin = m.sender_role !== "Customer";
            const align = isAdmin ? "flex-end" : "flex-start";
            const bg = isAdmin ? "#2563eb" : "#fff";
            const color = isAdmin ? "#fff" : "#1e293b";
            const radius = isAdmin ? "12px 12px 0 12px" : "12px 12px 12px 0";
            const label = isAdmin ? `[${m.sender_role}] ${m.sender_name}` : m.sender_name;
            
            return `
                <div style="display:flex; flex-direction:column; align-items:${align}; margin-bottom:8px;">
                    <span style="font-size:11px; color:#64748b; margin-bottom:4px;">${label}</span>
                    <div style="background:${bg}; color:${color}; padding:10px 14px; border-radius:${radius}; max-width:80%; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        ${m.message}
                    </div>
                </div>
            `;
        }).join("");
        
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error("Failed to fetch messages");
    }
}

document.getElementById("sendChatBtn")?.addEventListener("click", async () => {
    const input = document.getElementById("chatInput");
    const msg = input.value.trim();
    if (!msg || !currentChatRoom) return;
    
    input.value = "";
    try {
        await apiFetch(`/chat/${currentChatRoom}`, { method: "POST", body: JSON.stringify({ message: msg }) });
        fetchChatMessages();
    } catch (err) {
        showToast(err.message, "error");
    }
});

document.getElementById("chatInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("sendChatBtn").click();
});

/* ===========================================
        ADMIN PROFILE PANEL
=========================================== */
let adminProfilePicBase64 = null;

async function loadAdminProfile() {
    try {
        const user = await window.getCurrentUser();
        if (user) {
            document.getElementById("prof_name").value = user.full_name || "";
            if (user.profile_picture) {
                document.getElementById("profilePicPreview").src = user.profile_picture;
            } else {
                document.getElementById("profilePicPreview").src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.full_name || "Admin") + "&background=e2e8f0&color=475569";
            }
        }
    } catch (err) {}
}

document.getElementById("profilePicInput")?.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Automatically compress and resize image via Canvas
    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to WebP or JPEG to save massive amounts of space
            adminProfilePicBase64 = canvas.toDataURL("image/jpeg", 0.7);
            document.getElementById("profilePicPreview").src = adminProfilePicBase64;
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "Saving...";
    
    const name = document.getElementById("prof_name").value.trim();
    const currentPass = document.getElementById("prof_curr_pass").value;
    const newPass = document.getElementById("prof_new_pass").value;
    
    try {
        // 1. Update Name
        await apiFetch("/account/profile", {
            method: "PUT",
            body: JSON.stringify({ full_name: name })
        });
        
        // 2. Update Password if provided
        if (newPass) {
            if (!currentPass) {
                showToast("Please enter current password to change it.", "warning");
                btn.disabled = false; btn.textContent = "Save Changes";
                return;
            }
            await apiFetch("/account/change-password", {
                method: "POST",
                body: JSON.stringify({ current_password: currentPass, new_password: newPass })
            });
            document.getElementById("prof_curr_pass").value = "";
            document.getElementById("prof_new_pass").value = "";
        }
        
        // 3. Update Profile Picture if selected
        if (adminProfilePicBase64) {
            await apiFetch("/account/profile-picture", {
                method: "POST",
                body: JSON.stringify({ image: adminProfilePicBase64 })
            });
            adminProfilePicBase64 = null;
        }
        
        showToast("Profile updated successfully!");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false; btn.textContent = "Save Changes";
    }
});




window.toggleMsgMenu = function(msgId) {
    document.querySelectorAll('.msg-action-menu').forEach(el => {
        if (el.id !== `msgMenu_${msgId}`) el.style.display = 'none';
    });
    const menu = document.getElementById(`msgMenu_${msgId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    }
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.msg-action-container')) {
        document.querySelectorAll('.msg-action-menu').forEach(el => el.style.display = 'none');
    }
});

function renderMessageActions(msgId, content, chatType) {
    const editFn = chatType === 'live' ? 'editChatMessage' : 'editStaffMsg';
    const delFn = chatType === 'live' ? 'deleteChatMessage' : 'deleteStaffMsg';
    
    return `
    <div class="msg-action-container" style="position:relative; display:flex; align-items:center;">
        <button type="button" onclick="toggleMsgMenu(${msgId})" style="background:transparent; border:none; cursor:pointer; color:#94a3b8; padding:4px; border-radius:50%; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='#f1f5f9'; this.style.color='#64748b';" onmouseout="this.style.background='transparent'; this.style.color='#94a3b8';">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>
        </button>
        <div id="msgMenu_${msgId}" class="msg-action-menu" style="display:none; position:absolute; top:25px; left:50%; transform:translateX(-50%); background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:1000; flex-direction:column; min-width:120px; overflow:hidden;">
            <div style="padding:10px 16px; font-size:13px; font-weight:600; cursor:pointer; color:#1e293b; border-bottom:1px solid #f1f5f9; text-align:left;" onclick="enableInlineEdit(${msgId}, \`${content.replace(/`/g, '').replace(/"/g, '&quot;')}\`, '${chatType}'); toggleMsgMenu(${msgId})" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">Edit Message</div>
            <div style="padding:10px 16px; font-size:13px; font-weight:600; cursor:pointer; color:#ef4444; text-align:left;" onclick="${delFn}(${msgId}); toggleMsgMenu(${msgId})" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='#fff'">Delete Message</div>
        </div>
    </div>
    `;
}

// ==========================================
// STAFF INTERNAL CHAT
// ==========================================
let staffChatLoaded = false;
let staffChatInterval = null;

async function loadStaffChat() {
    if (chatMembers.length === 0) {
        fetchChatMembers();
        initMentionInput();
    }
    const wipeBtn = document.getElementById("wipeStaffChatBtn");
    if (wipeBtn) wipeBtn.style.display = (currentAdmin && currentAdmin.role === "SuperAdmin") ? "block" : "none";
    
    await renderStaffChatMessages();
    if (!staffChatLoaded) {
        staffChatLoaded = true;
        // Auto refresh every 5 seconds while panel is active
        staffChatInterval = setInterval(() => {
            const activeTab = document.querySelector(".sidebar-btn.active");
            if (activeTab && activeTab.dataset.tab === "staff-chat") {
                renderStaffChatMessages(false); // false means don't force scroll to bottom unless already there
            }
        }, 5000);

        // Bind form submit
        const form = document.getElementById("staffChatForm");
        const input = document.getElementById("staffChatInput");
        const sendBtn = document.getElementById("staffChatSendBtn");
        
        if (form) {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                const content = input.value.trim();
                if (!content) return;
                
                sendBtn.disabled = true;
                try {
                    await apiFetch("/staff-chat", { method: "POST", body: JSON.stringify({ content }) });
                    input.value = "";
                    await renderStaffChatMessages(true);
                } catch (err) {
                    showToast(err.message || "Failed to send message", "error");
                } finally {
                    sendBtn.disabled = false;
                    input.focus();
                }
            });
        }
    }
}

async function renderStaffChatMessages(forceScroll = true) {
    const container = document.getElementById("staffChatMessages");
    if (!container) return;

    // Check if user is scrolled to bottom before updating
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

    try {
        const res = await apiFetch("/staff-chat");
        const messages = res.data || [];

        if (messages.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:#94a3b8;margin-top:auto;margin-bottom:auto;">No messages yet. Start the conversation!</div>`;
            return;
        }

        const html = messages.map(msg => {
            const isMe = currentAdmin && currentAdmin.account_id === msg.sender_id;
            const align = isMe ? "flex-end" : "flex-start";
            const bg = isMe ? "#1e3a8a" : "#ffffff";
            const color = isMe ? "#ffffff" : "#1e293b";
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const pic = msg.sender_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender_name)}&background=2e4c6e&color=ffffff`;

            return `
                <div style="display:flex; flex-direction:column; align-items:${align}; gap:4px;">
                    ${!isMe ? `<div style="display:flex; align-items:center; gap:8px;">
                        <img src="${pic}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">
                        <span style="font-size:12px; font-weight:700; color:#475569;">${msg.sender_name} <span style="font-size:10px; font-weight:800; color:#94a3b8; background:#f1f5f9; padding:2px 6px; border-radius:4px; margin-left:4px;">${msg.sender_role}</span></span>
                    </div>` : ''}
                    <div style="display:flex; align-items:center; gap:8px; max-width:80%;">
                        ${(isMe || (currentAdmin && currentAdmin.role === "SuperAdmin")) && isMe ? renderMessageActions(msg.message_id, msg.content, 'staff') : ''}
                        
                        <div style="background:${bg}; color:${color}; padding:10px 14px; border-radius:12px; max-width:100%; font-size:14px; border: ${isMe ? 'none' : '1px solid #e2e8f0'}; box-shadow:0 1px 2px rgba(0,0,0,0.05); word-break:break-word; min-width:150px;">
                            <div id="staffMsgContent_${msg.message_id}">${msg.content.replace(/@([a-zA-Z0-9_]+)/g, '<strong style="color:#3b82f6;">@$1</strong>')}</div>
                        </div>
                        
                        ${(isMe || (currentAdmin && currentAdmin.role === "SuperAdmin")) && !isMe ? renderMessageActions(msg.message_id, msg.content, 'staff') : ''}
                    </div>
                    <span style="font-size:11px; color:#94a3b8; margin-top:4px;">${timeStr}</span>
                </div>
            `;
        }).join('');

        // Only update DOM if HTML changed (prevents flicker on polling)
        if (container.dataset.lastHtml !== html) {
            container.innerHTML = html;
            container.dataset.lastHtml = html;
            
            // Scroll to bottom if forced or if user was already at the bottom
            if (forceScroll || isAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }

    } catch (err) {
        console.error("Failed to load staff chat", err);
    }
}


// ==========================================
// NOTIFICATIONS
// ==========================================
async function loadNotifications() {
    try {
        const res = await apiFetch("/notifications");
        const notifs = res.data || [];
        renderNotifications(notifs);
    } catch (err) {
        console.error("Failed to load notifications:", err);
    }
}

function renderNotifications(notifs) {
    const badge = document.getElementById("notifBadge");
    const list = document.getElementById("notifList");
    if (!badge || !list) return;

    notifs = notifs.filter(n => !n.is_read);
    const unreadCount = notifs.length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
        badge.style.display = "block";
    } else {
        badge.style.display = "none";
    }

    if (notifs.length === 0) {
        list.innerHTML = `<div style="padding:16px; text-align:center; color:#94a3b8; font-size:13px;">No notifications.</div>`;
        return;
    }

    list.innerHTML = notifs.map(n => {
        const bg = n.is_read ? "#ffffff" : "#f0fdf4";
        const dot = n.is_read ? "" : `<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;margin-top:6px;flex-shrink:0;"></div>`;
        
        return `
            <div style="padding:12px 16px; border-bottom:1px solid #f1f5f9; background:${bg}; cursor:pointer; display:flex; gap:12px;" onclick="handleNotifClick(${n.id}, '${n.link_tab || ''}')">
                ${dot}
                <div style="flex:1;">
                    <p style="margin:0 0 4px; font-size:13px; font-weight:700; color:#1e293b;">${n.title}</p>
                    <p style="margin:0 0 4px; font-size:12px; color:#475569;">${n.message}</p>
                    <p style="margin:0; font-size:10px; color:#94a3b8;">${new Date(n.created_at).toLocaleString()}</p>
                </div>
            </div>
        `;
    }).join('');
}

async function handleNotifClick(notifId, tabName) {
    // Mark as read
    try {
        await apiFetch(`/notifications/${notifId}/read`, { method: "PUT" });
        loadNotifications();
    } catch (err) {}

    // Navigate to tab
    if (tabName) {
        document.getElementById("notifDropdown").style.display = "none";
        const btn = document.querySelector(`.sidebar-btn[data-tab='${tabName}']`);
        if (btn) btn.click();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const notifBtn = document.getElementById("notifBtn");
    const notifDropdown = document.getElementById("notifDropdown");
    const markAllReadBtn = document.getElementById("markAllReadBtn");

    if (notifBtn) {
        notifBtn.addEventListener("click", () => {
            notifDropdown.style.display = notifDropdown.style.display === "none" ? "flex" : "none";
        });
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", async () => {
            try {
                await apiFetch("/notifications/read-all", { method: "PUT" });
                loadNotifications();
            } catch (err) {
                showToast("Failed to mark all as read", "error");
            }
        });
    }

    // Click outside to close
    document.addEventListener("click", (e) => {
        if (notifBtn && notifDropdown && !notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
            notifDropdown.style.display = "none";
        }
    });
});


// ==========================================
// MENTIONS AUTOCOMPLETE
// ==========================================
let chatMembers = [];
let mentionIndex = -1;
let mentionSearch = "";
let mentionMatchStart = -1;

async function fetchChatMembers() {
    try {
        const res = await apiFetch("/staff-chat/members");
        chatMembers = res.data || [];
        // Add roles as generic mentions
        chatMembers.unshift({ full_name: "All", role: "Everyone", account_id: "all" });
        chatMembers.unshift({ full_name: "Staff", role: "All Staff", account_id: "staff" });
        chatMembers.unshift({ full_name: "SuperAdmin", role: "All Admins", account_id: "admin" });
    } catch (err) {
        console.error("Failed to fetch chat members");
    }
}

function initMentionInput() {
    const input = document.getElementById("staffChatInput");
    const dropdown = document.getElementById("mentionDropdown");
    if (!input || !dropdown) return;

    input.addEventListener("input", (e) => {
        const val = input.value;
        const cursorStart = input.selectionStart;
        const textBeforeCursor = val.slice(0, cursorStart);
        
        // Match "@something" right before cursor
        const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
        
        if (match) {
            mentionSearch = match[1].toLowerCase();
            mentionMatchStart = match.index + (match[0].startsWith(' ') ? 1 : 0);
            
            const results = chatMembers.filter(m => {
                const fName = m.full_name.split(" ")[0].toLowerCase();
                return fName.startsWith(mentionSearch) || m.role.toLowerCase().startsWith(mentionSearch);
            });
            
            if (results.length > 0) {
                renderMentionDropdown(results);
                dropdown.style.display = "block";
            } else {
                dropdown.style.display = "none";
            }
        } else {
            dropdown.style.display = "none";
        }
    });

    input.addEventListener("keydown", (e) => {
        if (dropdown.style.display === "block") {
            const items = dropdown.querySelectorAll(".mention-item");
            if (e.key === "ArrowDown") {
                e.preventDefault();
                mentionIndex = (mentionIndex + 1) % items.length;
                updateMentionSelection(items);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                mentionIndex = (mentionIndex - 1 + items.length) % items.length;
                updateMentionSelection(items);
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                if (mentionIndex >= 0 && items[mentionIndex]) {
                    items[mentionIndex].click();
                } else if (items.length > 0) {
                    items[0].click();
                }
            } else if (e.key === "Escape") {
                dropdown.style.display = "none";
            }
        }
    });
}

function updateMentionSelection(items) {
    items.forEach((item, i) => {
        if (i === mentionIndex) {
            item.style.background = "#f1f5f9";
        } else {
            item.style.background = "#fff";
        }
    });
}

function renderMentionDropdown(results) {
    const dropdown = document.getElementById("mentionDropdown");
    mentionIndex = 0; // Select first by default
    dropdown.innerHTML = results.map((m, i) => {
        const fName = m.full_name.split(" ")[0];
        const pic = m.profile_picture || (m.account_id ? "" : ""); // simplified
        const avatarHtml = m.profile_picture 
            ? `<img src="${m.profile_picture}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:20px;height:20px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:10px;"><i class="ph ph-user"></i></div>`;

        return `
            <div class="mention-item" style="padding:8px 12px; cursor:pointer; display:flex; align-items:center; gap:8px; border-bottom:1px solid #f1f5f9; background:${i === 0 ? '#f1f5f9' : '#fff'};" onclick="insertMention('${fName}')">
                ${avatarHtml}
                <div>
                    <div style="font-size:13px; font-weight:700; color:#1e293b;">${fName}</div>
                    <div style="font-size:11px; color:#64748b;">${m.role}</div>
                </div>
            </div>
        `;
    }).join("");
}

window.insertMention = function(name) {
    const input = document.getElementById("staffChatInput");
    const dropdown = document.getElementById("mentionDropdown");
    
    const val = input.value;
    const beforeMention = val.slice(0, mentionMatchStart);
    // Find where the mention ends after the match start
    const afterCursor = val.slice(input.selectionStart);
    
    const newValue = beforeMention + "@" + name + " " + afterCursor;
    input.value = newValue;
    dropdown.style.display = "none";
    input.focus();
};

// Add fetching call to loadStaffChat


window.editChatMessage = async function(messageId, oldMsg) {
    const newContent = prompt("Edit message:", oldMsg);
    if (newContent === null) return;
    if (!newContent.trim()) { showToast("Message cannot be empty", "error"); return; }
    
    try {
        await apiFetch(`/chat/messages/${messageId}`, { method: 'PUT', body: JSON.stringify({ content: newContent }) });
        await fetchChatMessages();
    } catch(err) {
        showToast(err.message, "error");
    }
}

window.deleteChatMessage = function(messageId) {
    showConfirmModal("Delete Message", "Are you sure you want to delete this message? This cannot be undone.", "Delete", async () => {
        try {
            await apiFetch(`/chat/messages/${messageId}`, { method: 'DELETE' });
            await fetchChatMessages();
        } catch(err) {
            showToast(err.message, "error");
        }
    });
}

window.wipeCurrentChat = function() {
    if (!currentChatRoom) return;
    showConfirmModal("Wipe Chat", "Are you sure you want to wipe all messages in this room? This action is permanent and cannot be undone.", "Wipe Chat", async () => {
        try {
            await apiFetch(`/chat/rooms/${currentChatRoom}/messages`, { method: 'DELETE' });
            showToast("Chat wiped.", "success");
            await fetchChatMessages();
        } catch(err) {
            showToast(err.message, "error");
        }
    });
}


window.editStaffMsg = async function(id, oldContent) {
    const newContent = prompt("Edit staff message:", oldContent);
    if (newContent === null) return;
    if (!newContent.trim()) { showToast("Message cannot be empty", "error"); return; }
    try {
        await apiFetch(`/staff-chat/${id}`, { method: 'PUT', body: JSON.stringify({ content: newContent }) });
        await renderStaffChatMessages(false);
    } catch (err) {
        showToast(err.message, "error");
    }
}

window.deleteStaffMsg = function(id) {
    showConfirmModal("Delete Message", "Do you really want to delete this staff message? This cannot be undone.", "Delete", async () => {
        try {
            await apiFetch(`/staff-chat/${id}`, { method: 'DELETE' });
            await renderStaffChatMessages(false);
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

window.wipeStaffChat = function() {
    showConfirmModal("Wipe Staff Chat", "Are you sure you want to completely wipe the entire staff chat history? This cannot be undone.", "Wipe Chat", async () => {
        try {
            await apiFetch(`/staff-chat/wipe/all`, { method: 'DELETE' });
            showToast("Staff chat wiped.", "success");
            await renderStaffChatMessages(true);
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}


window.enableInlineEdit = function(id, originalContent, chatType) {
    const prefix = chatType === 'live' ? 'chatMsgContent_' : 'staffMsgContent_';
    const container = document.getElementById(prefix + id);
    if (!container) return;
    
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; width:100%; min-width:200px;">
            <input type="text" id="editInput_${id}" value="${originalContent.replace(/"/g, '&quot;')}" style="width:100%; padding:8px; border:1px solid #3b82f6; border-radius:6px; font-size:14px; color:#1e293b; background:#fff; outline:none; box-sizing:border-box;" />
            <span style="font-size:10px; opacity:0.8; margin-top:4px; margin-bottom:-4px;">Press <kbd style="background:rgba(0,0,0,0.1);padding:1px 4px;border-radius:3px;">Enter</kbd> to save, <kbd style="background:rgba(0,0,0,0.1);padding:1px 4px;border-radius:3px;">Esc</kbd> to cancel</span>
        </div>
    `;
    
    const input = document.getElementById(`editInput_${id}`);
    input.focus();
    // move cursor to end
    input.setSelectionRange(input.value.length, input.value.length);
    
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Escape') {
            if (chatType === 'live') fetchChatMessages();
            else renderStaffChatMessages(false);
        } else if (e.key === 'Enter') {
            const newContent = input.value.trim();
            if (!newContent) return;
            
            input.disabled = true;
            try {
                const url = chatType === 'live' ? `/chat/messages/${id}` : `/staff-chat/${id}`;
                await apiFetch(url, { method: 'PUT', body: JSON.stringify({ content: newContent }) });
                if (chatType === 'live') await fetchChatMessages();
                else await renderStaffChatMessages(false);
            } catch(err) {
                showToast(err.message, 'error');
                input.disabled = false;
                input.focus();
            }
        }
    });
};


// ==========================================
// CUSTOM CONFIRMATION MODAL
// ==========================================
window.showConfirmModal = function(title, message, confirmText, onConfirm) {
    let modal = document.getElementById("customConfirmModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "customConfirmModal";
        modal.style.cssText = "display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15, 23, 42, 0.4); backdrop-filter:blur(2px); z-index:9999; align-items:center; justify-content:center;";
        modal.innerHTML = `
            <div style="background:#fff; border-radius:16px; padding:24px; width:90%; max-width:360px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); transform:scale(0.95); transition:transform 0.15s ease-out, opacity 0.15s ease-out; opacity:0;">
                <h3 id="confirmModalTitle" style="margin:0 0 8px; font-size:18px; font-weight:800; color:#0f172a;"></h3>
                <p id="confirmModalText" style="margin:0 0 24px; font-size:14px; color:#475569; line-height:1.5;"></p>
                <div style="display:flex; gap:12px; justify-content:flex-end;">
                    <button id="confirmModalCancel" style="padding:10px 16px; border-radius:8px; border:none; background:#f1f5f9; color:#475569; font-weight:700; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Cancel</button>
                    <button id="confirmModalAction" style="padding:10px 16px; border-radius:8px; border:none; background:#ef4444; color:#fff; font-weight:700; cursor:pointer;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'"></button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById("confirmModalTitle").textContent = title;
    document.getElementById("confirmModalText").textContent = message;
    document.getElementById("confirmModalAction").textContent = confirmText;
    
    modal.style.display = "flex";
    
    // Animate in
    requestAnimationFrame(() => {
        modal.firstElementChild.style.transform = "scale(1)";
        modal.firstElementChild.style.opacity = "1";
    });
    
    const close = () => {
        modal.firstElementChild.style.transform = "scale(0.95)";
        modal.firstElementChild.style.opacity = "0";
        setTimeout(() => { modal.style.display = "none"; }, 150);
    };
    
    document.getElementById("confirmModalCancel").onclick = close;
    document.getElementById("confirmModalAction").onclick = () => {
        close();
        if(onConfirm) onConfirm();
    };
};


/* ===========================================
        CHAT LOGS PANEL
=========================================== */
async function loadChatLogs() {
    const tbody = document.getElementById("chatLogsList");
    if (!tbody) return;
    tbody.innerHTML = "<tr><td colspan='4' style='padding:16px; text-align:center;'>Loading...</td></tr>";
    try {
        const res = await apiFetch("/admin/chat-logs");
        const logs = res.data || [];
        if (logs.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' style='padding:16px; color:#64748b; text-align:center;'>No chat logs found.</td></tr>";
            return;
        }
        tbody.innerHTML = logs.map(l => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 16px; font-size:13px; color:#64748b;">${new Date(l.created_at).toLocaleString('en-PH')}</td>
                <td style="padding:12px 16px; font-size:14px; font-weight:600; color:#1e293b;">${l.admin_name || 'System'} <span style="font-size:11px; font-weight:normal; background:#e2e8f0; color:#64748b; padding:2px 6px; border-radius:4px; margin-left:4px;">${l.admin_role || 'Auto'}</span></td>
                <td style="padding:12px 16px; font-size:14px; color:#3b82f6; font-weight:600;">${l.action}</td>
                <td style="padding:12px 16px; font-size:14px; color:#475569;">${l.details || '-'}</td>
            </tr>
        `).join("");
    } catch (err) {
        showToast("Failed to load chat logs.", "error");
        tbody.innerHTML = "<tr><td colspan='4' style='padding:16px; color:#ef4444; text-align:center;'>Failed to load logs.</td></tr>";
    }
}


/* ===========================================
        PACKAGES MANAGEMENT
=========================================== */
async function loadPackagesAdmin() {
    const list = document.getElementById("packagesList");
    if (!list) return;
    list.innerHTML = "<p style='color:#64748b;'>Loading packages...</p>";

    // Setup Add Form Toggles
    const addBtn = document.getElementById("addPackageBtn");
    const cancelBtn = document.getElementById("cancelNewPackageBtn");
    const form = document.getElementById("addPackageForm");
    const saveBtn = document.getElementById("saveNewPackageBtn");

    if (addBtn && !addBtn.dataset.bound) {
        addBtn.dataset.bound = true;
        addBtn.addEventListener("click", () => form.style.display = "block");
        cancelBtn.addEventListener("click", () => {
            form.style.display = "none";
            document.getElementById("newPkgName").value = "";
            document.getElementById("newPkgDesc").value = "";
            document.getElementById("newPkgPrice").value = "";
        });
        saveBtn.addEventListener("click", async () => {
            const name = document.getElementById("newPkgName").value.trim();
            const desc = document.getElementById("newPkgDesc").value.trim();
            const price = document.getElementById("newPkgPrice").value;
            const time = document.getElementById("newPkgTime").value.trim();

            if (!name || !desc || !price) {
                showToast("Please fill all required fields.", "error");
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";
            try {
                await apiFetch("/admin/packages", {
                    method: "POST",
                    body: JSON.stringify({ package_name: name, description: desc, price, turnaround_time: time, is_active: true })
                });
                showToast("Package created successfully.", "success");
                cancelBtn.click();
                loadPackagesAdmin();
            } catch (err) {
                showToast(err.message, "error");
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "Save Package";
            }
        });
    }

    try {
        // use public packages route but we want ALL (even inactive) if possible.
        // Actually public returns only active. Let's fetch from public for now, or if admin has a specific route.
        // Public route: GET /api/packages is fine, it doesn't matter if inactive are hidden, we want them active.
        const res = await apiFetch("/packages");
        let pkgs = res.data || [];
        
        if (pkgs.length === 0) {
            list.innerHTML = "<p style='color:#64748b;'>No active packages.</p>";
            return;
        }

        list.innerHTML = pkgs.map(p => `
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 style="margin:0 0 4px; font-size:16px; color:#1e293b;">${p.package_name}</h3>
                    <p style="margin:0; font-size:13px; color:#64748b;">${p.description} • ${p.turnaround_time || '2-3 days'}</p>
                    <p style="margin:4px 0 0; font-weight:600; color:#10b981;">PHP ${p.price}</p>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="admin-btn" style="background:#3b82f6;color:#fff;" onclick="editPackageAdmin(${p.package_id}, '${p.package_name.replace("'", "\'")}', '${p.description.replace("'", "\'")}', ${p.price}, '${(p.turnaround_time || '2-3 days').replace("'", "\'")}')">Edit</button>
                    <button class="admin-btn admin-btn-warn" onclick="deletePackageAdmin(${p.package_id})">Delete</button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        list.innerHTML = `<p style="color:#ef4444;">Could not load packages: ${err.message}</p>`;
    }
}


window.editPackageAdmin = function(id, currentName, currentDesc, currentPrice, currentTime) {
    let modal = document.getElementById("editPkgModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "editPkgModal";
        modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;";
        modal.innerHTML = `
            <div style="background:#fff;padding:24px;border-radius:12px;width:100%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                <h3 style="margin-top:0;">Edit Package</h3>
                <div class="field"><label>Package Name</label><input type="text" id="editPkgName" required></div>
                <div class="field"><label>Description</label><input type="text" id="editPkgDesc" required></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="field"><label>Price (PHP)</label><input type="number" id="editPkgPrice" required></div>
                    <div class="field"><label>Turnaround Time</label><input type="text" id="editPkgTime" required></div>
                </div>
                <div style="display:flex;gap:12px;margin-top:16px;">
                    <button type="button" class="btn-primary" id="saveEditPkgBtn">Save Changes</button>
                    <button type="button" class="admin-btn" id="cancelEditPkgBtn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById("editPkgName").value = currentName;
    document.getElementById("editPkgDesc").value = currentDesc;
    document.getElementById("editPkgPrice").value = currentPrice;
    document.getElementById("editPkgTime").value = currentTime;

    modal.style.display = "flex";

    document.getElementById("cancelEditPkgBtn").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("saveEditPkgBtn").onclick = async () => {
        const name = document.getElementById("editPkgName").value.trim();
        const desc = document.getElementById("editPkgDesc").value.trim();
        const price = document.getElementById("editPkgPrice").value;
        const time = document.getElementById("editPkgTime").value.trim();

        if (!name || !desc || !price) {
            showToast("Required fields cannot be empty.", "error");
            return;
        }

        try {
            await apiFetch(`/admin/packages/${id}`, {
                method: "PUT",
                body: JSON.stringify({ package_name: name, description: desc, price: parseFloat(price), turnaround_time: time })
            });
            showToast("Package updated successfully.", "success");
            modal.style.display = "none";
            loadPackagesAdmin();
        } catch (err) {
            showToast(err.message, "error");
        }
    };
};

window.deletePackageAdmin = async function(id) {
    showConfirmModal("Delete Package?", "Are you sure you want to remove this package? Customers will no longer be able to select it.", "Yes, Delete", async () => {
        try {
            await apiFetch(`/admin/packages/${id}`, { method: "DELETE" });
            showToast("Package deleted.", "success");
            loadPackagesAdmin();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
};


window.wipeAuditLogs = function() {
    showConfirmModal("Wipe Audit Logs", "Are you sure you want to completely wipe all audit logs? This cannot be undone.", "Wipe Logs", async () => {
        try {
            await apiFetch(`/admin/audit-logs/wipe`, { method: 'DELETE' });
            showToast("Audit logs wiped.", "success");
            loadAuditLogs();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
};

window.wipeGlobalChatLogs = function() {
    showConfirmModal("Wipe Chat Logs", "Are you sure you want to completely wipe all chat logs across all rooms? This cannot be undone.", "Wipe Logs", async () => {
        try {
            await apiFetch(`/admin/chat-logs/wipe`, { method: 'DELETE' });
            showToast("Chat logs wiped.", "success");
            loadChatLogs();
        } catch (err) {
            showToast(err.message, "error");
        }
    });
};
