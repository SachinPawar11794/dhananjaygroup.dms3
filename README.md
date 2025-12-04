# IoT Management System

A scalable Production Management System (PMS) built with Supabase, designed for managing IoT machine settings, production data, and user management.

## 🏗️ Project Structure

```
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page-specific components
│   ├── services/         # API/Supabase service layers
│   ├── utils/            # Utility functions
│   ├── config/           # Configuration files
│   ├── styles/           # CSS modules
│   ├── core/             # Core application logic
│   └── app.js            # Main entry point
├── public/               # Static assets
├── dist/                 # Build output (generated)
├── index.html            # Main HTML file
├── package.json          # Dependencies
├── vite.config.js        # Vite configuration
└── vercel.json           # Vercel deployment config
```

## 🚀 Features

- **Production Management System (PMS)**
  - Machine Settings
  - Process Master
  - Work Center Master
  - IoT Data Collection
  - Shift Schedule
  - Loss Reason Management
  - Hourly Reports

- **Task Manager** - Employee checklist and task tracking
- **User Management** - Role-based access control (Admin, HOD, Operator)
- **Authentication** - Email/password with admin approval workflow

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite
- **Deployment**: Vercel
- **Styling**: CSS Modules

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "DMS SUPERBASE SOFTWARE"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Update `src/config/supabase.js` with your Supabase URL and anon key
   - Ensure your Supabase database has the required tables:
     - `MachineSettings`
     - `ProcessMaster`
     - `WorkCenterMaster`
     - `IoTData`
     - `ShiftSchedule`
     - `LossReason`
     - `HourlyReport`
     - `TaskManager`
     - `profiles`

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🌐 Deployment

### Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Vercel will automatically detect the Vite configuration
4. Deploy!

The `vercel.json` file is already configured for SPA routing.

## 📁 Code Organization

### Services (`src/services/`)
Each service handles database operations for a specific table:
- `authService.js` - Authentication operations
- `machineSettingsService.js` - Machine settings CRUD
- `processMasterService.js` - Process master data
- `workCenterMasterService.js` - Work center/machine management
- `iotDataService.js` - IoT data collection
- `shiftScheduleService.js` - Shift scheduling
- `lossReasonService.js` - Loss reason management
- `taskManagerService.js` - Task management
- `userService.js` - User/profile management
- `hourlyReportService.js` - Hourly report generation

### Utils (`src/utils/`)
Reusable utility functions:
- `toast.js` - Toast notifications
- `dateFormatter.js` - Date formatting utilities
- `pagination.js` - Pagination helpers
- `filters.js` - Data filtering utilities
- `taskId.js` - Task ID generation

### Core (`src/core/`)
Core application logic:
- `app.js` - Application initialization
- `navigation.js` - Routing and navigation
- `sidebar.js` - Sidebar component
- `modal.js` - Modal component
- `auth.js` - Authentication UI management
- `emailConfirmation.js` - Email confirmation handler

## 🔧 Development Best Practices

1. **Modular Code**: Keep code organized in appropriate modules
2. **Service Layer**: All database operations go through service classes
3. **Error Handling**: Use try-catch blocks and proper error messages
4. **Code Reusability**: Extract common functionality into utilities
5. **ES6 Modules**: Use import/export for better code organization

## 📝 Migration Notes

This project has been migrated from a single-file structure to a modular architecture:

- **Before**: `index.html`, `script.js`, `style.css` (all code in 3 files)
- **After**: Modular structure with separated concerns

### Key Improvements:
- ✅ Separated services from UI logic
- ✅ Modular CSS structure (ready for further refactoring)
- ✅ Component-based architecture
- ✅ Better code organization and maintainability
- ✅ Easier to test and extend
- ✅ Follows modern JavaScript best practices

## 🔐 Environment Variables

For production, consider using environment variables for sensitive configuration:

1. Create a `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Update `src/config/supabase.js` to use environment variables:
   ```javascript
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
   ```

## 📄 License

[Your License Here]

## 👥 Contributors

[Your Name/Team]

---

**Note**: This is a refactored version of the original single-file application. The original functionality is preserved while improving code organization and maintainability.

