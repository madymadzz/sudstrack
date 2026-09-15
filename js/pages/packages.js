// SudsTrack Packages Page — connected to real backend API

const authGate = document.getElementById("authGate");
const packagesApp = document.getElementById("packagesApp");
const PACKAGE_KEY = "sudstrack_package"; // Kept for booking.js compatibility

async function init() {
    const user = await getCurrentUser();

    if (!user) {
        authGate.style.display = "block";
        packagesApp.style.display = "none";
        return;
    }

    authGate.style.display = "none";
    packagesApp.style.display = "block";
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
            1: "🧺", // Wash & Fold
            2: "👔", // Wash & Iron
            3: "🧥", // Dry Clean
            4: "⚡"  // Express
        };

        const previouslySelected = getSelectedPackage();

        grid.innerHTML = packages.map(pkg => `
            <label class="package-option">
                <input type="radio" name="package" value="${pkg.package_id}" ${previouslySelected && previouslySelected.id === pkg.package_id ? "checked" : ""}>
                <span class="package-card">
                    <span class="package-icon" aria-hidden="true">${icons[pkg.package_id] || "🧺"}</span>
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
            const checked = document.querySelector('input[name="package"]:checked');

            if (!checked) {
                document.getElementById("packageError").classList.add("visible");
                return;
            }

            const chosen = packages.find(p => p.package_id == checked.value);
            // Save in the format booking.js expects: { id, name, extra }
            const packageDataToSave = {
                id: chosen.package_id,
                name: chosen.package_name,
                extra: Number(chosen.price)
            };
            localStorage.setItem(PACKAGE_KEY, JSON.stringify(packageDataToSave));

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
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

init();
