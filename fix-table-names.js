/**
 * Table Name Fixer
 * Use this to check and update table names in script.js
 * 
 * Common variations to check:
 * - "MachineSettings" vs "Machine Settings" vs "settings" vs "Settings"
 */

// Check what table names are actually being used
const tableNamesUsed = [
    "MachineSettings",
    "Process Master",
    "WorkCenterMaster", 
    "IoT Database",
    "ShiftSchedule",
    "LossReason",
    "HourlyReport",
    "TaskManager",
    "User Management",
    "profiles"
];

console.log("Table names used in code:", tableNamesUsed);

// Instructions:
// 1. Check your Supabase Table Editor for actual table names
// 2. Compare with the list above
// 3. Update script.js to match your actual table names
// 4. Or rename tables in Supabase to match the code

