# ✅ Setup Verification

## Step 1: Install Dependencies

```bash
npm install
```

Expected output: Should install Vite and Supabase client.

## Step 2: Start Development Server

```bash
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Step 3: Open Browser

Open `http://localhost:3000` in your browser.

## Step 4: Verify Application

### Check Browser Console (F12)

1. **Open DevTools** (Press F12)
2. **Go to Console tab**
3. **Check for:**
   - ✅ No red errors
   - ✅ `window.supabase` should be defined
   - ✅ Application should initialize

### Expected Console Output

```
✅ Supabase initialized and available globally
```

### Visual Checks

1. **Login Page Should Appear**
   - Blue gradient background
   - Login/Signup tabs
   - Form fields visible

2. **After Login**
   - Sidebar appears on left
   - Main content area visible
   - Navigation works

## Step 5: Test Authentication

1. **Try to Login**
   - Use existing credentials
   - Or create new account

2. **Check for Errors**
   - Network tab should show Supabase API calls
   - Console should show success/error messages

## Common Issues & Solutions

### ❌ Issue: "Cannot GET /"
**Solution:** Make sure you're accessing `http://localhost:3000` not `file://`

### ❌ Issue: "window.supabase is undefined"
**Solution:** 
- Check that Supabase script loads before script.js
- Check browser console for module loading errors
- Verify internet connection (Supabase loads from CDN)

### ❌ Issue: Port 3000 already in use
**Solution:**
```bash
# Option 1: Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Option 2: Use different port
# Edit vite.config.js and change port
```

### ❌ Issue: Module not found errors
**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### ❌ Issue: CORS errors
**Solution:** 
- Make sure you're using Vite dev server (not file://)
- Vite handles CORS automatically
- Check Supabase CORS settings if needed

## ✅ Success Indicators

- [ ] Server starts without errors
- [ ] Browser opens to login page
- [ ] No console errors
- [ ] `window.supabase` is defined
- [ ] Can see login form
- [ ] Can navigate after login

## 🎯 Next Steps After Verification

1. **Test Login/Signup**
2. **Navigate through pages**
3. **Test CRUD operations**
4. **Verify data loads from Supabase**

---

**If everything works, you're ready to develop! 🚀**

