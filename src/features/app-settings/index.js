// App Settings feature - loads branding settings and wires basic branding UI
import { supabase } from '../../config/supabase.js';

function applyBranding(branding) {
    try {
        document.documentElement.style.setProperty('--app-primary-color', branding.app_primary_color || '#0ea5e9');
        document.documentElement.style.setProperty('--app-secondary-color', branding.app_secondary_color || '#6366f1');

        const sidebarLogoImg = document.getElementById('sidebarLogoImg');
        const sidebarLogoDefault = document.getElementById('sidebarLogoDefault');
        const sidebarAppName = document.getElementById('sidebarAppName');
        if (branding.app_logo_url) {
            if (sidebarLogoImg) { sidebarLogoImg.src = branding.app_logo_url; sidebarLogoImg.style.display = 'block'; }
            if (sidebarLogoDefault) sidebarLogoDefault.style.display = 'none';
        } else {
            if (sidebarLogoImg) sidebarLogoImg.style.display = 'none';
            if (sidebarLogoDefault) {
                sidebarLogoDefault.style.display = 'flex';
                const logoText = sidebarLogoDefault.querySelector('.logo-text');
                if (logoText) logoText.textContent = branding.app_logo_text || branding.app_short_name || 'DMS';
            }
        }
        if (sidebarAppName) sidebarAppName.textContent = branding.app_short_name || 'DMS';

        const headerLogoImg = document.getElementById('headerLogoImg');
        const headerLogoDefault = document.getElementById('headerLogoDefault');
        if (branding.app_logo_url) {
            if (headerLogoImg) { headerLogoImg.src = branding.app_logo_url; headerLogoImg.style.display = 'block'; }
            if (headerLogoDefault) headerLogoDefault.style.display = 'none';
        } else {
            if (headerLogoImg) headerLogoImg.style.display = 'none';
            if (headerLogoDefault) {
                headerLogoDefault.style.display = 'flex';
                const logoText = headerLogoDefault.querySelector('.logo-text');
                if (logoText) logoText.textContent = branding.app_logo_text || branding.app_short_name || 'DMS';
            }
        }

        // Login and preview elements
        const loginLogoImg = document.getElementById('loginLogoImg');
        const loginLogoDefault = document.getElementById('loginLogoDefault');
        const loginLogoText = document.getElementById('loginLogoText');
        if (branding.app_logo_url) {
            if (loginLogoImg) { loginLogoImg.src = branding.app_logo_url; loginLogoImg.style.display = 'block'; }
            if (loginLogoDefault) loginLogoDefault.style.display = 'none';
        } else {
            if (loginLogoImg) loginLogoImg.style.display = 'none';
            if (loginLogoDefault) loginLogoDefault.style.display = 'flex';
            if (loginLogoText) loginLogoText.textContent = branding.app_logo_text || branding.app_short_name || 'DMS';
        }

        // Settings page display
        const currentAppNameDisplay = document.getElementById('currentAppNameDisplay');
        if (currentAppNameDisplay) currentAppNameDisplay.textContent = branding.app_short_name || 'DMS';

        // Preview on branding page
        const previewLogoImg = document.getElementById('previewLogoImg');
        const previewLogoDefault = document.getElementById('previewLogoDefault');
        const previewLogoText = document.getElementById('previewLogoText');
        const previewAppName = document.getElementById('previewAppName');
        const previewAppFullName = document.getElementById('previewAppFullName');
        if (branding.app_logo_url) {
            if (previewLogoImg) { previewLogoImg.src = branding.app_logo_url; previewLogoImg.style.display = 'block'; }
            if (previewLogoDefault) previewLogoDefault.style.display = 'none';
        } else {
            if (previewLogoImg) previewLogoImg.style.display = 'none';
            if (previewLogoDefault) {
                previewLogoDefault.style.display = 'flex';
                previewLogoDefault.style.background = `linear-gradient(135deg, ${branding.app_primary_color || '#0ea5e9'} 0%, ${branding.app_secondary_color || '#6366f1'} 100%)`;
            }
            if (previewLogoText) previewLogoText.textContent = (branding.app_logo_text || branding.app_short_name || 'DMS').substring(0,4);
        }
        if (previewAppName) previewAppName.textContent = branding.app_short_name || 'DMS';
        if (previewAppFullName) previewAppFullName.textContent = branding.app_full_name || '';
    } catch (e) {
        console.error('applyBranding error', e);
    }
}

async function loadBrandingSettingsIntoForm() {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('setting_value')
            .eq('setting_key', 'branding')
            .single();
        const branding = (data && data.setting_value) ? data.setting_value : {
            app_short_name: 'DMS',
            app_full_name: 'Dhananjay Manufacturing System',
            app_logo_url: '',
            app_logo_text: 'DMS',
            app_primary_color: '#0ea5e9',
            app_secondary_color: '#6366f1'
        };

        // Populate form inputs if present
        const shortNameInput = document.getElementById('appShortName');
        const fullNameInput = document.getElementById('appFullName');
        const logoUrlInput = document.getElementById('appLogoUrl');
        const logoTextInput = document.getElementById('appLogoText');
        const primaryColorInput = document.getElementById('appPrimaryColor');
        const primaryColorTextInput = document.getElementById('appPrimaryColorText');
        const secondaryColorInput = document.getElementById('appSecondaryColor');
        const secondaryColorTextInput = document.getElementById('appSecondaryColorText');
        const fileNameSpan = document.getElementById('logoFileName');
        const removeLogoBtn = document.getElementById('removeLogoBtn');

        if (shortNameInput) shortNameInput.value = branding.app_short_name || 'DMS';
        if (fullNameInput) fullNameInput.value = branding.app_full_name || 'Dhananjay Manufacturing System';
        if (logoUrlInput) logoUrlInput.value = branding.app_logo_url || '';
        if (logoTextInput) logoTextInput.value = branding.app_logo_text || branding.app_short_name || 'DMS';
        if (primaryColorInput) primaryColorInput.value = branding.app_primary_color || '#0ea5e9';
        if (primaryColorTextInput) primaryColorTextInput.value = branding.app_primary_color || '#0ea5e9';
        if (secondaryColorInput) secondaryColorInput.value = branding.app_secondary_color || '#6366f1';
        if (secondaryColorTextInput) secondaryColorTextInput.value = branding.app_secondary_color || '#6366f1';
        if (fileNameSpan) fileNameSpan.textContent = branding.app_logo_url ? branding.app_logo_url.split('/').pop() : 'No file chosen';
        if (removeLogoBtn) removeLogoBtn.style.display = branding.app_logo_url ? 'flex' : 'none';

        applyBranding(branding);
    } catch (err) {
        console.error('loadBrandingSettingsIntoForm error', err);
    }
}

export async function initFeature(container = null) {
    if (container) container.classList.add('active');
    // If appBrandingPage exists and is active, load branding settings into the form and preview
    const brandingPage = document.getElementById('appBrandingPage');
    if (brandingPage && brandingPage.classList.contains('active')) {
        await loadBrandingSettingsIntoForm();
    } else {
        // still load global branding (so header/sidebar show current branding)
        await loadBrandingSettingsIntoForm();
    }
}

export function destroyFeature() {
    // noop for now
}


