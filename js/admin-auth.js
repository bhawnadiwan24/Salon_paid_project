import {
    auth, signInWithPopup, googleProvider, onAuthStateChanged, signOut
} from './firebase.js';

// ---- AUTH CONFIGURATION ----
const ALLOWED_EMAILS = [
    'bhawnadiwan24@navgurukul.org',
    'arjunssalonjsp@gmail.com'
];

const loginBtn = document.getElementById('googleLoginBtn');
const authMessage = document.getElementById('authMessage');
const loginOverlay = document.getElementById('loginOverlay');

// ---- AUTH HELPERS ----
const showAuthError = (msg) => {
    if (authMessage) {
        authMessage.style.display = 'block';
        authMessage.style.background = '#ffe3e3';
        authMessage.style.color = '#d63031';
        authMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
    }
};

const clearAuthError = () => {
    if (authMessage) {
        authMessage.style.display = 'none';
    }
};

// ---- AUTH FLOW ----

// 1. Google Login Function
async function handleGoogleLogin() {
    try {
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        }
        clearAuthError();

        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        if (ALLOWED_EMAILS.includes(user.email)) {
            // Success! Authorized
            window.location.href = 'admin-dashboard.html';
        } else {
            // NOT Authorized
            showAuthError("Access Denied: Your email is not authorized for admin access.");
            await signOut(auth); // Sign out immediately if not authorized
        }
    } catch (error) {
        console.error("Login Error:", error);
        showAuthError("Login failed: " + error.message);
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width: 18px; height: 18px; margin-right: 10px;">
                Continue with Google
            `;
        }
    }
}

// 2. Auth State Listener for Login Page
if (window.location.pathname.includes('secure-access.html')) {
    onAuthStateChanged(auth, (user) => {
        if (user && ALLOWED_EMAILS.includes(user.email)) {
            // Already logged in and authorized? Go to dashboard
            window.location.href = 'admin-dashboard.html';
        } else if (user) {
            // Logged in but NOT authorized
            signOut(auth);
        }
    });

    if (loginBtn) {
        loginBtn.addEventListener('click', handleGoogleLogin);
    }
}

export { ALLOWED_EMAILS };
