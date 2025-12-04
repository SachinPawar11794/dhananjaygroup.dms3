# Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm installed
- Supabase account and project
- Git (for version control)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Your Supabase configuration is already in `src/config/supabase.js`
   - Update it if you need to use a different project

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   - The app will open at `http://localhost:3000`
   - Vite provides hot module replacement (HMR) for instant updates

4. **Build for Production**
   ```bash
   npm run build
   ```
   - Output will be in the `dist/` folder
   - Ready to deploy to Vercel or any static hosting

## 📁 Project Structure Overview

```
├── src/                    # Source code
│   ├── components/         # UI components (to be created)
│   ├── pages/              # Page components (to be created)
│   ├── services/           # ✅ Database services (DONE)
│   ├── utils/              # ✅ Utility functions (DONE)
│   ├── config/             # ✅ Configuration (DONE)
│   ├── styles/             # CSS modules (partially done)
│   ├── core/               # ✅ Core app logic (DONE)
│   └── app.js              # ✅ Main entry point (DONE)
├── public/                 # Static assets
├── index.html              # Main HTML file
├── script.js               # ⚠️ Legacy script (still in use)
├── style.css               # ⚠️ Legacy styles (still in use)
└── package.json            # ✅ Dependencies (DONE)
```

## ✅ What's Ready to Use

### Services (Database Operations)
All database operations are available through service classes:

```javascript
import { MachineSettingsService } from './services/machineSettingsService.js';

// Get all settings with pagination
const { data, count } = await MachineSettingsService.getAll(1, 25);

// Create new setting
const newSetting = await MachineSettingsService.create({
    plant: '3001',
    machine: 'M001',
    // ... other fields
});

// Update setting
await MachineSettingsService.update(id, { plant: '3002' });

// Delete setting
await MachineSettingsService.delete(id);
```

### Utilities
```javascript
import { showToast } from './utils/toast.js';
import { formatTimestamp } from './utils/dateFormatter.js';
import { renderPaginationControls } from './utils/pagination.js';

// Show notification
showToast('Operation successful!', 'success');

// Format date
const formatted = formatTimestamp(new Date());

// Render pagination
renderPaginationControls('paginationId', state, onPageChange, onPageSizeChange);
```

### Core Modules
```javascript
import { Navigation } from './core/navigation.js';
import { Modal } from './core/modal.js';
import { Sidebar } from './core/sidebar.js';

// Navigate to a page
Navigation.navigateToHash('#pms/settings', true);

// Open/close modal
Modal.open('modalId');
Modal.close('modalId');
```

## 🔄 Current State

**Working:** The application currently uses the original `script.js` file, which means all existing functionality works as before.

**Ready:** The new modular structure is in place and ready to use. You can start migrating features one by one.

**Next Steps:** See `MIGRATION_GUIDE.md` for detailed migration instructions.

## 🐛 Troubleshooting

### Issue: Module not found errors
**Solution:** Make sure you're using ES6 module syntax (`import/export`) and running through Vite.

### Issue: Supabase connection errors
**Solution:** Check `src/config/supabase.js` has the correct URL and anon key.

### Issue: Build fails
**Solution:** 
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Check Node.js version (should be 16+)

### Issue: Styles not loading
**Solution:** The app currently uses `style.css`. The new CSS modules in `src/styles/` are ready but not yet active.

## 📚 Documentation

- **README.md** - Full project documentation
- **MIGRATION_GUIDE.md** - Step-by-step migration guide
- **QUICK_START.md** - This file

## 🎯 Development Workflow

1. **Make changes** in `src/` folder
2. **Test locally** with `npm run dev`
3. **Build** with `npm run build`
4. **Deploy** to Vercel (automatic on push to main branch)

## 💡 Tips

- Use the service classes for all database operations
- Keep components small and focused
- Use utilities for common functionality
- Follow the existing code patterns
- Test each feature after migration

---

**Ready to start?** Run `npm install` and `npm run dev` to get started!

