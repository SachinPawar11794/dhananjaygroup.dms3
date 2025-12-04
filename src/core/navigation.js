/**
 * Navigation Management
 * Handles routing and page navigation
 */

export class Navigation {
    static navigationHistory = {
        stack: [],
        currentIndex: -1,
        
        push(hash, path, title) {
            if (this.currentIndex < this.stack.length - 1) {
                this.stack = this.stack.slice(0, this.currentIndex + 1);
            }
            this.stack.push({ hash, path, title });
            this.currentIndex = this.stack.length - 1;
        },
        
        canGoBack() {
            return this.currentIndex > 0;
        },
        
        canGoForward() {
            return this.currentIndex < this.stack.length - 1;
        }
    };

    static initialize() {
        this.initializeBrowserHistory();
        this.setupNavigationHandlers();
    }

    static initializeBrowserHistory() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state) {
                this.navigateToHash(event.state.hash, false);
            }
        });

        // Initialize from current URL
        if (window.location.hash) {
            this.navigateToHash(window.location.hash, false);
        } else {
            this.navigateToHash('#pms/dashboard', false);
        }
    }

    static setupNavigationHandlers() {
        const navModules = document.querySelectorAll(".nav-module");
        const navSubItems = document.querySelectorAll(".nav-subitem");
        const pages = document.querySelectorAll(".page");

        // Handle module-level navigation
        navModules.forEach((module) => {
            module.addEventListener("click", (e) => {
                e.preventDefault();
                const targetModule = module.getAttribute("data-module");
                
                navModules.forEach(nav => nav.classList.remove("active"));
                module.classList.add("active");
                
                pages.forEach(page => page.classList.remove("active"));

                if (targetModule === "pms") {
                    this.navigateToHash("#pms/dashboard", true);
                } else if (targetModule === "task-manager") {
                    this.navigateToHash("#task-manager", true);
                } else if (targetModule === "user-management") {
                    this.navigateToHash("#user-management", true);
                }
                
                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    document.getElementById("sidebar")?.classList.remove("open");
                }
            });
        });

        // Handle submenu navigation
        navSubItems.forEach((item) => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const targetPage = item.getAttribute("data-page");
                if (targetPage) {
                    this.navigateToHash(`#pms/${targetPage}`, true);
                }
            });
        });

        // Handle dashboard card clicks
        document.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', () => {
                const page = card.getAttribute('data-page');
                if (page) {
                    this.navigateToHash(`#pms/${page}`, true);
                }
            });
        });
    }

    static navigateToHash(hash, addToHistory = true) {
        const pages = document.querySelectorAll(".page");
        const pageTitle = document.getElementById("pageTitle");
        const pagePath = document.getElementById("pagePath");

        // Parse hash
        const hashParts = hash.replace('#', '').split('/');
        const module = hashParts[0];
        const page = hashParts[1] || 'dashboard';

        // Update URL
        if (addToHistory) {
            window.history.pushState({ hash }, '', hash);
            this.navigationHistory.push(hash, `${module}/${page}`, page);
        } else {
            window.history.replaceState({ hash }, '', hash);
        }

        // Update active navigation
        document.querySelectorAll(".nav-module").forEach(nav => {
            nav.classList.remove("active");
            if (nav.getAttribute("data-module") === module) {
                nav.classList.add("active");
            }
        });

        // Show appropriate page
        pages.forEach(p => p.classList.remove("active"));
        
        let targetPageId = '';
        if (module === 'pms') {
            if (page === 'dashboard') {
                targetPageId = 'pmsDashboardPage';
            } else {
                targetPageId = `${page}Page`;
            }
        } else if (module === 'task-manager') {
            targetPageId = 'taskManagerPage';
        } else if (module === 'user-management') {
            targetPageId = 'userManagementPage';
        }

        const targetPage = document.getElementById(targetPageId);
        if (targetPage) {
            targetPage.classList.add("active");
        }

        // Update page title and breadcrumb
        if (pageTitle) {
            const titles = {
                'dashboard': 'PMS',
                'settings': 'Machine Settings',
                'process-master': 'Process Master',
                'workcenter-master': 'Work Center Master',
                'iot-data': 'IoT Data',
                'shift-schedule': 'Shift Schedule',
                'loss-reason': 'Loss Reason',
                'hourly-report': 'Hourly Report'
            };
            pageTitle.textContent = titles[page] || module;
        }

        this.updateBreadcrumb([module, page]);
    }

    static updateBreadcrumb(pathArray) {
        const pagePath = document.getElementById("pagePath");
        if (!pagePath) return;
        
        pagePath.className = "page-path breadcrumb";
        pagePath.innerHTML = "";
        
        pathArray.forEach((segment, index) => {
            const isLast = index === pathArray.length - 1;
            const span = document.createElement("span");
            
            if (isLast) {
                span.className = "breadcrumb-item active";
                span.textContent = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
            } else {
                span.className = "breadcrumb-item";
                span.textContent = segment.charAt(0).toUpperCase() + segment.slice(1);
                span.style.cursor = "pointer";
                span.onclick = () => {
                    const hash = `#${pathArray.slice(0, index + 1).join('/')}`;
                    this.navigateToHash(hash, true);
                };
            }
            
            pagePath.appendChild(span);
            
            if (!isLast) {
                const separator = document.createElement("span");
                separator.className = "breadcrumb-separator";
                separator.textContent = " / ";
                pagePath.appendChild(separator);
            }
        });
    }
}

