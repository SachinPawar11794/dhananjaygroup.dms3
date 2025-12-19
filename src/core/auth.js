/**
 * Authentication UI Management
 * Updates UI based on authentication state
 */

import { AuthService } from '../services/authService.js';
import { showToast } from '../utils/toast.js';
import profileStore from '../stores/profileStore.js';
import { Navigation } from './navigation.js';

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

        // Refresh and store profile globally
        const profile = await profileStore.refreshProfile();
        // Expose quick refresh helper
        try { window.refreshProfile = profileStore.refreshProfile; } catch (e) {}

        if (userEmail) userEmail.textContent = (profile && (profile.full_name || profile.email)) || session.user.email || "";
        // Also set sidebar user name for mobile sidebar
        try {
            const displayName = (profile && (profile.full_name || profile.email)) || session.user.email || "";
            const sidebarUserEmail = document.getElementById('sidebarUserEmail');
            if (sidebarUserEmail) sidebarUserEmail.textContent = displayName;
            // Ensure sidebar footer is present (CSS controls visibility)
            const sidebarFooter = document.getElementById('sidebarFooter');
            if (sidebarFooter) sidebarFooter.style.display = '';
        } catch (err) { /* ignore */ }

        const isAdmin = profile && profile.role === 'admin';
        const isHod = profile && profile.role === 'hod';
        // Show user management to admins and HODs (HOD will be restricted further in the management UI)
        if (userManagementNavItem) {
            userManagementNavItem.style.display = (isAdmin || isHod) ? "block" : "none";
        }
        // Show app settings nav item for admins only (legacy markup uses id="appSettingsNavItem")
        const appSettingsNavItem = document.getElementById("appSettingsNavItem");
        if (appSettingsNavItem) {
            appSettingsNavItem.style.display = isAdmin ? "block" : "none";
        }

        // If the user exists but their profile is present and not approved (and they are not admin),
        // show a Pending Approval page and poll for approval.
        const pendingPage = document.getElementById('pendingApprovalPage');
        const pendingRefreshBtn = document.getElementById('pendingRefreshBtn');
        if (profile && profile.is_approved === false && profile.role !== 'admin') {
            // Show pending page and hide main layout
            if (pendingPage) pendingPage.style.display = 'block';
            if (mainLayout) mainLayout.style.display = 'none';

            // Wire refresh button
            if (pendingRefreshBtn) {
                pendingRefreshBtn.onclick = async () => {
                    const refreshed = await profileStore.refreshProfile();
                    if (refreshed && refreshed.is_approved) {
                        // Approved - navigate to dashboard
                        try { Navigation.navigateToPath('/pms/dashboard'); } catch (e) {}
                        // Re-run UI update
                        await updateUIForAuth(session);
                    } else {
                        showToast('Still pending approval', 'info');
                    }
                };
            }

            // Start a poll (if not already started) to refresh profile every 12 seconds
            if (!window.__pendingApprovalPoll) {
                window.__pendingApprovalPoll = setInterval(async () => {
                    const refreshed = await profileStore.refreshProfile();
                    if (refreshed && refreshed.is_approved) {
                        clearInterval(window.__pendingApprovalPoll);
                        window.__pendingApprovalPoll = null;
                        try { Navigation.navigateToPath('/pms/dashboard'); } catch (e) {}
                        await updateUIForAuth(session);
                    }
                }, 12000);
            }

            // Do not continue rendering the main app for unapproved users
            return;
        } else {
            if (pendingPage) pendingPage.style.display = 'none';
            if (window.__pendingApprovalPoll) {
                clearInterval(window.__pendingApprovalPoll);
                window.__pendingApprovalPoll = null;
            }
        }

        // Route by role (map to the dashboard page; only navigate if current path is root/login)
        const role = profile && profile.role ? profile.role : 'operator';
        const rolePathMap = {
            operator: '/pms/dashboard',
            hod: '/pms/dashboard',
            admin: '/pms/dashboard'
        };
        try {
            const currentPath = (window.location && window.location.pathname) ? window.location.pathname : '';
            const shouldAutoNavigate = currentPath === '' || currentPath === '/' || currentPath.includes('/login') || (loginPage && loginPage.style.display === 'flex');
            if (shouldAutoNavigate) {
                Navigation.navigateToPath(rolePathMap[role] || '/pms/dashboard');
            }
        } catch (e) { /* navigation best-effort */ }
    } else {
        // User is not authenticated
        if (sidebar) sidebar.style.display = "none";
        if (mainLayout) mainLayout.style.display = "none";
        if (loginPage) loginPage.style.display = "flex";
        if (userMenu) userMenu.style.display = "none";
        if (loginBtn) loginBtn.style.display = "block";
        if (userManagementNavItem) userManagementNavItem.style.display = "none";
        // Hide sidebar footer when logged out
        try {
            const sidebarFooter = document.getElementById('sidebarFooter');
            if (sidebarFooter) sidebarFooter.style.display = 'none';
        } catch (err) {}
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
                    // Navigate to app root after logout (do not force PMS dashboard)
                    try { window.history.replaceState(null, '', '/'); } catch (e) {}
                } catch (err) {
                    console.error("Logout error:", err);
                    showToast("Error logging out: " + (err.message || "Unknown error"), "error");
                }
            };

            logoutBtn.__mod_logout_handler = handler;
            logoutBtn.addEventListener('click', handler);
        }
        // Wire sidebar logout button to the same handler (mobile)
        try {
            const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
            if (sidebarLogoutBtn) {
                const prev = sidebarLogoutBtn.__mod_logout_handler;
                if (prev) {
                    try { sidebarLogoutBtn.removeEventListener('click', prev); } catch (e) {}
                }
                const sbHandler = (e) => {
                    try {
                        // Prefer invoking the header logout if present to reuse handler
                        const headerLogout = document.getElementById('logoutBtn');
                        if (headerLogout) {
                            headerLogout.click();
                            return;
                        }
                        // Fallback: call AuthService.signOut directly
                        AuthService.signOut();
                    } catch (err) {
                        console.error('Sidebar logout failed', err);
                    }
                };
                sidebarLogoutBtn.__mod_logout_handler = sbHandler;
                sidebarLogoutBtn.addEventListener('click', sbHandler);
            }
        } catch (err) {
            console.warn('sidebar logout wiring failed', err);
        }
        // Toggle user dropdown when username is clicked
        try {
            const userMenuButton = document.getElementById('userMenuButton');
            const userDropdown = document.getElementById('userDropdown');
            const userMenu = document.getElementById('userMenu');
            if (userMenuButton && userDropdown) {
                const toggle = (e) => {
                    e && e.preventDefault && e.preventDefault();
                    const isOpen = userDropdown.style.display === 'block';
                    userDropdown.style.display = isOpen ? 'none' : 'block';
                    userMenuButton.setAttribute('aria-expanded', String(!isOpen));
                };
                // remove existing handler if present
                const prevToggle = userMenuButton.__mod_toggle_handler;
                if (prevToggle) {
                    try { userMenuButton.removeEventListener('click', prevToggle); } catch (e) {}
                }
                userMenuButton.__mod_toggle_handler = toggle;
                userMenuButton.addEventListener('click', toggle);

                // Close dropdown when clicking outside
                const outsideHandler = (ev) => {
                    try {
                        if (!userMenu.contains(ev.target)) {
                            userDropdown.style.display = 'none';
                            userMenuButton.setAttribute('aria-expanded', 'false');
                        }
                    } catch (e) {}
                };
                // store so we can remove later if needed
                if (!document.__mod_user_outside_handler) {
                    document.__mod_user_outside_handler = outsideHandler;
                    document.addEventListener('click', outsideHandler);
                }
            }
        } catch (err) {
            console.warn('user menu toggle wiring failed', err);
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
                    try { window.history.replaceState(null, '', window.location.pathname || '/'); } catch (e) {}
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
    // Auth tab switching and signup handling (login page)
    try {
        const authTabs = document.querySelectorAll(".auth-tab");
        const signupForm = document.getElementById("signupForm");
        const switchToSignupLink = document.getElementById("switchToSignupLink");
        const switchToLoginLink = document.getElementById("switchToLoginLink");
        const forgotPasswordLink = document.getElementById("forgotPasswordLink");
        const signupError = document.getElementById("signupError");

        const switchToTab = (tabName) => {
            const targetTab = document.querySelector(`.auth-tab[data-tab="${tabName}"]`);
            if (targetTab) targetTab.click();
        };

        authTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                const targetTab = tab.getAttribute("data-tab");
                authTabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                // Show/hide login/signup forms
                if (loginForm) loginForm.classList.toggle("active", targetTab === "login");
                if (signupForm) signupForm.classList.toggle("active", targetTab === "signup");
            });
        });

        if (switchToSignupLink) {
            switchToSignupLink.addEventListener("click", (e) => {
                e.preventDefault();
                switchToTab("signup");
            });
        }
        if (switchToLoginLink) {
            switchToLoginLink.addEventListener("click", (e) => {
                e.preventDefault();
                switchToTab("login");
            });
        }
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener("click", (e) => {
                e.preventDefault();
                showToast("Please contact your administrator to reset password.", "info");
            });
        }

        if (signupForm) {
            const prev = signupForm.__mod_signup_handler;
            if (prev) {
                try { signupForm.removeEventListener('submit', prev); } catch (e) {}
            }
            const submitHandler = async (e) => {
                e.preventDefault();
                try {
                    if (signupError) { signupError.style.display = 'none'; signupError.textContent = ''; }
                    const emailEl = document.getElementById("signupEmail");
                    const passEl = document.getElementById("signupPassword");
                    const passConfirmEl = document.getElementById("signupPasswordConfirm");
                    const email = emailEl ? (emailEl.value || '').trim() : '';
                    const password = passEl ? (passEl.value || '') : '';
                    const passwordConfirm = passConfirmEl ? (passConfirmEl.value || '') : '';
                    if (!email || !password) {
                        if (signupError) { signupError.textContent = 'Please enter email and password.'; signupError.style.display = 'block'; }
                        return;
                    }
                    if (password !== passwordConfirm) {
                        if (signupError) { signupError.textContent = 'Passwords do not match.'; signupError.style.display = 'block'; }
                        return;
                    }
                    const result = await AuthService.signUp(email, password);
                    if (!result || result.success === false) {
                        const msg = (result && result.error) ? result.error : 'Signup failed';
                        if (signupError) { signupError.textContent = msg; signupError.style.display = 'block'; }
                        return;
                    }
                    showToast('Signup successful. Check your email to confirm and wait for approval.', 'success');
                    // Switch back to login tab for the user to login after confirmation
                    switchToTab('login');
                } catch (err) {
                    console.error('Signup error:', err);
                    if (signupError) { signupError.textContent = err.message || 'Signup failed'; signupError.style.display = 'block'; }
                }
            };
            signupForm.__mod_signup_handler = submitHandler;
            signupForm.addEventListener('submit', submitHandler);
        }
    } catch (err) {
        console.error('initializeAuthentication (signup/tab) error', err);
    }
}
