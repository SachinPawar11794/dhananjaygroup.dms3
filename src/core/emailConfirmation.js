/**
 * Email Confirmation Handler
 * Handles email confirmation callbacks from Supabase
 */

import { supabase } from '../config/supabase.js';
import { showToast } from '../utils/toast.js';
import { updateUIForAuth } from './auth.js';

export async function handleEmailConfirmation() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    // Clear the hash from URL
    if (hashParams.has('error') || hashParams.has('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
    }
    
    // Handle errors
    if (error) {
        if (error === 'access_denied' && errorDescription && errorDescription.includes('expired')) {
            showToast("Email confirmation link has expired. Please request a new one.", "error");
        } else {
            showToast("Email confirmation failed: " + (errorDescription || error), "error");
        }
        return;
    }
    
    // Handle successful email confirmation
    if (type === 'signup' && accessToken) {
        try {
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: hashParams.get('refresh_token') || ''
            });
            
            if (error) throw error;
            
            showToast("Email confirmed successfully! You are now logged in.", "success");
            updateUIForAuth(data.session);
        } catch (err) {
            console.error("Session error:", err);
            showToast("Email confirmed but login failed. Please try logging in manually.", "error");
        }
    }
}

