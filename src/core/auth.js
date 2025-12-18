/**
 * Authentication UI Management
 * Updates UI based on authentication state
 */

import { AuthService } from '../services/authService.js';
import { showToast } from '../utils/toast.js';

export async function updateUIForAuth(session) {
    const sidebar = document.getElementById("sidebar");
    const mainLayout = document.getElementById("mainLayout") || document.querySelector(".main-layout");
    const loginPage = document.getElementById("loginPage");
    const userMenu = document.getElementById("userMenu");
    const loginBtn = document.getElementById("loginBtn");
    const userEmail = document.getElementById("userEmail");
    const userManagementNavItem = document.getElementById("userManagementNavItem");

    if (session && session.user) {
        // User is authenticated
        if (sidebar) sidebar.style.display = "flex";
        if (mainLayout) mainLayout.style.display = "flex";
        if (loginPage) loginPage.style.display = "none";
        if (userMenu) userMenu.style.display = "flex";
        if (loginBtn) loginBtn.style.display = "none";
        if (userEmail) userEmail.textContent = session.user.email || "";

        // Check if user is admin
        const isAdmin = await AuthService.isAdmin(session.user.id);
        if (userManagementNavItem) {
            userManagementNavItem.style.display = isAdmin ? "block" : "none";
        }
        // Show app settings nav item for admins (legacy markup uses id="appSettingsNavItem")
        const appSettingsNavItem = document.getElementById("appSettingsNavItem");
        if (appSettingsNavItem) {
            appSettingsNavItem.style.display = isAdmin ? "block" : "none";
        }
    } else {
        // User is not authenticated
        if (sidebar) sidebar.style.display = "none";
        if (mainLayout) mainLayout.style.display = "none";
        if (loginPage) loginPage.style.display = "flex";
        if (userMenu) userMenu.style.display = "none";
        if (loginBtn) loginBtn.style.display = "block";
        if (userManagementNavItem) userManagementNavItem.style.display = "none";
    }
}

/**
 * Initialize authentication UI handlers (logout, minimal login wiring)
 * Exported so the app bootstrap can call it (dynamic import expects this function).
 */
export function initializeAuthentication() {
    // Wire logout button to AuthService.signOut
    try {
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            // remove any previous handler we attached in earlier init to avoid duplicates
            const prev = logoutBtn.__mod_logout_handler;
            if (prev) {
                try { logoutBtn.removeEventListener('click', prev); } catch (e) { /* ignore */ }
            }

            const handler = async (e) => {
                try {
                    e && e.preventDefault && e.preventDefault();
                    const result = await AuthService.signOut();
                    if (result && result.success === false && result.error) {
                        throw new Error(result.error);
                    }
                    showToast("Logged out successfully", "success");
                    updateUIForAuth(null);
                    // Navigate to dashboard home after logout
                    try { window.history.replaceState(null, '', '/pms/dashboard'); } catch (e) {}
                } catch (err) {
                    console.error("Logout error:", err);
                    showToast("Error logging out: " + (err.message || "Unknown error"), "error");
                }
            };

            logoutBtn.__mod_logout_handler = handler;
            logoutBtn.addEventListener('click', handler);
        }
    } catch (err) {
        console.error('initializeAuthentication error', err);
    }
    // Wire login UI (button and form) to AuthService.signIn
    try {
        const loginBtn = document.getElementById("loginBtn");
        const loginPage = document.getElementById("loginPage");
        const loginForm = document.getElementById("loginForm");
        const loginError = document.getElementById("loginError");

        if (loginBtn) {
            const prevBtn = loginBtn.__mod_login_btn_handler;
            if (prevBtn) {
                try { loginBtn.removeEventListener('click', prevBtn); } catch (e) {}
            }
            const btnHandler = (e) => {
                e && e.preventDefault && e.preventDefault();
                if (loginPage) loginPage.style.display = "flex";
            };
            loginBtn.__mod_login_btn_handler = btnHandler;
            loginBtn.addEventListener('click', btnHandler);
        }

        if (loginForm) {
            const prev = loginForm.__mod_login_handler;
            if (prev) {
                try { loginForm.removeEventListener('submit', prev); } catch (e) {}
            }
            const submitHandler = async (e) => {
                e.preventDefault();
                try {
                    if (loginError) { loginError.style.display = 'none'; loginError.textContent = ''; }
                    const emailEl = document.getElementById("loginEmail");
                    const passEl = document.getElementById("loginPassword");
                    const email = emailEl ? (emailEl.value || '').trim() : '';
                    const password = passEl ? (passEl.value || '') : '';
                    if (!email || !password) {
                        if (loginError) { loginError.textContent = 'Please enter email and password.'; loginError.style.display = 'block'; }
                        return;
                    }
                    const result = await AuthService.signIn(email, password);
                    if (!result || result.success === false) {
                        const msg = (result && result.error) ? result.error : 'Login failed';
                        if (loginError) { loginError.textContent = msg; loginError.style.display = 'block'; }
                        return;
                    }
                    // Refresh session and update UI
                    const session = await AuthService.checkAuthState();
                    updateUIForAuth(session);
                    if (loginPage) loginPage.style.display = 'none';
                    try { window.history.replaceState(null, '', '/pms/dashboard'); } catch (e) {}
                    showToast('Login successful', 'success');
                } catch (err) {
                    console.error('Login error:', err);
                    if (loginError) { loginError.textContent = err.message || 'Login failed'; loginError.style.display = 'block'; }
                }
            };
            loginForm.__mod_login_handler = submitHandler;
            loginForm.addEventListener('submit', submitHandler);
        }
    } catch (err) {
        console.error('initializeAuthentication (login) error', err);
    }
}
