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

    // Vite static feature loader map. Vite will replace these with optimized chunk loaders.
    static FEATURE_LOADERS = import.meta.glob('../features/**/index.js');

    static async loadFeatureModuleByPath(featurePath) {
        const loader = this.FEATURE_LOADERS[featurePath];
        if (!loader) {
            throw new Error(`Feature module not found in import map: ${featurePath}`);
        }
        return await loader();
    }

    static initialize() {
        this.initializeBrowserHistory();
        this.setupNavigationHandlers();
    }

    static initializeBrowserHistory() {
        // Handle browser back/forward buttons (history API)
        window.addEventListener('popstate', (event) => {
            const path = (event.state && event.state.path) || window.location.pathname || '/pms/dashboard';
            this.navigateToPath(path, false);
        });

        // Initialize from current URL path (no hash). Default to /pms/dashboard
        const initPath = window.location.pathname && window.location.pathname !== '/' ? window.location.pathname : '/pms/dashboard';
        this.navigateToPath(initPath, false);
    }

    static setupNavigationHandlers() {
        const navModules = document.querySelectorAll(".nav-module");
        const navSubItems = document.querySelectorAll(".nav-subitem");
        const pages = document.querySelectorAll(".page");

        // Handle module-level navigation (use paths, not hashes)
        navModules.forEach((module) => {
            module.addEventListener("click", (e) => {
                e.preventDefault();
                const targetModule = module.getAttribute("data-module");
                
                navModules.forEach(nav => nav.classList.remove("active"));
                module.classList.add("active");
                
                pages.forEach(page => page.classList.remove("active"));

                if (targetModule === "pms") {
                    this.navigateToPath("/pms/dashboard", true);
                } else if (targetModule === "task-manager") {
                    this.navigateToPath("/task-manager", true);
                } else if (targetModule === "user-management") {
                    this.navigateToPath("/user-management", true);
                } else if (targetModule === "app-settings") {
                    this.navigateToPath("/app-settings", true);
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
                    this.navigateToPath(`/pms/${targetPage}`, true);
                }
            });
        });

        // Handle dashboard card clicks
        document.querySelectorAll('.dashboard-card').forEach(card => {
            card.addEventListener('click', () => {
                const page = card.getAttribute('data-page');
                if (page) {
                    this.navigateToPath(`/pms/${page}`, true);
                }
            });
        });
        // Handle settings dashboard cards (App Settings page)
        document.querySelectorAll('.settings-card').forEach(card => {
            card.addEventListener('click', () => {
                const settingsPage = card.getAttribute('data-settings-page');
                if (!settingsPage) return;
                // Ensure App Settings module is active
                navModules.forEach(nav => nav.classList.remove("active"));
                const settingsModule = document.querySelector('.nav-module[data-module="app-settings"]');
                if (settingsModule) settingsModule.classList.add('active');
                this.navigateToPath(`/app-settings/${settingsPage}`, true);
            });
        });
    }
    static navigateToPath(path, addToHistory = true) {
        const pages = document.querySelectorAll(".page");
        const pageTitle = document.getElementById("pageTitle");
        const pagePath = document.getElementById("pagePath");

        // Normalize and parse path: "/pms/settings" -> ['pms','settings']
        const cleaned = String(path || '').replace(/^\//, '').replace(/\/+$/, '');
        const parts = cleaned.split('/').filter(Boolean);
        const module = parts[0] || 'pms';
        const page = parts[1] || 'dashboard';

        // Update URL using history API
        if (addToHistory) {
            window.history.pushState({ path }, '', path);
            this.navigationHistory.push(path, `${module}/${page}`, page);
        } else {
            window.history.replaceState({ path }, '', path);
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
        // Map incoming path segments (slugs) to actual page element IDs in index.html
        const pmsPageIdMap = {
            'dashboard': 'pmsDashboardPage',
            'settings': 'settingsPage',
            'process-master': 'processMasterPage',
            'workcenter-master': 'workcenterMasterPage',
            'iot-data': 'iotDataPage',
            'shift-schedule': 'shiftSchedulePage',
            'loss-reason': 'lossReasonPage',
            'hourly-report': 'hourlyReportPage'
        };

        if (module === 'pms') {
            targetPageId = pmsPageIdMap[page] || `${page}Page`;
        } else if (module === 'task-manager') {
            targetPageId = 'taskManagerPage';
        } else if (module === 'user-management') {
            targetPageId = 'userManagementPage';
        } else if (module === 'app-settings') {
            // Map app-settings subpages
            const appSettingsMap = {
                '': 'appSettingsPage',
                'app-branding': 'appBrandingPage',
                'user-management': 'userManagementPage'
            };
            targetPageId = appSettingsMap[page] || 'appSettingsPage';
        }

        const targetPage = document.getElementById(targetPageId);
        if (targetPage) {
            targetPage.classList.add("active");

            // Lazy-load feature modules for PMS pages
            try {
                this._loadedFeatures = this._loadedFeatures || {};
                if (module === 'task-manager' && !this._loadedFeatures['task-manager']) {
                    this.loadFeatureModuleByPath('../features/task-manager/index.js').then((mod) => {
                        if (mod && typeof mod.initFeature === 'function') {
                            mod.initFeature(targetPage);
                            this._loadedFeatures['task-manager'] = mod;
                        }
                    }).catch((err) => {
                        console.warn('Failed to load task-manager feature', err);
                    });
                }
                // Top-level User Management lazy-load
                if (module === 'user-management' && !this._loadedFeatures['user-management']) {
                    this.loadFeatureModuleByPath('../features/user-management/index.js').then((mod) => {
                        if (mod && typeof mod.initFeature === 'function') {
                            mod.initFeature(targetPage);
                            this._loadedFeatures['user-management'] = mod;
                        }
                    }).catch((err) => {
                        console.warn('Failed to load user-management feature', err);
                    });
                }

                // PMS sub-pages lazy-loading
                if (module === 'pms') {
                    const pageToFeature = {
                        'dashboard': '../features/pms-dashboard/index.js',
                        'settings': '../features/machine-settings/index.js',
                        'process-master': '../features/process-master/index.js',
                        'workcenter-master': '../features/work-center/index.js',
                        'iot-data': '../features/iot-data/index.js',
                        'shift-schedule': '../features/shift-schedule/index.js',
                        'loss-reason': '../features/loss-reason/index.js',
                        'hourly-report': '../features/hourly-report/index.js'
                    };
                    const featurePath = pageToFeature[page];
                    if (featurePath && !this._loadedFeatures[`pms:${page}`]) {
                        this.loadFeatureModuleByPath(featurePath).then((mod) => {
                            if (mod && typeof mod.initFeature === 'function') {
                                mod.initFeature(targetPage);
                                this._loadedFeatures[`pms:${page}`] = mod;
                            }
                        }).catch((err) => {
                            console.warn(`Failed to load pms feature for page=${page}`, err);
                            // Attempt to fetch and log module source to aid debugging
                            try {
                                fetch(featurePath).then(res => res.text()).then(txt => {
                                    console.error(`Module source for ${featurePath}:\\n`, txt);
                                }).catch(() => { /* ignore */ });
                            } catch (e) { /* ignore */ }
                        });
                    }
                }

                // App settings lazy-load (per-subpage)
                if (module === 'app-settings') {
                    const appSettingsFeatureMap = {
                        'app-branding': '../features/app-settings/index.js', // app-settings module handles branding preview/load
                        'user-management': '../features/user-management/index.js'
                    };
                    const appFeaturePath = appSettingsFeatureMap[page] || '../features/app-settings/index.js';
                    const key = `app-settings:${page || 'index'}`;
                    if (appFeaturePath && !this._loadedFeatures[key]) {
                        this.loadFeatureModuleByPath(appFeaturePath).then((mod) => {
                            if (mod && typeof mod.initFeature === 'function') {
                                mod.initFeature(targetPage);
                                this._loadedFeatures[key] = mod;
                            }
                        }).catch((err) => {
                            console.warn(`Failed to load app-settings feature for page=${page}`, err);
                            try {
                                fetch(appFeaturePath).then(res => res.text()).then(txt => { console.error(`Module source for ${appFeaturePath}:\\n`, txt); }).catch(()=>{});
                            } catch (e) {}
                        });
                    } else if (this._loadedFeatures[key]) {
                        try {
                            const mod = this._loadedFeatures[key];
                            if (mod && typeof mod.initFeature === 'function') mod.initFeature(targetPage);
                        } catch (e) {
                            console.warn('navigation: error re-initializing app-settings module', e);
                        }
                    }
                }
            } catch (e) {
                console.warn('Feature lazy-load error', e);
            }
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
                    const path = `/${pathArray.slice(0, index + 1).join('/')}`;
                    this.navigateToPath(path, true);
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

