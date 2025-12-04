// Supabase Configuration - Loaded immediately for legacy script.js compatibility
// Using CDN import for immediate availability
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase Configuration
// The anon key is safe to expose because:
// 1. It's designed for client-side use
// 2. RLS policies restrict access to authenticated users only
// 3. Without authentication, the key alone cannot access data
const supabaseUrl = "https://tzoloagoaysipwxuyldu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b2xvYWdvYXlzaXB3eHV5bGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDM3MzIsImV4cCI6MjA3ODk3OTczMn0.BwC-uFnlkWtaGNVEee4VFuL-trsdz1aawDC77F3afWk";

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Make available globally for backward compatibility (CRITICAL for script.js)
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  // Also set it immediately for scripts that check before DOMContentLoaded
  document.supabase = supabase;
}

