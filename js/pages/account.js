// SudsTrack Account Page — connected to real backend API

const authGate  = document.getElementById("authGate");
const accountApp = document.getElementById("accountApp");
let currentUser  = null;

async function init() {
    currentUser = await getCurrentUser();

    if (!currentUser) {
        authGate.style.display   = "block";
        accountApp.style.display = "none";
        return;
    }

    authGate.style.display   = "none";
    accountApp.style.display = "block";
    startAccountApp();
}

function startAccountApp() {
    // ---- Profile header ----
    const fullName = currentUser.full_name || "Customer";
    const initials = fullName.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "SC";
    document.getElementById("profileName").textContent  = fullName;
    document.getElementById("profileEmail").textContent = currentUser.email || "—";

    // Show profile picture or initials
    const avatarEl = document.getElementById("avatarInitials");
    if (currentUser.profile_picture) {
        avatarEl.innerHTML = `<img src="${currentUser.profile_picture}" alt="Profile" style="width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;">`;
        avatarEl.textContent = "";
    } else {
        avatarEl.textContent = initials;
    }

    // ---- Profile picture upload ----
    const avatarWrapper = document.getElementById("avatarWrapper");
    const fileInput     = document.getElementById("avatarFileInput");
    if (avatarWrapper && fileInput) {
        avatarWrapper.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", async () => {
            const file = fileInput.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                showToast("Image must be under 2MB.", "error");
                fileInput.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataURI = ev.target.result;
                try {
                    await Account.uploadProfilePicture(dataURI);
                    currentUser.profile_picture = dataURI;
                    avatarEl.innerHTML = `<img src="${dataURI}" alt="Profile" style="width:64px;height:64px;border-radius:50%;object-fit:cover;display:block;">`;
                    showToast("Profile picture updated!");
                } catch (err) {
                    showToast(err.message || "Could not upload photo.", "error");
                }
                fileInput.value = "";
            };
            reader.readAsDataURL(file);
        });
    }

    if (currentUser.contact_number) document.getElementById("profileContact").value = currentUser.contact_number;
    if (currentUser.address)        document.getElementById("profileAddress").value  = currentUser.address;

    // ---- Save profile ----
    document.getElementById("profileForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const contact = document.getElementById("profileContact").value;
        const address = document.getElementById("profileAddress").value;
        const btn     = e.target.querySelector("[type=submit]");

        btn.disabled    = true;
        btn.textContent = "Saving…";

        try {
            await Account.updateProfile(contact, address);
            currentUser.contact_number = contact;
            currentUser.address        = address;

            const msg = document.getElementById("profileSaved");
            if (msg) { msg.classList.add("show"); setTimeout(() => msg.classList.remove("show"), 2000); }
            showToast("Profile updated successfully.");
        } catch (err) {
            showToast(err.message || "Could not update profile.", "error");
        } finally {
            btn.disabled    = false;
            btn.textContent = "Save changes";
        }
    });

    // ---- Change Password ----
    const passwordForm = document.getElementById("passwordForm");
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const currentPw = document.getElementById("currentPassword").value;
            const newPw = document.getElementById("newPassword").value;
            const btn = e.target.querySelector("[type=submit]");
            
            btn.disabled = true;
            btn.textContent = "Changing...";
            
            try {
                await Account.changePassword(currentPw, newPw);
                showToast("Password changed successfully.");
                passwordForm.reset();
            } catch (err) {
                showToast(err.message || "Failed to change password.", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = "Change password";
            }
        });
    }

    // ---- 2FA Logic ----
    const twoFactorStatus = document.getElementById("twoFactorStatus");
    const twoFactorSetup = document.getElementById("twoFactorSetup");
    const btnSetup2FA = document.getElementById("btnSetup2FA");
    const btnDisable2FA = document.getElementById("btnDisable2FA");
    const btnVerify2FA = document.getElementById("btnVerify2FA");
    const twoFactorQR = document.getElementById("twoFactorQR");
    const twoFactorCode = document.getElementById("twoFactorCode");

    const update2FAUI = (isEnabled) => {
        if (isEnabled) {
            twoFactorStatus.textContent = "Enabled";
            twoFactorStatus.style.background = "#dcfce7";
            twoFactorStatus.style.color = "#16a34a";
            btnSetup2FA.style.display = "none";
            btnDisable2FA.style.display = "inline-block";
            twoFactorSetup.style.display = "none";
        } else {
            twoFactorStatus.textContent = "Disabled";
            twoFactorStatus.style.background = "#fee2e2";
            twoFactorStatus.style.color = "#dc2626";
            btnSetup2FA.style.display = "inline-block";
            btnDisable2FA.style.display = "none";
        }
    };

    // Initialize 2FA UI state from currentUser
    if (currentUser.two_factor_enabled) {
        update2FAUI(true);
    }

    if (btnSetup2FA) {
        btnSetup2FA.addEventListener("click", async () => {
            btnSetup2FA.disabled = true;
            btnSetup2FA.textContent = "Loading...";
            try {
                const res = await Account.setup2FA();
                twoFactorQR.innerHTML = `<img src="${res.data.qr_code_url}" alt="2FA QR Code" style="width:150px;height:150px;">`;
                twoFactorSetup.style.display = "block";
                btnSetup2FA.style.display = "none";
            } catch (err) {
                showToast(err.message || "Failed to generate 2FA setup.", "error");
                btnSetup2FA.disabled = false;
                btnSetup2FA.textContent = "Set up 2FA";
            }
        });
    }

    if (btnVerify2FA) {
        btnVerify2FA.addEventListener("click", async () => {
            const token = twoFactorCode.value.trim();
            if (!token || token.length !== 6) {
                showToast("Please enter a valid 6-digit code.", "error");
                return;
            }
            btnVerify2FA.disabled = true;
            btnVerify2FA.textContent = "Verifying...";
            try {
                await Account.verify2FA(token);
                showToast("Two-Factor Authentication enabled successfully!");
                currentUser.two_factor_enabled = true;
                update2FAUI(true);
                twoFactorCode.value = "";
            } catch (err) {
                showToast(err.message || "Invalid 2FA code.", "error");
            } finally {
                btnVerify2FA.disabled = false;
                btnVerify2FA.textContent = "Verify & Enable";
            }
        });
    }

    if (btnDisable2FA) {
        btnDisable2FA.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
            btnDisable2FA.disabled = true;
            btnDisable2FA.textContent = "Disabling...";
            try {
                await Account.disable2FA();
                showToast("Two-Factor Authentication disabled.");
                currentUser.two_factor_enabled = false;
                update2FAUI(false);
            } catch (err) {
                showToast(err.message || "Failed to disable 2FA.", "error");
                btnDisable2FA.disabled = false;
                btnDisable2FA.textContent = "Disable 2FA";
            }
        });
    }

    // ---- Log out ----
    document.getElementById("logoutBtn").addEventListener("click", async () => {
        try {
            await Auth.logout();
        } catch {}
        window.location.href = "../../index.html";
    });

    