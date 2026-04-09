# CSS Fix - Class Name Conflict

## Issue Found
After splitting CSS into modules, there was a class name conflict:
- `.section-title` was defined in both `sidebar.css` and `layout.css`
- This caused styling issues on the dashboard view

## Root Cause
When splitting the monolithic CSS, two different components were using the same class name:
1. **Sidebar section header** - Used `.section-title` for "Projects" header
2. **Dashboard view** - Used `.section-title` for "My Projects" label

The sidebar version (11px, uppercase) was overriding the dashboard version (12px, normal case).

## Solution
Renamed the sidebar class to be more specific:
- Changed `.section-title` → `.section-header-title` in `css/sidebar.css`
- Updated HTML in `index.html` to use the new class name
- Kept `.section-title` in `css/layout.css` for dashboard use

## Files Changed
1. `css/sidebar.css` - Renamed class
2. `index.html` - Updated class reference

## Testing
- ✅ No CSS syntax errors
- ✅ No diagnostic issues
- ✅ Class names now unique and specific
- ✅ Both components styled correctly

## Lesson Learned
When splitting CSS:
1. Check for duplicate class names across modules
2. Use more specific naming (BEM methodology)
3. Consider prefixing classes by module (e.g., `.sidebar-title`, `.dashboard-title`)

## Prevention
For future refactoring:
- Use CSS naming conventions (BEM, SMACSS, etc.)
- Prefix classes by component/module
- Run a duplicate class name checker
- Test thoroughly after splitting

---
**Status**: ✅ Fixed
**Date**: 2026-04-09
