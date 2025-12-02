# BrightCare Medical Clinic - Refactored Structure

## Overview

The medical clinic application has been refactored to improve code organization and maintainability:

- **HTML Pages → PHP Router**: All HTML pages replaced with a single `/public/index.php` that routes pages based on query parameters
- **CSS Consolidation**: All CSS files merged into a single `main.css`
- **JavaScript Consolidation**: All JavaScript files merged into a single `app.js`

## New Structure

### Routing

All pages now route through `/public/index.php?page=<pageName>`:

- `?page=login` → Login page
- `?page=appointments` → View appointments list
- `?page=appointments_calendar` → Calendar view
- `?page=appointment_new` → Create new appointment
- `?page=patients` → View patients list
- `?page=patient_new` → Create new patient
- `?page=patient_view&id=<patientId>` → View patient details
- `?page=doctors` → View doctors list
- `?page=doctor_new` → Create new doctor
- `?page=rooms` → View rooms
- `?page=room_new` → Create new room
- `?page=waitlist` → Waiting list management

### Asset Files

#### CSS

- **Single file**: `/public/css/main.css`
  - Contains all styles from previous:
    - `appointments.css`
    - `patient_details.css`
    - `login.css`
    - `doctor_new.css`
    - `patient_new.css`
    - `waitlist.css`

#### JavaScript

- **Single file**: `/public/js/app.js`
  - Contains all functionality from:
    - `login.js`
    - `appointments.js`
    - `patient_details.js`
    - `appointment_new.js`
    - `waitlist.js`
    - `appointments_calendar.js` (placeholder)
  - Organized with page-specific modules that auto-initialize based on DOM elements
  - Shared utility functions in `AppUtils` namespace

### Layout Changes

All pages now have a consistent structure:

1. Single HTML head with unified CSS
2. Conditional sidebar rendering (not shown on login)
3. Main content area for page-specific markup
4. Single app.js script at footer

## Key Features

### Universal Authentication

- Auth guard checks token on every page load
- Automatic redirect to login if not authenticated
- Logout button available on all app pages

### Smart Page Detection

Each JavaScript module checks for its specific DOM elements (`getElementById`) before initializing:

- If elements don't exist, the module silently skips
- This allows all functionality to coexist in one file
- No performance penalty for unused code

### Unified Utilities

`AppUtils` object provides common functions:

```javascript
-getToken() - // Get JWT from storage
  authHeaders() - // Create Authorization header
  escapeHtml() - // HTML entity escape
  cssSafe() - // CSS class name safe conversion
  debounce() - // Debounce function calls
  normalizeTime() - // Format time strings
  toast(); // Show toast notification
```

### Navigation Updates

All internal links now use PHP routing:

- Old: `href="./appointments.html"`
- New: `href="/medical_clinic/index.php?page=appointments"`
- Old: `href="./patient_view.html?id=123"`
- New: `href="/medical_clinic/index.php?page=patient_view&id=123"`

## Migration Guide for Old Links

If you have external links pointing to old HTML pages, they should be updated:

### Login

- Old: `/medical_clinic/public/html/login.html`
- New: `/medical_clinic/login.php` (redirect) or `/medical_clinic/public/index.php?page=login`

### Example Appointments Page

- Old: `/medical_clinic/public/html/appointments.html`
- New: `/medical_clinic/public/index.php?page=appointments`

### Patient with ID Parameter

- Old: `/medical_clinic/public/html/patient_view.html?id=5`
- New: `/medical_clinic/public/index.php?page=patient_view&id=5`

## File Structure

```
medical_clinic/
├── api/                    # API endpoints (unchanged)
├── src/                    # Backend utilities (unchanged)
├── config.php             # Configuration (unchanged)
├── hash.php               # Password utilities (unchanged)
├── login.php              # Redirect to login page
│
└── public/
    ├── index.php          # NEW: Main entry point (router)
    ├── css/
    │   ├── main.css       # NEW: Consolidated styles
    │   └── [old files removed]
    ├── js/
    │   ├── app.js         # NEW: Consolidated scripts
    │   └── [old files removed]
    └── html/              # OLD: Directory can be deleted
        └── [all .html files - deprecated]
```

## Development Notes

### Adding New Functionality

1. Add new page case in `index.php` route handler
2. Create render function for page content
3. Add JavaScript module in `app.js` that checks for page-specific DOM element
4. Add CSS rules to `main.css` with page-specific selectors if needed

### Adding New Pages

Example template:

```php
// In index.php switch statement
case 'my_new_page':
    $pageTitle = 'My New Page — BrightCare';
    $template = 'my_new_page';
    break;

// Add render function
function renderMyNewPage() {
    ?>
    <div class="layout">
        <?php renderSidebar('my_new_page'); ?>
        <main class="container">
            <!-- Page content -->
        </main>
    </div>
    <?php
}

// In main switch at bottom
elseif ($page === 'my_new_page') {
    renderMyNewPage();
}
```

### JavaScript Module Template

```javascript
(function () {
  // Check for page-specific element to prevent running on other pages
  const specificElement = document.getElementById("page-specific-id");
  if (!specificElement) return; // Not on this page

  // Rest of module code
})();
```

## Benefits of This Refactoring

✅ **Single Source of Truth**: One CSS file, one JS file
✅ **Easier Maintenance**: Find all styles/scripts in one place
✅ **Better Organization**: Clear separation of concerns
✅ **Reduced HTTP Requests**: Fewer files to load
✅ **Consistent Experience**: All pages share same layout system
✅ **Better Caching**: Browser can cache larger files effectively
✅ **Cleaner Project Structure**: Less file clutter

## Backwards Compatibility

The `/medical_clinic/login.php` file redirects to the new router for compatibility.

Old HTML files in `/public/html/` are no longer needed but can be kept as backup.

## API Integration

The refactored application maintains 100% compatibility with existing APIs:

- All API endpoints remain unchanged
- Authentication (JWT tokens) works the same way
- Data models and formats are identical

## Testing Checklist

- [ ] Login works and tokens are stored
- [ ] Navigation between pages works
- [ ] Appointments list loads
- [ ] Patient list loads
- [ ] Patient details page loads with correct ID
- [ ] Edit forms work
- [ ] Logout clears tokens and redirects
- [ ] Page refresh maintains state
- [ ] Responsive design works on mobile
