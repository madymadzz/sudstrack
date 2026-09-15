// SudsTrack Login Page — connected to real backend API

function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect") || "../user/account.html";
}

function markInvalid(fieldId, msg) {
    const field = document.getElementById(fieldId);
    field.classList.add("invalid");
    const err = field.querySelector(".field-error");
    if (err && msg) err.textContent = msg;
}

function clearInvalid(fieldId) {
    const field = document.getElementById(fieldId);
    field.classList.remove("invalid");
}

// ---- Tab switching ----
const copy = {
    login:  { title: "Welcome back",      sub: "Log in to book and track your laundry." },
    signup: { title: "Create your account", sub: "Sign up once, then book and track anytime." }
};

function switchTab(name) {
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".auth-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === name));
    if (copy[name]) {
        const h1 = document.querySelector(".auth-card h1");
        const p  = document.querySelector(".auth-card .auth-sub");
        if (h1) h1.textContent = copy[name].title;
        if (p)  p.textContent = copy[name].sub;
    }
}

document.querySelectorAll("[data-tab]").forEach(el => {
    el.addEventListener("click", () => switchTab(el.dataset.tab));
});

// Redirect if already logged in
const params = new URLSearchParams(window.location.search);
const googleToken = params.get("google_token");

if (googleToken) {
    // We just returned from Google OAuth — exchange token for a session cookie
    const h1 = document.querySelector(".auth-card h1");
    const p  = document.querySelector(".auth-card .auth-sub");
    if (h1) h1.textContent = "Securing session...";
    if (p)  p.textContent = "Please wait.";
    
    // Quick inline fetch since this endpoint isn't mapped in api.js yet
    fetch(`http://127.0.0.1:3000/api/auth/google/session?t=${googleToken}`, { credentials: "include" })
        .then(res => {
            if (res.ok) {
                if (params.get("new_user") === "true") {
                    window.location.href = "complete-profile.html";
                } else {
                    window.location.href = getRedirectTarget();
                }
            } else {
                throw new Error("Session exchange failed");
            }
        })
        .catch(err => {
            console.error(err);
            window.location.href = "login.html?error=google_failed";
        });
} else {
    // Normal logged in check
    getCurrentUser().then(user => {
        if (user) window.location.href = getRedirectTarget();
    });
}

// ---- Log in ----
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email    = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const btn      = loginForm.querySelector("[type=submit]");

        let valid = true;
        if (!email || !email.includes("@")) { markInvalid("emailField", "Please enter a valid email."); valid = false; } else clearInvalid("emailField");
        if (!password || password.length < 6) { markInvalid("passwordField", "Password must be at least 6 characters."); valid = false; } else clearInvalid("passwordField");
        if (!valid) return;

        btn.disabled    = true;
        btn.textContent = "Logging in…";

        try {
            const res = await Auth.login(email, password);
            if (res && res.require_2fa) {
                // Show 2FA modal instead of redirecting
                document.getElementById('twoFactorModal').style.display = 'flex';
                window.tempLoginToken = res.temp_token;
                btn.disabled = false;
                btn.textContent = "Log in";
                return;
            }
            window.location.href = getRedirectTarget();
        } catch (err) {
            btn.disabled    = false;
            btn.textContent = "Log in";
            if (err.status === 429) {
                markInvalid("passwordField", err.message);
            } else {
                markInvalid("emailField", " ");
                markInvalid("passwordField", err.message || "Invalid email or password.");
            }
        }
    });
}

// ---- Sign up ----
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name     = document.getElementById("signupName").value.trim();
        const email    = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirm  = document.getElementById("signupConfirm").value;
        const btn      = signupForm.querySelector("[type=submit]");

        let valid = true;
        if (!name)  { markInvalid("signupNameField", "Please enter your full name."); valid = false; } else clearInvalid("signupNameField");
        if (!email || !email.includes("@")) { markInvalid("signupEmailField", "Please enter a valid email."); valid = false; } else clearInvalid("signupEmailField");
        if (!password || password.length < 6) { markInvalid("signupPasswordField", "Password must be at least 6 characters."); valid = false; } else clearInvalid("signupPasswordField");
        if (!confirm || confirm !== password) { markInvalid("signupConfirmField", "Passwords do not match."); valid = false; } else clearInvalid("signupConfirmField");
        if (!valid) return;

        btn.disabled    = true;
        btn.textContent = "Creating account…";

        try {
            await Auth.register(name, email, password);
            window.location.href = getRedirectTarget();
        } catch (err) {
            btn.disabled    = false;
            btn.textContent = "Create account";
            if (err.status === 409) {
                markInvalid("signupEmailField", "An account with this email already exists. Try Log in.");
            } else {
                showToast(err.message || "Registration failed.", "error");
            }
        }
    });
}

// ---- Continue with Google ----
const googleBtn = document.getElementById("googleBtn");
if (googleBtn) {
    googleBtn.addEventListener("click", () => Auth.loginWithGoogle());
}

// ---- 2FA Modal Logic ----
const verify2FABtn = document.getElementById("verify2FABtn");
if (verify2FABtn) {
    verify2FABtn.addEventListener("click", async () => {
        const code = document.getElementById("twoFactorCode").value.trim();
        const errObj = document.getElementById("twoFactorError");
        if (!code || code.length !== 6) {
            errObj.textContent = "Please enter a valid 6-digit code.";
            return;
        }
        
        verify2FABtn.disabled = true;
        verify2FABtn.textContent = "Verifying...";
        errObj.parentElement.classList.remove("invalid"); errObj.textContent = "";

        try {
            await apiFetch("/auth/verify-login-2fa", {
                method: "POST",
                body: JSON.stringify({ temp_token: window.tempLoginToken, code })
            });
            window.location.href = getRedirectTarget();
        } catch (err) {
            verify2FABtn.disabled = false;
            verify2FABtn.textContent = "Verify & Log in";
            errObj.parentElement.classList.add("invalid"); errObj.textContent = err.message || "Invalid 2FA code.";
        }
    });

    document.getElementById("cancel2FABtn").addEventListener("click", () => {
        document.getElementById('twoFactorModal').style.display = 'none';
        window.tempLoginToken = null;
    });
}

// ---- Forgot Password Flow ----
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", () => {
        document.getElementById("forgotPasswordModal").style.display = "flex";
        document.getElementById("forgotStep1").style.display = "block";
        document.getElementById("forgotStep2").style.display = "none";
        document.getElementById("forgotStep3").style.display = "none";
    });

    document.getElementById("closeForgotBtn").addEventListener("click", () => {
        document.getElementById("forgotPasswordModal").style.display = "none";
    });

    // Step 1: Send Email
    document.getElementById("sendResetCodeBtn").addEventListener("click", async () => {
        const email = document.getElementById("forgotEmail").value.trim();
        const errObj = document.getElementById("forgotEmailError");
        if (!email || !email.includes("@")) { errObj.parentElement.classList.add("invalid"); errObj.textContent = "Valid email required"; return; }
        
        const btn = document.getElementById("sendResetCodeBtn");
        btn.disabled = true; btn.textContent = "Sending..."; errObj.parentElement.classList.remove("invalid"); errObj.textContent = "";

        try {
            await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
            document.getElementById("forgotStep1").style.display = "none";
            document.getElementById("forgotStep2").style.display = "block";
        } catch (err) {
            errObj.parentElement.classList.add("invalid"); errObj.textContent = err.message || "Failed to send code.";
        } finally {
            btn.disabled = false; btn.textContent = "Send Code";
        }
    });

    // Step 2: Verify Code
    document.getElementById("verifyResetCodeBtn").addEventListener("click", async () => {
        const code = document.getElementById("resetCodeInput").value.trim();
        const errObj = document.getElementById("resetCodeError");
        if (code.length !== 6) { errObj.parentElement.classList.add("invalid"); errObj.textContent = "Enter 6 digits"; return; }
        
        const btn = document.getElementById("verifyResetCodeBtn");
        btn.disabled = true; btn.textContent = "Verifying..."; errObj.parentElement.classList.remove("invalid"); errObj.textContent = "";

        try {
            await apiFetch("/auth/verify-reset-code", { method: "POST", body: JSON.stringify({ token: code }) });
            window.resetTokenValid = code;
            document.getElementById("forgotStep2").style.display = "none";
            document.getElementById("forgotStep3").style.display = "block";
        } catch (err) {
            errObj.parentElement.classList.add("invalid"); errObj.textContent = err.message || "Invalid code.";
        } finally {
            btn.disabled = false; btn.textContent = "Verify Code";
        }
    });

    // Step 3: Save New Password
    document.getElementById("saveNewPasswordBtn").addEventListener("click", async () => {
        const password = document.getElementById("newPasswordInput").value;
        const errObj = document.getElementById("newPasswordError");
        if (password.length < 6) { errObj.parentElement.classList.add("invalid"); errObj.textContent = "Min 6 characters"; return; }

        const btn = document.getElementById("saveNewPasswordBtn");
        btn.disabled = true; btn.textContent = "Saving..."; errObj.parentElement.classList.remove("invalid"); errObj.textContent = "";

        try {
            await apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: window.resetTokenValid, newPassword: password }) });
            alert("Password reset successfully! Please log in with your new password.");
            window.location.href = "login.html";
        } catch (err) {
            errObj.parentElement.classList.add("invalid"); errObj.textContent = err.message || "Reset failed.";
            btn.disabled = false; btn.textContent = "Save Password";
        }
    });
}
