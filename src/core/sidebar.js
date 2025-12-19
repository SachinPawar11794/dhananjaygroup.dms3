/**
 * Sidebar Component
 * Handles sidebar navigation and mobile responsiveness
 */

export class Sidebar {
    static initialize() {
        console.log("🔧 Sidebar.initialize()");
        const menuToggle = document.getElementById("menuToggle");
        const sidebarToggle = document.getElementById("sidebarToggle");
        const sidebar = document.getElementById("sidebar");

        try {
            const comp = sidebar ? window.getComputedStyle(sidebar) : null;
            console.log("Sidebar initial state", {
                sidebarExists: !!sidebar,
                menuToggleExists: !!menuToggle,
                sidebarDisplay: comp ? comp.display : 'N/A',
                sidebarTransform: comp ? comp.transform : 'N/A',
                sidebarVisibility: comp ? comp.visibility : 'N/A'
            });
        } catch (err) {
            console.warn("Could not read computed styles for sidebar", err);
        }

        // Toggle sidebar on mobile - centralize open/close to ensure consistent behavior
        if (menuToggle && sidebar) {
            const openSidebar = () => {
                console.log("openSidebar()");
                sidebar.style.display = "flex";
                sidebar.style.setProperty('transform', 'translateX(0)', 'important');
                sidebar.style.setProperty('left', '0px', 'important');
                sidebar.style.setProperty('visibility', 'visible', 'important');
                sidebar.style.setProperty('z-index', '9999', 'important');
                sidebar.classList.add("open");
                try { menuToggle.setAttribute('aria-expanded', 'true'); } catch (err) {}
            };

            const closeSidebar = () => {
                console.log("closeSidebar()");
                sidebar.classList.remove("open");
                try { menuToggle.setAttribute('aria-expanded', 'false'); } catch (err) {}
                // apply transform to animate out
                sidebar.style.setProperty('transform', 'translateX(-100%)', 'important');

                // After transition, hide and clean inline styles
                const onEnd = (ev) => {
                    // Some browsers report 'transform' or 'webkitTransform'
                    if (ev && ev.propertyName && ev.propertyName.indexOf('transform') === -1 && ev.propertyName.indexOf('webkitTransform') === -1) {
                        return;
                    }
                    sidebar.removeEventListener('transitionend', onEnd);
                    try {
                        sidebar.style.display = 'none';
                        sidebar.style.removeProperty('transform');
                        sidebar.style.removeProperty('left');
                        sidebar.style.removeProperty('visibility');
                        sidebar.style.removeProperty('z-index');
                        console.log("Sidebar hidden after transitionend");
                    } catch (err) { /* ignore */ }
                };

                sidebar.addEventListener('transitionend', onEnd);

                // Fallback in case transitionend doesn't fire
                setTimeout(() => {
                    try {
                        const comp = window.getComputedStyle(sidebar);
                        if (comp.display !== 'none' && !sidebar.classList.contains('open')) {
                            sidebar.style.display = 'none';
                            sidebar.style.removeProperty('transform');
                            sidebar.style.removeProperty('left');
                            sidebar.style.removeProperty('visibility');
                            sidebar.style.removeProperty('z-index');
                            sidebar.removeEventListener('transitionend', onEnd);
                            console.log("Sidebar hidden by fallback timeout");
                        }
                    } catch (err) { /* ignore */ }
                }, 400);

                console.log("Sidebar close initiated (transform applied)");
            };

            menuToggle.addEventListener("click", (e) => {
                try { e.preventDefault(); } catch (err) {}
                try { e.stopPropagation(); } catch (err) {}
                const willOpen = !sidebar.classList.contains("open");
                console.log("📱 menuToggle clicked - willOpen:", willOpen);
                if (willOpen) openSidebar(); else closeSidebar();
            });

            // expose helpers for debugging/testing
            try { window.openSidebar = openSidebar; window.closeSidebar = closeSidebar; } catch (err) {}
        }

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener("click", () => {
                if (typeof window.closeSidebar === 'function') {
                    window.closeSidebar();
                } else {
                    sidebar.classList.remove("open");
                }
            });
        }

        // Close sidebar when selecting a navigation item (mobile)
        try {
            const navItems = sidebar.querySelectorAll(".nav-item");
            navItems.forEach(item => {
                // Use click instead of navigation event so we close before route handling
                item.addEventListener("click", (ev) => {
                    // If mobile viewport and sidebar is open, close it
                    if (window.innerWidth <= 768 && sidebar.classList.contains("open")) {
                        if (typeof window.closeSidebar === 'function') {
                            window.closeSidebar();
                        } else {
                            sidebar.classList.remove("open");
                        }
                    }
                });
            });
        } catch (err) {
            // non-fatal: if querySelectorAll fails, ignore
            console.warn("Failed to wire nav-item handlers", err);
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 768 && sidebar) {
                if (!sidebar.contains(e.target) &&
                    !menuToggle?.contains(e.target) &&
                    sidebar.classList.contains("open")) {
                    if (typeof window.closeSidebar === 'function') {
                        window.closeSidebar();
                    } else {
                        sidebar.classList.remove("open");
                    }
                }
            }
        });
    }
}

