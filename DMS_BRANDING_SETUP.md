# DMS - Dhananjay Manufacturing System

## App Branding & Settings Feature

This document explains the new branding and settings features added to the DMS application.

---

## Overview

The application has been renamed from "IoT Manager" to **DMS (Dhananjay Manufacturing System)**. The app now includes:

1. **Dynamic Branding System** - Customize app name, logo, and colors
2. **Settings Menu** - Admin-only access for application configuration
3. **User Management** - Moved under Settings for better organization

---

## New Features

### 1. App Branding

Admins can customize:
- **App Short Name** - Displayed in sidebar (e.g., "DMS")
- **App Full Name** - Full application name (e.g., "Dhananjay Manufacturing System")
- **Logo Upload** - Upload custom logo image (PNG, JPG, SVG, WebP - max 2MB)
- **Logo Text** - Text displayed when no logo image (max 4 characters)
- **Primary Color** - Brand color for gradients
- **Secondary Color** - Secondary brand color for gradients

#### Logo Upload Feature
- Click "Choose Image" to select a logo file
- Supported formats: PNG, JPG, SVG, WebP
- Maximum file size: 2MB
- Logos are stored in Supabase Storage
- Click the ✕ button to remove the uploaded logo

### 2. Settings Menu (Admin Only)

A new "Settings" menu item appears in the sidebar for admin users only. It contains:

- **App Branding Card** - Customize the application appearance
- **User Management Card** - Manage users, roles, and permissions

### 3. Location Changes

- User Management has been **moved from main menu to Settings**
- Settings menu only visible to users with `admin` role

---

## Supabase Database Setup

### Step 1: Create `app_settings` Table

You need to create the `app_settings` table in Supabase to store branding settings.

Run this SQL in your Supabase SQL Editor:

```sql
-- Create app_settings table for storing application configuration
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read app settings (for branding to load on login page)
CREATE POLICY "Public can read app_settings" ON app_settings
    FOR SELECT USING (true);

-- Policy: Only authenticated admins can insert/update/delete
CREATE POLICY "Admins can manage app_settings" ON app_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
```

### Step 2: Create Storage Bucket for Logo Upload

To enable logo file uploads, you need to create a storage bucket in Supabase:

1. Go to **Supabase Dashboard > Storage**
2. Click **"New bucket"**
3. Set bucket name: `app-assets`
4. **Enable "Public bucket"** checkbox (so logos can be displayed)
5. Click **Create bucket**

Then set up the storage policies by running this SQL:

```sql
-- Allow public read access to app-assets bucket
CREATE POLICY "Public can view app-assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'app-assets');

-- Allow authenticated admins to upload/delete files
CREATE POLICY "Admins can upload app-assets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'app-assets' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update app-assets" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'app-assets' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete app-assets" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'app-assets' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

---

## How to Test Locally

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Login as admin** to see the Settings menu

3. **Navigate to Settings > App Branding** to customize:
   - App short name
   - App full name
   - Logo URL (optional)
   - Brand colors

4. **Changes are applied immediately** and saved to Supabase

---

## Files Modified

### HTML Changes (`index.html`)
- Updated page title to "DMS - Dhananjay Manufacturing System"
- Added favicon with DMS branding
- Updated sidebar with new logo structure
- Added Settings menu item (admin only)
- Added App Settings dashboard page
- Added App Branding configuration page
- Updated login page with branding

### CSS Changes (`style.css` / `public/style.css`)
- Added logo container styles
- Added branding preview styles
- Added settings cards grid styles
- Added color picker styles
- Added login branding styles
- Added responsive styles for branding

### JavaScript Changes (`script.js` / `public/script.js`)
- Added `loadAppBranding()` function
- Added `applyBranding()` function
- Added `saveBrandingSettings()` function
- Added navigation for Settings module
- Updated `checkAdminStatus()` to show/hide Settings menu
- Added branding form initialization

---

## Important Notes

1. **DO NOT push directly to GitHub** until you've tested locally
2. **Run `npm run dev`** to test changes on localhost
3. **Create the `app_settings` table** in Supabase before testing
4. **Login as admin** to access the Settings menu

---

## Default Branding Values

If no branding is saved in Supabase, these defaults are used:

| Setting | Default Value |
|---------|---------------|
| Short Name | DMS |
| Full Name | Dhananjay Manufacturing System |
| Logo URL | (empty - uses text logo) |
| Logo Text | DMS |
| Primary Color | #0ea5e9 (sky blue) |
| Secondary Color | #6366f1 (indigo) |

---

## Troubleshooting

### Settings menu not appearing?
- Make sure you're logged in as an admin user
- Check that your `user_profiles.role` is set to `'admin'`

### Branding not saving?
- Ensure the `app_settings` table exists in Supabase
- Check RLS policies are configured correctly
- Verify you have admin privileges

### Logo not loading?
- Ensure the logo URL is accessible (HTTPS recommended)
- Supported formats: PNG, JPG, SVG, WebP

---

## Version

- **Feature Added:** December 2024
- **App Name:** DMS - Dhananjay Manufacturing System

