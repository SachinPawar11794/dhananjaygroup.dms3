# ⚡ Quick Fix: Table Name 404 Error

## The Problem
The code uses `MachineSettings` but your Supabase table might be named differently.

## Quick Solution

I notice your code has **inconsistencies** - some tables use spaces, some don't:
- ✅ `"Process Master"` (with space)
- ✅ `"IoT Database"` (with space)  
- ✅ `"Work Center Master"` (with space - in some places)
- ❌ `"WorkCenterMaster"` (no space - in other places)
- ❌ `"MachineSettings"` (no space - might be wrong!)

## Most Likely Fix

Your table is probably named **`"Machine Settings"`** (with a space), not `"MachineSettings"`.

### Option 1: Try This First

**In Browser Console (F12), test:**
```javascript
// Test different table names
window.supabase.from('Machine Settings').select('*').limit(1)
```

If this works, the table name has a space!

### Option 2: I Can Update the Code

If you confirm the table name, I can update all references in `script.js`.

**Common possibilities:**
- `"Machine Settings"` (with space) ← Most likely
- `"settings"` (lowercase)
- `"Settings"` (capitalized)
- `"machine_settings"` (snake_case)

## Immediate Fix

**Tell me which one works:**
1. Check Supabase Table Editor for exact name
2. Or test in browser console with different names
3. I'll update the code immediately

---

**Quick Test:** Open browser console and try:
```javascript
window.supabase.from('Machine Settings').select('*').limit(1)
```

If it works, that's your table name!

