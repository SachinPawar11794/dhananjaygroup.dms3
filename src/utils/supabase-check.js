/**
 * Supabase Availability Checker
 * Ensures Supabase is available before operations
 */

export function ensureSupabase() {
    if (!window.supabase) {
        throw new Error('Supabase is not available. Please check your internet connection and Supabase configuration.');
    }
    if (!window.supabase.auth) {
        throw new Error('Supabase auth is not available. Please check Supabase initialization.');
    }
    return window.supabase;
}

export function waitForSupabase(timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (window.supabase && window.supabase.auth) {
            resolve(window.supabase);
            return;
        }

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (window.supabase && window.supabase.auth) {
                clearInterval(checkInterval);
                resolve(window.supabase);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error('Supabase failed to load within timeout period'));
            }
        }, 100);
    });
}

