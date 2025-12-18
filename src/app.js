/**
 * Main Application Entry Point
 * Initializes the IoT Management System
 */

import { supabase } from './config/supabase.js';
import { AuthService } from './services/authService.js';
import { initializeApp } from './core/app.js';

// Make Supabase available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.supabase = supabase;
}

// Wait for DOM and Supabase to be ready
window.addEventListener("DOMContentLoaded", () => {
    // Wait for Supabase to be initialized
    // Remove any stray hash fragments to keep path-based routing clean
    if (window.location && window.location.hash) {
        try {
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
        } catch (e) { /* ignore */ }
    }

    const checkSupabase = setInterval(() => {
        if (window.supabase) {
            clearInterval(checkSupabase);
            initializeApp();
        }
    }, 100);
});

