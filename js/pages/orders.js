// Orders Page Logic

const authGate = document.getElementById('authGate');
const accountApp = document.getElementById('accountApp');
let currentUser = null;

async function init() {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        if (authGate) authGate.style.display = 'block';
        if (accountApp) accountApp.style.display = 'none';
        return;
    }
    if (authGate) authGate.style.display = 'none';
    if (accountApp) accountApp.style.display = 'block';
    render();
}

// ---- Orders ----
    const ORDER_STATUSES = ["Received","Washing","Drying","Ready for Delivery","Out for Delivery","Completed","Cancelled"];

    const orderCardHTML = (order, isSaved) => {
        const status     = order.status || "Received";
        const currentIdx = ORDER_STATUSES.indexOf(status);
        const isComplete = status === "Completed" || status === "Cancelled";

        const stageTrack = `
            <ul class="order-progress" aria-label="Order progress">
                ${ORDER_STATUSES.filter(s => s !== "Cancelled").map((s, i) => {
                    const sIdx = ORDER_STATUSES.indexOf(s);
                    return `<li class="${sIdx < currentIdx ? "is-done" : sIdx === currentIdx ? "is-active" : ""}">${s}</li>`;
                }).join("")}
            </ul>
        `;

        const qrSection = '';

        const trackSection = (order.rider_name && status === "Out for Delivery")
            ? `<button type="button" class="order-tool-btn" data-track="${order.order_id}">Track Rider <i class="ph ph-map-pin"></i></button>`
            : "";

        const feedbackSection = status === "Completed"
            ? `<button type="button" class="order-tool-btn" data-feedback="${order.order_id}">Leave feedback</button>`
            : "";

        // Rider section
        let riderSection = "";
        if (status === "Waiting for Rider") {
            riderSection = `
                <div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:10px; padding:12px 16px; margin:12px 0; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:20px;"><i class="ph ph-hourglass"></i></span>
                    <div>
                        <p style="font-weight:700; color:#92400e; margin:0 0 2px; font-size:14px;">Waiting for Available Rider</p>
                        <p style="color:#b45309; margin:0; font-size:12px;">A rider will be assigned to your order shortly. We'll notify you!</p>
                    </div>
                </div>`;
        } else if (order.rider_name && !["Completed","Cancelled"].includes(status)) {
            riderSection = `
                <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:12px 16px; margin:12px 0; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:20px;"><i class="ph ph-motorcycle"></i></span>
                    <div>
                        <p style="font-weight:700; color:#166534; margin:0 0 2px; font-size:14px;">Your Rider: ${order.rider_name}</p>
                        <p style="color:#15803d; margin:0; font-size:12px;">${order.rider_phone ? order.rider_phone + " · " : ""}${order.rider_vehicle || ""}</p>
                    </div>
                </div>`;
        }

        return `
        <div class="order-card">
            <div class="order-card-top">
                <span class="order-code">#${order.order_code}</span>
                <div class="order-actions">
                    <span class="status-badge ${statusClass(status)}">${status}</span>
                    <button type="button" class="save-toggle ${isSaved ? "saved" : ""}" data-order-id="${order.order_id}" aria-label="Save order">${isSaved ? `<i class="ph-fill ph-star" style="color:#fbbf24"></i>` : `<i class="ph ph-star"></i>`}</button>
                </div>
            </div>
            ${stageTrack}
            ${riderSection}
            <div class="order-grid">
                <span>Package</span><span>${order.package_name || "—"}</span>
                <span>Load size</span><span>${order.load_size || "—"}</span>
                <span>Pickup</span><span>${formatDateTime(order.pickup_slot)}</span>
                <span>Delivery</span><span>${formatDateTime(order.delivery_slot)}</span>
                <span>Payment</span><span>${order.payment_method || "—"} · ${order.payment_status || "—"}</span>
                <span>Total</span><span>₱${order.amount || "—"}</span>
                <span>Address</span><span>${order.pickup_address || "—"}</span>
            </div>
            <div class="order-tools">
                ${qrSection}
                ${trackSection}
                ${feedbackSection}
            </div>

            <div class="order-track-panel" id="track-${order.order_id}" style="display:none;"></div>
            <div class="order-feedback-panel" id="fb-${order.order_id}" style="display:none;"></div>
        </div>`;
    };

    let currentOrderFilter = "Active";

    document.getElementById("orderStatusFilter")?.addEventListener("change", (e) => {
        currentOrderFilter = e.target.value;
        render();
    });

    async function render() {
        try {
            const [ordersRes, savedRes] = await Promise.all([
                Orders.getMyOrders(),
                Orders.getSavedOrders()
            ]);

            const allOrders  = ordersRes.data || [];
            const savedIds   = new Set((savedRes.data || []).map(o => o.order_id));
            const allList    = document.getElementById("allOrdersList");
            const savedList  = document.getElementById("savedOrdersList");

            // Filter logic
            const filteredOrders = allOrders.filter(o => {
                const status = o.status || "Received";
                if (currentOrderFilter === "All") return true;
                if (currentOrderFilter === "Active") return status !== "Completed" && status !== "Cancelled";
                return status === currentOrderFilter;
            });

            if (allOrders.length === 0) {
                allList.innerHTML = `<div class="empty-state">No orders yet. <a href="booking.html">Book your first laundry pickup</a>.</div>`;
            } else if (filteredOrders.length === 0) {
                allList.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center; color:#64748b;">No orders found for this filter.</div>`;
            } else {
                allList.innerHTML = filteredOrders.map(o => orderCardHTML(o, savedIds.has(o.order_id))).join("");
            }

            const savedOrders = allOrders.filter(o => savedIds.has(o.order_id));
            savedList.innerHTML = savedOrders.length === 0
                ? `<div class="empty-state">No saved orders yet. Tap the star on an order to save it here.</div>`
                : savedOrders.map(o => orderCardHTML(o, true)).join("");

            attachOrderListeners();
        } catch (err) {
            console.error("Could not load orders:", err.message);
        }
    }

    function attachOrderListeners() {
        // Star toggle
        document.querySelectorAll(".save-toggle").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id     = btn.dataset.orderId;
                const isSaved = btn.classList.contains("saved");
                try {
                    if (isSaved) await Orders.unsaveOrder(id);
                    else         await Orders.saveOrder(id);
                    render();
                } catch (err) {
                    showToast(err.message, "error");
                }
            });
        });

        // QR Code
        document.querySelectorAll("[data-claim]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id    = btn.dataset.claim;
                const panel = document.getElementById(`qr-${id}`);
                if (panel.style.display !== "none") { panel.style.display = "none"; return; }
                panel.style.display = "block";

                // Use pre-loaded QR url if available
                const qrUrl = btn.dataset.qrUrl;
                if (qrUrl) {
                    panel.innerHTML = `<img src="${qrUrl}" alt="Claim QR" style="width:120px;height:120px;border-radius:8px;">`;
                    return;
                }

                panel.innerHTML = `<p class="order-tool-loading">Loading QR…</p>`;
                try {
                    const res = await Orders.getQR(id);
                    panel.innerHTML = `<img src="${res.data.qr_code_url}" alt="Claim QR" style="width:120px;height:120px;border-radius:8px;">`;
                } catch {
                    panel.innerHTML = `<p style="color:#dc2626;font-size:13px;">Could not load QR code.</p>`;
                }
            });
        });

        // Track rider (Google Maps)
        document.querySelectorAll("[data-track]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id    = btn.dataset.track;
                const panel = document.getElementById(`track-${id}`);
                if (panel.style.display !== "none") { panel.style.display = "none"; return; }
                panel.style.display = "block";
                panel.innerHTML = `<p class="order-tool-loading">Loading tracking…</p>`;

                try {
                    const res   = await Orders.getTracking(id);
                    const track = res.data;

                    if (!track.map_data) {
                        panel.innerHTML = `<p style="font-size:13px; color:#dc2626;">We couldn't generate a map route for your address. Tracking will be available soon.</p>`;
                        return;
                    }

                    const m = track.map_data;
                    panel.innerHTML = `
                        <div style="padding:12px;background:#f0f4f8;border-radius:8px;font-size:13px;">
                            <p><strong>Rider:</strong> ${track.rider_name || "On the way"}</p>
                            <p><strong>Distance:</strong> ${m.distance}</p>
                            <p><strong>ETA:</strong> ${m.duration}</p>
                            <p><strong>Destination:</strong> ${m.deliveryAddress}</p>
                        </div>
                        <iframe
                            width="100%" height="200" style="border:0;border-radius:8px;margin-top:8px;"
                            loading="lazy" allowfullscreen
                            src="https://maps.google.com/maps?saddr=${m.shopCoords.lat},${m.shopCoords.lng}&daddr=${encodeURIComponent(m.deliveryAddress)}&output=embed">
                        </iframe>
                    `;
                } catch (err) {
                    panel.innerHTML = `<p style="color:#dc2626;font-size:13px;">Could not load tracking.</p>`;
                }
            });
        });

        // Feedback
        document.querySelectorAll("[data-feedback]").forEach(btn => {
            btn.addEventListener("click", () => {
                const id    = btn.dataset.feedback;
                const panel = document.getElementById(`fb-${id}`);
                if (panel.style.display !== "none") { panel.style.display = "none"; return; }
                panel.style.display = "block";
                panel.innerHTML = `
                    <div style="padding:12px;">
                        <p style="font-size:13px;margin-bottom:8px;">Rate this order:</p>
                        <div class="star-rating" id="stars-${id}">
                            ${[1,2,3,4,5].map(n => `<button type="button" data-star="${n}" style="font-size:24px;background:none;border:none;cursor:pointer;">☆</button>`).join("")}
                        </div>
                        <textarea id="fb-comment-${id}" placeholder="Leave a comment (optional)" style="width:100%;margin-top:8px;padding:8px;border-radius:6px;border:1px solid #ddd;font-size:13px;" rows="3"></textarea>
                        <button type="button" id="fb-submit-${id}" class="order-tool-btn" style="margin-top:8px;">Submit feedback</button>
                    </div>
                `;

                let selectedRating = 0;
                panel.querySelectorAll("[data-star]").forEach(star => {
                    star.addEventListener("click", () => {
                        selectedRating = parseInt(star.dataset.star);
                        panel.querySelectorAll("[data-star]").forEach((s, i) => {
                            s.textContent = i < selectedRating ? "★" : "☆";
                        });
                    });
                });

                document.getElementById(`fb-submit-${id}`).addEventListener("click", async () => {
                    if (!selectedRating) { showToast("Please select a star rating.", "warning"); return; }
                    const comment = document.getElementById(`fb-comment-${id}`).value;
                    try {
                        await Feedback.submit(parseInt(id), selectedRating, comment);
                        panel.innerHTML = `<p style="color:#16a34a;font-size:13px;padding:12px;"><i class="ph ph-check"></i> Thank you for your feedback!</p>`;
                        showToast("Feedback submitted!");
                    } catch (err) {
                        showToast(err.message || "Could not submit feedback.", "error");
                    }
                });
            });
        });
    }

    // ---- Tabs ----
    document.querySelectorAll(".orders-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".orders-tab").forEach(t => t.classList.toggle("active", t === tab));
            const name = tab.dataset.tab;
            document.getElementById("allOrdersList").style.display   = name === "all"   ? "flex" : "none";
            document.getElementById("savedOrdersList").style.display  = name === "saved" ? "flex" : "none";
        });
    });

    render();
}

init();

init();
