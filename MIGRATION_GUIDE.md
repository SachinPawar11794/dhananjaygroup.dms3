# Migration Guide

This guide explains how to complete the migration from the single-file structure to the modular architecture.

## Current Status

✅ **Completed:**
- Project structure created (`src/` folder with organized subdirectories)
- Service layer created (all database operations in `src/services/`)
- Utility functions extracted (`src/utils/`)
- Core application modules created (`src/core/`)
- Build configuration (Vite, package.json, vercel.json)
- README with documentation

🔄 **In Progress:**
- HTML structure (kept as-is for now)
- CSS migration (kept as single file, ready for modular split)
- JavaScript migration (legacy script.js still in use)

## Migration Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Test the Current Setup

The application should still work with the original `script.js`. The new structure is ready but not yet active.

### Step 3: Gradual Migration Strategy

#### Option A: Big Bang Migration (Recommended for small teams)

1. **Migrate Authentication First**
   - Move authentication handlers from `script.js` to `src/components/auth/auth.js`
   - Update `src/core/app.js` to use the new auth component
   - Test thoroughly

2. **Migrate Page Components**
   - Create page components in `src/pages/`:
     - `pmsDashboard.js`
     - `machineSettings.js`
     - `processMaster.js`
     - `workCenterMaster.js`
     - `iotData.js`
     - `shiftSchedule.js`
     - `lossReason.js`
     - `hourlyReport.js`
     - `taskManager.js`
     - `userManagement.js`

3. **Migrate Modal Components**
   - Create modal components in `src/components/modals/`:
     - `settingsModal.js`
     - `processMasterModal.js`
     - `workCenterModal.js`
     - etc.

4. **Update index.html**
   - Comment out `<script src="script.js"></script>`
   - Uncomment `<script type="module" src="src/app.js"></script>`

#### Option B: Incremental Migration (Safer for production)

1. **Keep both systems running**
   - Keep `script.js` for existing functionality
   - Gradually move features to modules
   - Test each migrated feature independently

2. **Feature-by-feature migration**
   - Start with a simple feature (e.g., Loss Reason)
   - Migrate it completely to modules
   - Test and verify
   - Move to next feature

3. **Remove legacy code**
   - Once all features are migrated, remove `script.js`
   - Clean up any unused code

## File Mapping

### Original → New Structure

| Original | New Location |
|----------|-------------|
| `script.js` (auth functions) | `src/services/authService.js` |
| `script.js` (database queries) | `src/services/*Service.js` |
| `script.js` (utilities) | `src/utils/*.js` |
| `script.js` (navigation) | `src/core/navigation.js` |
| `script.js` (modals) | `src/core/modal.js` + `src/components/modals/*.js` |
| `style.css` | `src/styles/*.css` (to be split) |

## Service Layer Usage

All database operations should now go through service classes:

```javascript
// Old way (in script.js)
const { data, error } = await window.supabase
    .from('MachineSettings')
    .select('*');

// New way (using services)
import { MachineSettingsService } from './services/machineSettingsService.js';
const { data, count } = await MachineSettingsService.getAll(1, 25);
```

## Component Structure

Create components following this pattern:

```javascript
// src/pages/machineSettings.js
export class MachineSettingsPage {
    static async load() {
        // Load data using service
        const { data, count } = await MachineSettingsService.getAll();
        // Render table
        this.renderTable(data);
    }
    
    static renderTable(data) {
        // Render logic
    }
}
```

## CSS Migration

The CSS file (`style.css`) can be split into modules:

- `src/styles/variables.css` - CSS variables ✅
- `src/styles/base.css` - Base styles ✅
- `src/styles/components/` - Component-specific styles
- `src/styles/pages/` - Page-specific styles
- `src/styles/layout/` - Layout styles (sidebar, header, etc.)

Then import in `src/styles/main.css`:

```css
@import './variables.css';
@import './base.css';
@import './components/buttons.css';
@import './components/forms.css';
@import './components/tables.css';
/* etc. */
```

## Testing Checklist

After migration, test:

- [ ] Authentication (login, signup, logout)
- [ ] Navigation between pages
- [ ] All CRUD operations for each module
- [ ] Pagination
- [ ] Search/filter functionality
- [ ] Modal forms
- [ ] Responsive design
- [ ] Error handling
- [ ] Toast notifications

## Rollback Plan

If issues occur:

1. Revert `index.html` to use `script.js`
2. Keep the new structure for future migration
3. Fix issues in modules before re-enabling

## Next Steps

1. **Immediate**: Install dependencies and test current setup
2. **Short-term**: Migrate one feature completely (e.g., Loss Reason)
3. **Medium-term**: Migrate all features to modules
4. **Long-term**: Split CSS into modules, add TypeScript, add tests

## Support

If you encounter issues during migration:

1. Check browser console for errors
2. Verify all imports are correct
3. Ensure Supabase configuration is correct
4. Test with `npm run dev` before deploying

---

**Note**: The new structure is production-ready but requires completing the migration. The original `script.js` will continue to work until migration is complete.

