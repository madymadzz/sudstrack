// SudsTrack Packages Page — connected to real backend API

const authGate = document.getElementById("authGate");
const packagesApp = document.getElementById("packagesApp");
const PACKAGE_KEY = "sudstrack_package"; // Kept for booking.js compatibility

async function init() {
    // Packages page should be public. 
    // Auth is only required when proceeding to booking.html (handled in booking.js).
    if (authGate) authGate.style.display = "none";
    if (packagesApp) packagesApp.style.display = "block";
    startPackagesApp();
}

async function startPackagesApp() {
    const grid = document.getElementById("packageGrid");
    grid.innerHTML = "<p>Loading packages...</p>";

    try {
        const res = await Packages.getAll();
        const packages = res.data;

        // Icons matching original IDs (fallback to laundry basket)
        const icons = {
            1: '<i class="ph ph-basket"></i>', // Wash & Fold
            2: '<i class="ph ph-coat-hanger"></i>', // Wash & Iron
            3: '<i class="ph ph-coat"></i>', // Dry Clean
            4: '<i class="ph ph-lightning"></i>'  // Express
        };

        grid.innerHTML = packages.map(pkg => `
            <label class="package-option">
                <input type="checkbox" name="package" value="${pkg.package_id}">
                <span class="package-card">
                    <span class="package-icon" aria-hidden="true">${icons[pkg.package_id] || '<i class="ph ph-basket"></i>'}</span>
                    <span class="package-name">${pkg.package_name}</span>
                    <span class="package-desc">${pkg.description || ""}</span>
                    <span class="package-price">${pkg.price > 0 ? '+₱' + pkg.price + ' on top of your load price' : 'No extra charge'}</span>
                </span>
            </label>
        `).join("");

        // Hide error as soon as a choice is made
        document.querySelectorAll('input[name="package"]').forEach(input => {
            input.addEventListener("change", () => {
                document.getElementById("packageError").classList.remove("visible");
            });
        });

        const updateCartUI = () => {
            const cart = getCart();
            const badge = document.getElementById("navCartBadge");
            const modalItems = document.getElementById("cartModalItems");
            const checkoutBtn = document.getElementById("checkoutBtn");

            // Update badge
            if (cart.length > 0) {
                badge.style.display = "block";
                badge.textContent = cart.length;
                checkoutBtn.disabled = false;
                checkoutBtn.style.opacity = "1";
            } else {
                badge.style.display = "none";
                checkoutBtn.disabled = true;
                checkoutBtn.style.opacity = "0.5";
            }

            // Update modal list
            if (cart.length > 0) {
                modalItems.innerHTML = cart.map((item, idx) => {
                    const pkgs = item.packages.map(p => p.name).join(", ");
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px;">
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <strong>Load ${idx + 1}: ${item.loadSize}</strong>
                                <span style="color:#64748b; font-size:12px;">${pkgs}</span>
                            </div>
                            <button type="button" onclick="window.removeCartItem(${idx})" style="background:#fee2e2; border:none; color:#dc2626; cursor:pointer; width:32px; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center;" title="Remove this load">
                                <i class="ph ph-trash" style="font-size:16px;"></i>
                            </button>
                        </div>
                    `;
                }).join("");
            } else {
                modalItems.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px 0;">Your cart is empty.</p>`;
            }
        };

        window.removeCartItem = (index) => {
            const cart = getCart();
            cart.splice(index, 1);
            saveCart(cart);
            updateCartUI();
        };

        // Modal triggers
        const cartModal = document.getElementById("cartModal");
        document.getElementById("navCartIcon").addEventListener("click", (e) => {
            e.preventDefault();
            updateCartUI();
            cartModal.style.display = "flex";
        });
        
        document.getElementById("closeCartModal").addEventListener("click", () => {
            cartModal.style.display = "none";
        });

        // Close when clicking outside
        cartModal.addEventListener("click", (e) => {
            if (e.target === cartModal) cartModal.style.display = "none";
        });

        updateCartUI(); // initial

        document.getElementById("addToCartBtn").addEventListener("click", () => {
            const checkedBoxes = document.querySelectorAll('input[name="package"]:checked');

            if (checkedBoxes.length === 0) {
                document.getElementById("packageError").classList.add("visible");
                return;
            }

            const selectedPackages = [];
            checkedBoxes.forEach(box => {
                const chosen = packages.find(p => p.package_id == box.value);
                if (chosen) {
                    selectedPackages.push({
                        id: chosen.package_id,
                        name: chosen.package_name,
                        extra: Number(chosen.price)
                    });
                }
            });

            const loadSize = document.getElementById("cartLoadSize").value;
            
            const cart = getCart();
            cart.push({
                packages: selectedPackages,
                loadSize: loadSize
            });
            saveCart(cart);
            
            updateCartUI();
            
            // Uncheck boxes to allow adding another load
            checkedBoxes.forEach(box => box.checked = false);
            showToast("Added to cart! You can add another load or proceed to checkout.", "success");
        });

        document.getElementById("checkoutBtn").addEventListener("click", () => {
            const cart = getCart();
            if (cart.length > 0) {
                window.location.href = "booking.html";
            }
        });

    } catch (err) {
        grid.innerHTML = `<p style="color:#dc2626;">Could not load packages. Please try again later.</p>`;
    }
}

// Restore any previously chosen package
function getCart() {
    try {
        const raw = localStorage.getItem("sudstrack_cart");
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem("sudstrack_cart", JSON.stringify(cart));
}

init();
