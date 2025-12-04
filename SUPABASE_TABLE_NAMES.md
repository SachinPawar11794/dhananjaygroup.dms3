# 🔍 Supabase Table Names Reference

## Current Table Names Used in Code

Based on the codebase, here are the table names being used:

1. **MachineSettings** - Machine settings data
2. **Process Master** - Process master data (note: has space)
3. **WorkCenterMaster** - Work center/machine master
4. **IoT Database** - IoT data collection (note: has space)
5. **ShiftSchedule** - Shift schedule data
6. **LossReason** - Loss reason data
7. **HourlyReport** - Hourly report data
8. **TaskManager** - Task management
9. **User Management** - User management (note: has space)
10. **profiles** - User profiles (lowercase)

## ⚠️ 404 Error Fix

The error `404 (Not Found)` for `MachineSettings` means:
- **Either:** The table doesn't exist in your Supabase database
- **Or:** The table name is different (e.g., "Machine Settings" with space, or "settings" lowercase)

## 🔧 How to Fix

### Option 1: Check Your Actual Table Names

1. **Go to Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Select your project
   - Go to **Table Editor**

2. **Check Table Names**
   - Look at the exact table names (case-sensitive!)
   - Note if they have spaces or different capitalization

3. **Update Code to Match**
   - Update `script.js` to use the correct table names
   - Or rename tables in Supabase to match the code

### Option 2: Create Missing Tables

If tables don't exist, you need to create them in Supabase.

### Option 3: Update Code to Match Your Tables

If your table names are different, we can update the code.

## 📝 Common Table Name Variations

The code might need these table names (check which ones exist):

**Machine Settings:**
- `MachineSettings` (current code)
- `Machine Settings` (with space)
- `settings` (lowercase)
- `Settings` (capitalized)

**Other tables with spaces:**
- `Process Master` ✅ (already has space in code)
- `IoT Database` ✅ (already has space in code)
- `User Management` ✅ (already has space in code)

## 🎯 Quick Fix Steps

1. **Check Supabase Dashboard**
   - Go to Table Editor
   - Find the machine settings table
   - Note the exact name

2. **Tell me the exact name** and I'll update the code

3. **Or update script.js yourself:**
   - Search for `"MachineSettings"`
   - Replace with your actual table name

## 🔍 How to Find Table Names in Supabase

1. Login to Supabase Dashboard
2. Select your project: `tzoloagoaysipwxuyldu`
3. Click **Table Editor** in sidebar
4. See all your tables listed
5. Check the exact spelling and capitalization

---

**Next Step:** Check your Supabase Table Editor and tell me the exact table names, or I can help you create the tables!

