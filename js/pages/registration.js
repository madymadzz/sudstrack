// SudsTrack Registration Page — connected to real backend API

function markInvalid(fieldId, msg) {
    const field = document.getElementById(fieldId);
    field.classList.add("invalid");
    const err = field.querySelector(".field-error");
    if (err && msg) err.textContent = msg;
}

function clearInvalid(fieldId) {
    document.getElementById(fieldId).classList.remove("invalid");
}

const passwordInput = document.getElementById("password");
const confirmInput  = document.getElementById("confirmPassword");
const pwLenCheck    = document.getElementById("pwLenCheck");
const pwMatchCheck  = document.getElementById("pwMatchCheck");

function updateChecklist() {
    pwLenCheck.classList.toggle("met",   passwordInput.value.length >= 6);
    pwMatchCheck.classList.toggle("met", confirmInput.value.length > 0 && confirmInput.value === passwordInput.value);
}

passwordInput.addEventListener("input", updateChecklist);
confirmInput.addEventListener("input",  updateChecklist);

// Enable/disable register button based on both checkboxes
const consentTerms   = document.getElementById("consentTerms");
const consentPrivacy = document.getElementById("consentPrivacy");
const registerBtn    = document.getElementById("registerBtn");

function updateRegisterBtn() {
    if (registerBtn) {
        registerBtn.disabled = !(consentTerms && consentTerms.checked && consentPrivacy && consentPrivacy.checked);
    }
}

if (consentTerms)   consentTerms.addEventListener("change", updateRegisterBtn);
if (consentPrivacy) consentPrivacy.addEventListener("change", updateRegisterBtn);

// Redirect if already logged in
getCurrentUser().then(user => {
    if (user) window.location.href = "../../index.html";
});

const registrationForm = document.getElementById("registrationForm");

registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name     = document.getElementById("fullName").value.trim();
    const email    = document.getElementById("email").value.trim();
    const password = passwordInput.value;
    const confirm  = confirmInput.value;
    const termsOk  = consentTerms  && consentTerms.checked;
    const privOk   = consentPrivacy && consentPrivacy.checked;
    const btn      = registrationForm.querySelector("[type=submit]");

    let valid = true;
    if (!name)  { markInvalid("nameField", "Please enter your full name."); valid = false; }    else clearInvalid("nameField");
    if (!email || !email.includes("@")) { markInvalid("emailField", "Please enter a valid email."); valid = false; } else clearInvalid("emailField");
    if (!password || password.length < 6) { markInvalid("passwordField", "Minimum 6 characters."); valid = false; }  else clearInvalid("passwordField");
    if (!confirm || confirm !== password) { markInvalid("confirmField", "Passwords do not match."); valid = false; }  else clearInvalid("confirmField");

    // Validate consent checkboxes
    if (!termsOk) {
        document.getElementById("consentTermsField").classList.add("invalid");
        valid = false;
    } else {
        document.getElementById("consentTermsField").classList.remove("invalid");
    }
    if (!privOk) {
        document.getElementById("consentPrivacyField").classList.add("invalid");
        valid = false;
    } else {
        document.getElementById("consentPrivacyField").classList.remove("invalid");
    }

    if (!valid) return;

    btn.disabled    = true;
    btn.textContent = "Creating account\u2026";

    try {
        await Auth.register(name, email, password, true, true);
        window.location.href = "../../index.html";
    } catch (err) {
        btn.disabled    = false;
        btn.textContent = "Create account";
        if (err.status === 409) {
            markInvalid("emailField", "An account with this email already exists. Try logging in instead.");
        } else {
            showToast(err.message || "Registration failed. Please try again.", "error");
        }
    }
});

const googleBtn = document.getElementById("googleBtn");
if (googleBtn) {
    googleBtn.addEventListener("click", () => Auth.loginWithGoogle());
}
