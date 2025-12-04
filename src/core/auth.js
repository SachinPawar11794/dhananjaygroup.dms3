/**
 * Authentication UI Management
 * Updates UI based on authentication state
 */

import { AuthService } from '../services/authService.js';

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

