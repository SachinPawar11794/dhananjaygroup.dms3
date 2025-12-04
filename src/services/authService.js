import { supabase } from '../config/supabase.js';
import { showToast } from '../utils/toast.js';

/**
 * Authentication Service
 * Handles all authentication-related operations
 */
export class AuthService {
    /**
     * Check current authentication state
     */
    static async checkAuthState() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            console.error('Error checking auth state:', error);
            return null;
        }
    }

    /**
     * Sign in with email and password
     */
    static async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign up with email and password
     */
    static async signUp(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign out
     */
    static async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Reset password
     */
    static async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}${window.location.pathname}`
            });
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     */
    static async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    /**
     * Get user profile from profiles table
     */
    static async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get profile error:', error);
            return null;
        }
    }

    /**
     * Check if user is admin
     */
    static async isAdmin(userId) {
        try {
            const profile = await this.getUserProfile(userId);
            return profile?.role === 'admin';
        } catch (error) {
            console.error('Check admin error:', error);
            return false;
        }
    }

    /**
     * Subscribe to auth state changes
     */
    static onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
}

