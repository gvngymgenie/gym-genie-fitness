# Superadmin Module Control Panel

## Overview
A hidden superadmin control panel that manages which modules are available in the system. This operates at a higher level than the regular Role & Permission system - even admin/owner users cannot access modules that are disabled through this panel.

## Architecture

### Database
- **Table**: `module_control`
- **Fields**:
  - `id`: UUID primary key
  - `module_name`: Unique module identifier (e.g., "dashboard", "members")
  - `module_label`: Display label (e.g., "Dashboard", "Members")
  - `enabled`: Boolean flag to enable/disable the module
  - `description`: Module description
  - `created_at`, `updated_at`: Timestamps

### Default Modules
1. **dashboard** - Dashboard
2. **leads** - Leads
3. **members** - Members
4. **attendance** - Attendance
5. **workouts** - Workouts & Diet
6. **payments** - Payments
7. **trainers** - Personal Trainers
8. **salary** - Trainer Salary
9. **reports** - Reports
10. **notifications** - Notifications
11. **admin** - Admin Settings
12. **options** - Options

## Access

### Opening the Terminal
- **Hotkey**: `Ctrl + Shift + M` (or `Cmd + Shift + M` on Mac)
- **Visibility**: Hidden - no menu item or button exists
- **Security**: Passphrase required on first use

### Terminal Authentication
- **Default Passphrase**: `superadmin2026`
- **Session-based**: Authentication resets when terminal is closed
- **Visual Indicator**: 
  - Red "locked" prompt when authenticated
  - Green "superadmin" prompt when authenticated

## Terminal Commands

### Basic Commands
```
help          - Show all available commands
list          - List all modules with their enabled status
status        - Show enabled and disabled modules summary
clear         - Clear terminal screen
exit/quit     - Close the terminal
```

### Module Management
```
enable <module>    - Enable a module (e.g., "enable members")
disable <module>   - Disable a module (e.g., "disable leads")
add <name> <label> - Add a new custom module
refresh            - Refresh module list from server
```

### Examples
```bash
superadmin> list
superadmin> enable members
superadmin> disable leads
superadmin> status
superadmin> add custom_module "Custom Module"
```

## Integration Points

### 1. Sidebar Navigation (`AppSidebar.tsx`)
- Filters navigation items based on enabled modules
- Even admin users cannot see disabled modules
- Applied before role-based permission checks

### 2. Role & Permissions (`AdminRoles.tsx`)
- Only shows enabled modules in the permission matrix
- Administrators can only assign permissions for enabled modules
- Shows message when no modules are enabled

### 3. API Permissions (`/api/permissions`)
- Returns `enabledModules` array
- Filters `availablePages` based on enabled modules
- Used by frontend auth context

### 4. Auth Context (`auth.tsx`)
- Fetches enabled modules on login
- Provides `isModuleEnabled(moduleName)` function
- Stores `enabledModules` array in context

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/module-control` | Get all modules |
| GET | `/api/module-control/enabled` | Get enabled modules only |
| PUT | `/api/module-control/:moduleName` | Enable/disable module |
| POST | `/api/module-control` | Add new module |
| POST | `/api/module-control/seed` | Seed default modules |

## Security Considerations

### Current Implementation
- **Passphrase**: Hardcoded in frontend (`superadmin2026`)
- **Access**: Only via hotkey combination
- **Visibility**: No UI elements expose this feature

### Production Recommendations
1. **Environment Variable**: Move passphrase to environment variable
2. **JWT Token**: Add superadmin role-based authentication
3. **Audit Logging**: Log all module control changes
4. **IP Whitelisting**: Restrict access to specific IPs
5. **2FA**: Require two-factor authentication for superadmin access

## Workflow Example

### Scenario: Disable "Leads" Module System-Wide

1. **Open Terminal**: Press `Ctrl + Shift + M`
2. **Authenticate**: Type `superadmin2026` and press Enter
3. **Check Status**: Type `list` to see all modules
4. **Disable Module**: Type `disable leads`
5. **Verify**: Type `status` to confirm
6. **Exit**: Type `exit`

**Result**:
- Leads navigation item disappears for all users
- Leads page not accessible even for admin
- Role & Permissions page no longer shows Leads option
- API `/api/permissions` excludes leads from available pages

### Scenario: Re-enable Module

1. Open terminal: `Ctrl + Shift + M`
2. Type: `enable leads`
3. Verify: `list`

**Result**: All functionality restored immediately

## Database Migration

Migration file: `migrations/0035_create_module_control_table.sql`

If automatic migration fails, run manually:
```bash
psql $DATABASE_URL -f migrations/0035_create_module_control_table.sql
```

## Files Modified/Created

### Created
- `/shared/schema.ts` - Added `moduleControl` table definition
- `/server/routes/module-control.ts` - API routes
- `/server/storage.ts` - Storage methods (updated)
- `/client/src/components/admin/ModuleControlTerminal.tsx` - Terminal UI
- `/client/src/hooks/useSuperadminTerminal.ts` - Hotkey hook
- `/migrations/0035_create_module_control_table.sql` - Migration

### Updated
- `/server/routes.ts` - Registered module-control routes
- `/server/routes/roles.ts` - Filter permissions by enabled modules
- `/client/src/App.tsx` - Integrated terminal component
- `/client/src/lib/auth.tsx` - Added enabled modules context
- `/client/src/components/layout/AppSidebar.tsx` - Filter by enabled modules
- `/client/src/pages/Admin/Roles.tsx` - Show only enabled modules

## Troubleshooting

### Terminal not opening
- Check hotkey isn't blocked by browser
- Try different browser
- Check browser console for errors

### Modules not persisting
- Check database connection
- Verify migration ran successfully
- Check API responses in browser dev tools

### Build errors
- Run `npm install` to ensure xterm.js packages are installed
- Check TypeScript compilation: `npx tsc --noEmit`
- Clear build cache: `rm -rf dist`

## Future Enhancements

1. **Module Dependencies**: Prevent disabling modules that others depend on
2. **Custom Modules**: UI to create completely new modules
3. **Module Groups**: Group modules for easier management
4. **Schedule**: Auto-enable/disable modules on schedule
5. **User-specific**: Override modules per user instead of globally
6. **Analytics**: Track which modules are most/least used
7. **Backup/Restore**: Export/import module configurations

## Notes

- This is a **superadmin** feature - higher than regular admin
- Changes are **immediate** - no server restart required
- All modules are **enabled by default** after migration
- Disabling a module doesn't delete data, just hides functionality
- Re-enabling restores full functionality
