# 🖥️ Localhost Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs:
- ✅ Vite (build tool & dev server)
- ✅ @supabase/supabase-js (database client)

### 2. Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in 500ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

The browser should automatically open to `http://localhost:3000`

### 3. Verify It Works

1. **Check Browser Console (F12)**
   - Should see: `✅ Supabase initialized and available globally`
   - No red errors

2. **Visual Check**
   - Login page should appear
   - Blue gradient background
   - Login/Signup tabs visible

## 🎯 What You Should See

### Login Page
- Beautiful blue gradient background
- "Hello! Have a GOOD DAY" greeting on left
- Login/Signup form on right
- Tabs to switch between Login and Signup

### After Login
- Sidebar navigation on left
- Main content area
- Header with user info
- Dashboard or selected page

## 🔧 Configuration

### Port Configuration

If port 3000 is busy, edit `vite.config.js`:

```javascript
server: {
  port: 3001,  // Change to any available port
  open: true
}
```

### Supabase Configuration

Supabase is configured in `index.html` (inline script) and `src/config/supabase.js`.

**Current Settings:**
- URL: `https://tzoloagoaysipwxuyldu.supabase.co`
- Anon Key: Already configured

**To Change:**
1. Update `index.html` (inline script around line 1350)
2. Update `src/config/supabase.js`

## 📁 File Structure

```
├── index.html          # Main HTML file (loads everything)
├── script.js           # Application logic (legacy, but working)
├── style.css           # All styles
├── src/                # New modular structure (ready to use)
│   ├── services/       # Database operations
│   ├── utils/          # Utility functions
│   ├── core/           # Core app logic
│   └── config/         # Configuration
├── package.json        # Dependencies
└── vite.config.js      # Vite configuration
```

## 🐛 Troubleshooting

### Server Won't Start

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Windows PowerShell
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Or change port in vite.config.js
```

### Module Errors

**Error:** `Cannot find module` or `Failed to resolve import`

**Solution:**
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase Not Loading

**Error:** `window.supabase is undefined`

**Solution:**
1. Check internet connection (Supabase loads from CDN)
2. Check browser console for errors
3. Verify Supabase URL and key are correct
4. Check that script loads in correct order

### CORS Errors

**Error:** `CORS policy` errors

**Solution:**
- Make sure you're using `http://localhost:3000` not `file://`
- Vite handles CORS automatically
- Check Supabase dashboard for CORS settings

### Page Not Loading

**Error:** Blank page or "Cannot GET /"

**Solution:**
1. Make sure `index.html` exists in root directory
2. Check that Vite is serving from correct directory
3. Verify file paths in HTML are correct

## ✅ Verification Checklist

Before starting development, verify:

- [ ] `npm install` completed successfully
- [ ] `npm run dev` starts without errors
- [ ] Browser opens to `http://localhost:3000`
- [ ] Login page appears
- [ ] Browser console shows no errors
- [ ] `window.supabase` is defined (check console)
- [ ] Can see login form
- [ ] Can switch between Login/Signup tabs

## 🚀 Development Workflow

1. **Start Server**
   ```bash
   npm run dev
   ```

2. **Make Changes**
   - Edit files in your editor
   - Vite will auto-reload (Hot Module Replacement)

3. **Test Changes**
   - Refresh browser (or it auto-refreshes)
   - Check console for errors
   - Test functionality

4. **Build for Production**
   ```bash
   npm run build
   ```
   Output will be in `dist/` folder

## 📝 Notes

- **Hot Reload:** Vite automatically reloads when you save files
- **Fast Refresh:** Changes appear instantly
- **Console Logs:** Check browser console (F12) for debugging
- **Network Tab:** Check Network tab to see API calls to Supabase

## 🎉 You're Ready!

Once you see the login page without errors, you're ready to:
- ✅ Test the application
- ✅ Start developing
- ✅ Use the new modular structure
- ✅ Deploy to Vercel

---

**Need Help?** Check `README.md` or `QUICK_START.md` for more information.

