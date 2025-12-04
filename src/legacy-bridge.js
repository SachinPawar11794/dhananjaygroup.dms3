/**
 * Legacy Bridge
 * Ensures Supabase is available before legacy script.js runs
 * This file loads Supabase and makes it globally available
 */

import { supabase } from './config/supabase.js';

// Ensure Supabase is available globally before any scripts run
if (typeof window !== 'undefined') {
    window.supabase = supabase;
    
    // Dispatch custom event when Supabase is ready
    window.dispatchEvent(new CustomEvent('supabaseReady', { detail: { supabase } }));
    
    console.log('✅ Supabase initialized and available globally');
}

