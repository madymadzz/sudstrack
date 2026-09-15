// SudsTrack Booking Page — connected to real backend API

const authGate  = document.getElementById("authGate");
const bookingApp = document.getElementById("bookingApp");

const PACKAGE_KEY = "sudstrack_package";
let selectedPackages = [];
let currentUser     = null;

async function init() {
    currentUser = await getCurrentUser();

    if (!currentUser) {
        authGate.style.display  = "block";
        bookingApp.style.display = "none";
        return;
    }

    // Get selected package from localStorage (set by packages.html)
    try { selectedPackages = JSON.parse(localStorage.getItem(PACKAGE_KEY)); if(!Array.isArray(selectedPackages)) selectedPackages = [selectedPackages]; } catch { selectedPackages = []; }

    if (!selectedPackages || selectedPackages.length === 0) {
        window.location.href = "packages.html";
        return;
    }

    authGate.style.display  = "none";
    bookingApp.style.display = "block";

    startBookingApp();
}

function startBookingApp() {
    document.getElementById("packageBannerName").textContent = selectedPackages.map(p => p.name).join(", ");

    // Pre-fill name from account if available
    const nameField = document.getElementById("fullName");
    if (nameField && currentUser.full_name) nameField.value = currentUser.full_name;

    // Pre-fill address if available
    const addressField = document.getElementById("address");
    if (addressField && currentUser.address) addressField.value = currentUser.address;

    initMap();

    // ---- Date constraints ----
    const pickupDate   = document.getElementById("pickupDate");
    const deliveryDate = document.getElementById("deliveryDate");
    const toISODate    = d => d.toISOString().split("T")[0];
    const today        = new Date();

    // Map display slot labels → actual start time for DB
    const SLOT_TIMES = {
        "Morning (8AM–11AM)":  "08:00",
        "Midday (11AM–2PM)":   "11:00",
        "Afternoon (2PM–5PM)": "14:00",
        "Evening (5PM–7PM)":   "17:00"
    };

    const slotToTime = (slotValue) => SLOT_TIMES[slotValue] || "08:00";

    pickupDate.min = toISODate(today);

    const updateDeliveryMin = () => {
        if (pickupDate.value) {
            const d = new Date(pickupDate.value);
            d.setDate(d.getDate() + 1);
            deliveryDate.min = toISODate(d);
            if (deliveryDate.value && deliveryDate.value < deliveryDate.min) {
                deliveryDate.value = "";
            }
        }
    };

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    deliveryDate.min = toISODate(tomorrow);
    pickupDate.addEventListener("change", updateDeliveryMin);

    // Weather check on date change
    pickupDate.addEventListener("change", checkWeatherForDate);

    // ---- Step navigation ----
    const panels  = [...document.querySelectorAll(".step-panel")];
    const steps   = [...document.querySelectorAll("#stepIndicator li")];
    let currentStep = 1;

    const showStep = (n) => {
        panels.forEach(p => p.classList.toggle("active", +p.dataset.panel === n));
        steps.forEach(s => {
            const sn = +s.dataset.step;
            s.classList.toggle("is-active", sn === n);
            s.classList.toggle("is-done",   sn < n);
        });
        currentStep = n;
        window.scrollTo({ top: bookingApp.offsetTop - 40, behavior: "smooth" });
    };

    // ---- Validation ----
    const loadPrices = { Small: 150, Medium: 250, Large: 350 };

    const computeTotal = () => {
        const size  = document.getElementById("loadSize").value;
        const base  = loadPrices[size] || 0;
        const extra = selectedPackages ? selectedPackages.reduce((sum, pkg) => sum + (pkg.extra || 0), 0) : 0;
        return base + extra;
    };

    const validateStep1 = () => {
        const fields = ["fullName","contactNumber","address","loadSize","pickupDate","pickupSlot","deliveryDate","deliverySlot"];
        let valid = true;
        fields.forEach(id => {
            const input = document.getElementById(id);
            const field = input.closest(".field");
            if (!input.value) { field.classList.add("invalid"); valid = false; }
            else              { field.classList.remove("invalid"); }
        });
        return valid;
    };

    const validateStep2 = () => {
        const checked = document.querySelector('input[name="payment"]:checked');
        const err     = document.getElementById("paymentError");
        if (!checked) { err.style.display = "block"; return false; }
        err.style.display = "none";
        return true;
    };

    const buildReview = () => {
        const val     = id => document.getElementById(id).value;
        const payment = document.querySelector('input[name="payment"]:checked');
        const loadSel = document.getElementById("loadSize");
        const loadLabel = loadSel.value ? loadSel.options[loadSel.selectedIndex].text.split("—")[0].trim() : "—";

        const rows = [
            ["Name",            val("fullName")],
            ["Contact",         val("contactNumber")],
            ["Pickup address",  val("address")],
            ["Package",         selectedPackage ? selectedPackages.map(p => p.name).join(", ") : "—"],
            ["Load size",       loadLabel],
            ["Pickup",          `${val("pickupDate")} · ${val("pickupSlot")}`],
            ["Delivery",        `${val("deliveryDate")} · ${val("deliverySlot")}`],
            ["Payment",         payment ? payment.value : "—"],
            ["Total",           "₱" + computeTotal()]
        ];

        document.getElementById("reviewTicket").innerHTML = rows.map(
            ([label, value]) => `<div class="review-row"><span>${label}</span><span>${value}</span></div>`
        ).join("");
    };

    document.querySelectorAll("[data-next]").forEach(btn => {
        btn.addEventListener("click", () => {
            if (currentStep === 1 && !validateStep1()) return;
            if (currentStep === 2 && !validateStep2()) return;
            if (currentStep === 1) document.getElementById("paymentTotalAmount").textContent = "₱" + computeTotal();
            if (currentStep === 2) buildReview();
            showStep(currentStep + 1);
        });
    });

    document.querySelectorAll("[data-back]").forEach(btn => {
        btn.addEventListener("click", () => showStep(currentStep - 1));
    });

    document.querySelectorAll('input[name="payment"]').forEach(input => {
        input.addEventListener("change", () => {
            document.getElementById("paymentError").style.display = "none";
        });
    });

    // Intercept Enter key to proceed to next step instead of submitting early
    document.getElementById("bookingForm").addEventListener("keydown", (e) => {
        if (e.key === "Enter" && currentStep !== 3) {
            e.preventDefault(); // Stop normal form submit

            if (e.target.id === "address") {
                return; // Prevent Enter from jumping steps when typing address
            }

            const visibleNextBtn = document.querySelector(`.booking-step.is-active [data-next]`);
            if (visibleNextBtn) visibleNextBtn.click();
        }
    });

    // ---- Submit order to real backend ----
    document.getElementById("bookingForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        // Prevent premature submission if user presses Enter on Step 1 or 2
        if (currentStep !== 3) return;

        const val     = id => document.getElementById(id) ? document.getElementById(id).value : "";
        const payment = document.querySelector('input[name="payment"]:checked');
        const btn     = document.getElementById("confirmBtn");

        if (!btn) return;
        btn.disabled    = true;
        btn.textContent = "Placing order…";

        // Build proper datetime strings: date + mapped slot time
        const pickupDateTime   = `${val("pickupDate")}T${slotToTime(val("pickupSlot"))}:00`;
        const deliveryDateTime = `${val("deliveryDate")}T${slotToTime(val("deliverySlot"))}:00`;

        // Check if Online payment is selected
        if (payment && payment.value === "Online") {
            const modal = document.getElementById("paymentModal");
            const modalAmount = document.getElementById("modalAmount");
            const simBtn = document.getElementById("simulatePayBtn");
            const cancelBtn = document.getElementById("cancelPayBtn");

            modalAmount.textContent = "₱" + computeTotal();
            modal.style.display = "flex";

            // Return a promise that resolves when the user clicks a button in the modal
            const paymentSuccess = await new Promise((resolve) => {
                const onSim = () => { cleanup(); resolve(true); };
                const onCancel = () => { cleanup(); resolve(false); };

                const cleanup = () => {
                    simBtn.removeEventListener("click", onSim);
                    cancelBtn.removeEventListener("click", onCancel);
                    modal.style.display = "none";
                };

                simBtn.addEventListener("click", onSim);
                cancelBtn.addEventListener("click", onCancel);
            });

            if (!paymentSuccess) {
                btn.disabled = false;
                btn.textContent = "Confirm booking";
                showToast("Payment was cancelled.", "error");
                return;
            }
        }

        const isOnlinePaid = payment && payment.value === "Online";
        try {
            let createdOrders = [];
            for (const pkg of selectedPackages) {
                const res = await Orders.create({
                    package_id:       pkg.id,
                    pickup_address:   val("address"),
                    delivery_address: val("address"),
                    load_size:        val("loadSize"),
                    pickup_slot:      pickupDateTime,
                    delivery_slot:    deliveryDateTime,
                    payment_method:   payment ? payment.value : "Cash",
                    payment_status:   isOnlinePaid ? "Paid" : "Pending",
                    notes:            val("notes"),
                    map_lat:          pinnedLat,
                    map_lng:          pinnedLng
                });
                createdOrders.push(res.data);
            }

            const mainOrder = createdOrders[0];
            document.getElementById("successOrderCode").textContent = createdOrders.map(o => o.order_code).join(", ");
            document.getElementById("successPickupTime").textContent = new Date(mainOrder.pickup_slot).toLocaleString();
            
            const qrContainer = document.getElementById("successQRCode");
            if (qrContainer && mainOrder.qr_code_url) {
                qrContainer.innerHTML = createdOrders.map(o => `<img src="${o.qr_code_url}" alt="QR" style="width:80px;height:80px;border-radius:8px;margin-right:8px;">`).join("");
            }

            localStorage.removeItem(PACKAGE_KEY);

            showStep(4);
        } catch (err) {
            btn.disabled    = false;
            btn.textContent = "Confirm booking";
            showToast(err.message || "Could not place order. Please try again.", "error");
        }
    });

    // ---- Book another ----
    const bookAnotherBtn = document.getElementById("bookAnotherBtn");
    if (bookAnotherBtn) {
        bookAnotherBtn.addEventListener("click", () => {
            document.getElementById("bookingForm").reset();
            document.querySelectorAll(".field.invalid").forEach(f => f.classList.remove("invalid"));
            updateDeliveryMin();
            showStep(1);
        });
    }
}

// ---- Weather check ----
async function checkWeatherForDate() {
    const dateVal = document.getElementById("pickupDate").value;
    if (!dateVal) return;

    const weatherBanner = document.getElementById("weatherBanner");
    if (!weatherBanner) return;

    weatherBanner.style.display = "block";
    weatherBanner.textContent   = "Checking weather forecast…";
    weatherBanner.className     = "weather-banner weather-loading";

    try {
        const res = await Weather.check(dateVal);
        const w   = res.data;

        weatherBanner.className = `weather-banner ${w.warning ? "weather-warning" : "weather-clear"}`;
        
        if (w.icon) {
            weatherBanner.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; gap:16px; text-align:left;">
                    <div style="background:rgba(255,255,255,0.2); border-radius:16px; padding:4px;">
                        <img src="${w.icon}" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'" style="width:80px; height:80px; display:block; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
                    </div>
                    <div>
                        <div style="font-size:24px; font-weight:800; line-height:1; margin-bottom:4px;">${w.temp ? w.temp + '°C' : ''} ${w.condition}</div>
                        <div style="font-size:14px; font-weight:500; opacity:0.9;">${w.message}</div>
                    </div>
                </div>
            `;
        } else {
            weatherBanner.textContent = (w.warning ? '<i class="ph ph-cloud-rain"></i> ' : '<i class="ph ph-sun"></i> ') + w.message;
        }

    } catch (err) {
        weatherBanner.style.display = "none";
    }
}

let pinnedLat = null;
let pinnedLng = null;

function initMap() {
    const mapEl = document.getElementById("bookingMap");
    if (!mapEl) return;

    // TIP QC Coords
    const defaultLat = 14.6256536;
    const defaultLng = 121.0619890;

    // Initialize Leaflet Map
    const map = L.map('bookingMap').setView([defaultLat, defaultLng], 15);
    
    // Fix for Leaflet not rendering fully when initialized in a dynamic container
    setTimeout(() => {
        map.invalidateSize();
    }, 500);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Add draggable marker
    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

    // On drag end, save coordinates
    marker.on('dragend', function(e) {
        const pos = marker.getLatLng();
        pinnedLat = pos.lat;
        pinnedLng = pos.lng;
    });

    // On map click, move marker
    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        pinnedLat = e.latlng.lat;
        pinnedLng = e.latlng.lng;
    });

    // Auto-pin location with Shopee/Lazada style autocomplete
    const addressInput = document.getElementById("address");
    
    if (addressInput) {
        // Create dropdown container
        const dropdown = document.createElement("div");
        dropdown.id = "addressAutocomplete";
        dropdown.style.cssText = "display:none; position:absolute; top:100%; left:0; width:100%; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); z-index:1000; max-height:200px; overflow-y:auto; margin-top:4px;";
        
        // Ensure parent has position:relative
        addressInput.parentElement.style.position = "relative";
        addressInput.parentElement.appendChild(dropdown);

        let geocodeTimeout;

        addressInput.addEventListener("input", (e) => {
            clearTimeout(geocodeTimeout);
            const val = e.target.value.trim();
            if (val.length < 3) {
                dropdown.style.display = "none";
                return;
            }
            
            geocodeTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&countrycodes=ph`);
                    const data = await res.json();
                    
                    if (data && data.length > 0) {
                        dropdown.innerHTML = "";
                        data.forEach(item => {
                            const opt = document.createElement("div");
                            opt.style.cssText = "padding:10px 12px; font-size:13px; cursor:pointer; border-bottom:1px solid #f1f5f9; color:#1e293b; line-height:1.4;";
                            
                            // Format name nicely
                            let parts = item.display_name.split(',');
                            let shortName = parts.slice(0, 3).join(',').trim();
                            if(parts.length > 3) shortName += "...";
                            
                            opt.innerHTML = `<strong>${parts[0]}</strong><br/><span style="color:#64748b;font-size:11px;">${shortName}</span>`;
                            
                            opt.onmouseover = () => opt.style.background = "#f8fafc";
                            opt.onmouseout = () => opt.style.background = "#fff";
                            opt.onclick = () => {
                                addressInput.value = shortName;
                                dropdown.style.display = "none";
                                const lat = parseFloat(item.lat);
                                const lon = parseFloat(item.lon);
                                map.flyTo([lat, lon], 17);
                                marker.setLatLng([lat, lon]);
                                pinnedLat = lat;
                                pinnedLng = lon;
                            };
                            dropdown.appendChild(opt);
                        });
                        dropdown.style.display = "block";
                    } else {
                        dropdown.style.display = "none";
                    }
                } catch (err) {
                    dropdown.style.display = "none";
                }
            }, 600); // Fast 600ms debounce
        });

        // Hide when clicked outside
        document.addEventListener("click", (e) => {
            if (e.target !== addressInput && !dropdown.contains(e.target)) {
                dropdown.style.display = "none";
            }
        });
    }
}

init();
