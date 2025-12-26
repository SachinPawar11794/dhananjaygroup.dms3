import { AuthService } from '../services/authService.js';

const state = {
	profile: null,
	subscribers: []
};

function notify() {
	state.subscribers.forEach(fn => {
		try { fn(state.profile); } catch (e) { /* ignore subscriber errors */ }
	});
}

export function getProfile() {
	return state.profile;
}

export function setProfile(profile) {
	state.profile = profile;
	notify();
}

/**
 * Refresh the current user's profile from the `profiles` table.
 * Retries up to `retries` times when the profile is not yet present (trigger timing).
 * Uses a randomized 300-500ms backoff between attempts.
 */
export async function refreshProfile(retries = 3) {
	try {
		const user = await AuthService.getCurrentUser();
		if (!user) {
			setProfile(null);
			return null;
		}

		let attempt = 0;
		let profile = null;
		while (attempt < retries) {
			// Use email for lookup (Firebase UID doesn't match database UUID)
			profile = await AuthService.getUserProfileByEmail(user.email);
			if (profile) break;
			// Wait 300-500ms before retrying
			const delay = 300 + Math.floor(Math.random() * 200);
			await new Promise(r => setTimeout(r, delay));
			attempt++;
		}

		setProfile(profile);
		return profile;
	} catch (err) {
		// On error keep previous profile but log
		console.error('refreshProfile error', err);
		return null;
	}
}

export function subscribe(fn) {
	if (typeof fn === 'function') {
		state.subscribers.push(fn);
		return () => {
			const idx = state.subscribers.indexOf(fn);
			if (idx !== -1) state.subscribers.splice(idx, 1);
		};
	}
	return () => {};
}

export default {
	getProfile,
	setProfile,
	refreshProfile,
	subscribe
};


