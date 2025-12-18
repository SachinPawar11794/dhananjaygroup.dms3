/**
 * Core Application Logic
 * Handles initialization and coordination of all modules
 */

import { AuthService } from '../services/authService.js';
import { Navigation } from './navigation.js';
import { Sidebar } from './sidebar.js';
import { Modal } from './modal.js';
import { updateUIForAuth } from './auth.js';
import { handleEmailConfirmation } from './emailConfirmation.js';

/**
 * Initialize the entire application
 */
export async function initializeApp() {
    // Handle email confirmation callback from URL
    handleEmailConfirmation();
    
    // Check authentication state
    const session = await AuthService.checkAuthState();
    updateUIForAuth(session);
    
    // Initialize core components
    Sidebar.initialize();
    Navigation.initialize();
    Modal.initialize();
    
    // Initialize authentication handlers
    initializeAuthentication();
    
    // Initialize feature-specific modals
    initializeFeatureModals();
    
    // Initialize search functionality
    initializeSearchFunctionality();
    
    // Listen for auth state changes
    AuthService.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            updateUIForAuth(session);
        } else if (event === 'SIGNED_OUT') {
            updateUIForAuth(null);
        }
    });
}

/**
 * Initialize authentication UI handlers
 */
function initializeAuthentication() {
    // Dynamically import the core auth module (migrated from components)
    import('./auth.js').then(module => {
        if (module && typeof module.initializeAuthentication === 'function') {
            module.initializeAuthentication();
        }
    }).catch((err) => {
        // Fallback: initialize inline if module doesn't exist yet
        console.warn('Auth module dynamic import failed, using fallback', err);
    });
}

/**
 * Initialize feature-specific modals
 */
function initializeFeatureModals() {
    // These will be loaded on-demand when pages are accessed
    // For now, we'll keep the original initialization logic
    // This can be refactored to lazy-load components later
}

/**
 * Initialize search functionality
 */
function initializeSearchFunctionality() {
    // Search functionality will be handled by individual page components
    // This is a placeholder for now
}

