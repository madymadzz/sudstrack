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

        const previouslySelected = getSelectedPackage();

        grid.innerHTML = packages.map(pkg => `
            <label class="package-option">
                <input type="checkbox" name="package" value="${pkg.package_id}" ${previouslySelected && previouslySelected.find(p => p.id === pkg.package_id) ? "checked" : ""}>
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

        document.getElementById("continueToBooking").addEventListener("click", () => {
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

            localStorage.setItem(PACKAGE_KEY, JSON.stringify(selectedPackages));

            window.location.href = "booking.html";
        });

    } catch (err) {
        grid.innerHTML = `<p style="color:#dc2626;">Could not load packages. Please try again later.</p>`;
    }
}

// Restore any previously chosen package
function getSelectedPackage() {
    try {
        const raw = localStorage.getItem(PACKAGE_KEY);
        let parsed = raw ? JSON.parse(raw) : null;
        if (parsed && !Array.isArray(parsed)) {
            parsed = [parsed];
        }
        return parsed;
    } catch {
        return null;
    }
}

init();
