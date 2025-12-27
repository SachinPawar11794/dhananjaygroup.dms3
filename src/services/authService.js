import { showToast } from '../utils/toast.js';
import { firebaseAuth } from '../config/firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail, getAuth, onAuthStateChanged, getIdToken } from 'firebase/auth';

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
            if (!firebaseAuth) return null;
            const user = firebaseAuth.currentUser;
            if (!user) return null;
            const token = await user.getIdTokenResult();
            return { user, token };
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
            if (!firebaseAuth) throw new Error('Firebase not configured');
            const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
            return { success: true, data: userCredential };
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
            if (!firebaseAuth) throw new Error('Firebase not configured');
            const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
            return { success: true, data: userCredential };
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
            if (!firebaseAuth) return { success: true };
            await firebaseSignOut(firebaseAuth);
            return { success: true };
        } catch (error) {
            // If session is missing, swallow the error and return success for idempotency
            if (error && (error.name === 'AuthSessionMissingError' || (error.message && error.message.includes('Auth session missing')))) {
                return { success: true };
            }
            console.error('Sign out error:', error);
            return { success: false, error: error.message || String(error) };
        }
    }

    /**
     * Reset password
     */
    static async resetPassword(email) {
        try {
            if (!firebaseAuth) throw new Error('Firebase not configured');
            await sendPasswordResetEmail(firebaseAuth, email, { url: `${window.location.origin}${window.location.pathname}` });
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
            if (!firebaseAuth) return null;
            return firebaseAuth.currentUser;
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
            // Profiles are served by backend via the data adapter
            const backendUrl = window.__BACKEND_API_URL__ || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://dms-api-169633813068.asia-south1.run.app');
            const res = await fetch(`${backendUrl}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: 'profiles', action: 'select', select: '*', filters: [{ type: 'eq', column: 'id', value: userId }], single: true })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            return json.data;
        } catch (error) {
            console.error('Get profile error:', error);
            return null;
        }
    }

    /**
     * Get user profile by email from profiles table
     */
    static async getUserProfileByEmail(email) {
        try {
            const backendUrl = window.__BACKEND_API_URL__ || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://dms-api-169633813068.asia-south1.run.app');
            const res = await fetch(`${backendUrl}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: 'profiles', action: 'select', select: '*', filters: [{ type: 'eq', column: 'email', value: email }], single: true })
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error.message);
            return json.data;
        } catch (error) {
            console.error('Get profile by email error:', error);
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
        if (!firebaseAuth) return () => {};
        return onAuthStateChanged(firebaseAuth, callback);
    }
}

