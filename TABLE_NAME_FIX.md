# 🔧 Fix Table Name 404 Error

## Problem
Getting `404 (Not Found)` when accessing `MachineSettings` table.

## Solution Options

### Option 1: Check Your Supabase Table Name (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select project: `tzoloagoaysipwxuyldu`
   - Click **Table Editor**

2. **Find Your Machine Settings Table**
   - Look for a table that stores machine settings
   - Check the **exact name** (case-sensitive, spaces matter!)

3. **Common Variations:**
   - `MachineSettings` (no space)
   - `Machine Settings` (with space)
   - `settings` (lowercase)
   - `Settings` (capitalized)
   - `machine_settings` (snake_case)

### Option 2: Update Code to Match Your Table Name

Once you know your actual table name, I can update the code.

**Tell me:** What is the exact table name in your Supabase Table Editor?

### Option 3: Create the Table in Supabase

If the table doesn't exist, we need to create it. The table should have these columns:
- `id` (primary key)
- `plant` (text)
- `machine` (text)
- `part_no` (text)
- `part_name` (text)
- `operation` (text)
- `cycle_time` (numeric)
- `timestamp` (timestamp)
- ... (and other fields from your form)

## Quick Test

**In Browser Console (F12), try:**
```javascript
// Check what tables exist (if you have access)
window.supabase.from('MachineSettings').select('*').limit(1)
```

**Or try different names:**
```javascript
window.supabase.from('Machine Settings').select('*').limit(1)
window.supabase.from('settings').select('*').limit(1)
```

## Temporary Fix

If you want to test with a different table name temporarily, I can update the code to use whatever table name you have.

**Just tell me:** What is your actual table name in Supabase?

---

**Action Required:** Check Supabase Table Editor and share the exact table name!

