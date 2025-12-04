/**
 * Sidebar Component
 * Handles sidebar navigation and mobile responsiveness
 */

export class Sidebar {
    static initialize() {
        const menuToggle = document.getElementById("menuToggle");
        const sidebarToggle = document.getElementById("sidebarToggle");
        const sidebar = document.getElementById("sidebar");

        // Toggle sidebar on mobile
        if (menuToggle && sidebar) {
            menuToggle.addEventListener("click", () => {
                sidebar.classList.toggle("open");
            });
        }

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener("click", () => {
                sidebar.classList.remove("open");
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", (e) => {
            if (window.innerWidth <= 768 && sidebar) {
                if (!sidebar.contains(e.target) && 
                    !menuToggle?.contains(e.target) && 
                    sidebar.classList.contains("open")) {
                    sidebar.classList.remove("open");
                }
            }
        });
    }
}

