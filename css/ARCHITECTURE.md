# Fnote CSS Architecture Diagram

## Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        style.css                             │
│                    (Main Entry Point)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ @import
                              ▼
        ┌─────────────────────────────────────────────┐
        │                                             │
        ▼                                             ▼
┌──────────────┐                              ┌──────────────┐
│  base.css    │                              │ layout.css   │
│  (91 lines)  │                              │ (213 lines)  │
├──────────────┤                              ├──────────────┤
│ • Variables  │                              │ • #app       │
│ • Reset      │                              │ • #workspace │
│ • Scrollbar  │                              │ • Views      │
│ • Animations │                              │ • Top Nav    │
└──────────────┘                              │ • Dashboard  │
                                              └──────────────┘
        │                                             │
        │                                             │
        ▼                                             ▼
┌──────────────┐                              ┌──────────────┐
│components.css│                              │onboarding.css│
│ (318 lines)  │                              │ (102 lines)  │
├──────────────┤                              ├──────────────┤
│ • Buttons    │                              │ • Card       │
│ • Forms      │                              │ • Steps      │
│ • Modals     │                              │ • Dots       │
│ • Toast      │                              │ • Providers  │
│ • Cards      │                              └──────────────┘
└──────────────┘
        │
        │
        ▼
┌──────────────┐                              ┌──────────────┐
│ sidebar.css  │                              │ editor.css   │
│ (384 lines)  │                              │ (656 lines)  │
├──────────────┤                              ├──────────────┤
│ • Header     │                              │ • Toolbar    │
│ • Search     │                              │ • Dropdowns  │
│ • Sections   │                              │ • AI Menu    │
│ • Tree       │                              │ • Tiptap     │
│ • Items      │                              │ • Content    │
│ • Footer     │                              │ • Slash Menu │
└──────────────┘                              └──────────────┘
        │                                             │
        │                                             │
        ▼                                             ▼
┌──────────────┐                              ┌──────────────┐
│  chat.css    │                              │ mobile.css   │
│ (240 lines)  │                              │ (298 lines)  │
├──────────────┤                              ├──────────────┤
│ • Right Bar  │                              │ • @media     │
│ • Messages   │                              │ • Toolbar    │
│ • Bubbles    │                              │ • Menus      │
│ • Input      │                              │ • Overlays   │
│ • TOC        │                              │ • Responsive │
└──────────────┘                              └──────────────┘
```

## Dependency Flow

```
base.css (Foundation)
    ↓
layout.css (Structure)
    ↓
components.css (UI Elements)
    ↓
┌───────────┬──────────────┬──────────────┐
│           │              │              │
▼           ▼              ▼              ▼
onboarding  sidebar        editor         chat
    ↓           ↓              ↓              ↓
    └───────────┴──────────────┴──────────────┘
                        ↓
                   mobile.css (Overrides)
```

## Module Responsibilities

### 🎨 base.css - Design System
- CSS custom properties (design tokens)
- Global resets and normalizations
- Scrollbar styling
- Reusable animations

### 📐 layout.css - Page Structure
- Main app container (#app)
- Workspace layout (#workspace)
- View containers (.view)
- Navigation bars
- Dashboard grids

### 🧩 components.css - UI Building Blocks
- Button variants
- Form controls
- Modal dialogs
- Toast notifications
- Card components
- Badges and chips

### 🚀 onboarding.css - First-Run Experience
- Welcome card
- Step indicators
- Provider selection
- Form styling

### 📁 sidebar.css - Navigation Panel
- Sidebar structure
- Search functionality
- Collapsible sections
- Tree navigation
- Project/folder items
- Persona badge

### ✏️ editor.css - Content Editing
- Note header and title
- Toolbar (desktop)
- Dropdown menus
- AI integration
- Color picker
- Slash commands
- Tiptap content styles
- Rich text formatting

### 💬 chat.css - AI Assistant
- Right sidebar panel
- Chat interface
- Message bubbles
- Input controls
- Table of contents

### 📱 mobile.css - Responsive Design
- Mobile breakpoints
- Touch-friendly controls
- Bottom toolbar
- Slide-out menus
- Overlay behaviors

## File Size Distribution

```
editor.css    ████████████████████████████ 28.5% (656 lines)
sidebar.css   ████████████████ 16.7% (384 lines)
components.css ██████████████ 13.8% (318 lines)
mobile.css    ████████████ 12.9% (298 lines)
chat.css      ██████████ 10.4% (240 lines)
layout.css    █████████ 9.3% (213 lines)
onboarding.css ████ 4.4% (102 lines)
base.css      ███ 4.0% (91 lines)
─────────────────────────────────────────
Total:        2,302 lines
```

## Cascade Order

The import order in `style.css` is critical:

1. **base.css** - Must be first (defines variables)
2. **layout.css** - Defines structure
3. **components.css** - Builds on structure
4. **Feature modules** - Use base + layout + components
5. **mobile.css** - Must be last (overrides everything)

## Naming Conventions

### BEM-like Structure
```css
.block { }              /* Component */
.block__element { }     /* Part of component */
.block--modifier { }    /* Variant of component */
```

### ID Selectors
```css
#app { }               /* Main containers */
#sidebar { }           /* Major sections */
#editor { }            /* Core features */
```

### Utility Classes
```css
.hide-m { }            /* Hide on mobile */
.desktop-only { }      /* Desktop only */
.show { }              /* State class */
.active { }            /* Active state */
```

## CSS Variables Usage

### Colors
```css
var(--bg)              /* Background levels 1-4 */
var(--text)            /* Text levels 1-3 */
var(--accent)          /* Brand color */
var(--border)          /* Border levels 1-2 */
```

### Dimensions
```css
var(--sidebar-w)       /* Sidebar width */
var(--toolbar-h)       /* Toolbar height */
var(--r)               /* Border radius */
```

### Transitions
```css
transition: all .15s;  /* Fast interactions */
transition: all .2s;   /* Standard */
transition: all .25s;  /* Smooth animations */
```

## Performance Considerations

### File Loading
- Browser caches each module separately
- Changes to one module don't invalidate others
- Parallel loading via @import

### Specificity
- Low specificity (mostly classes)
- Minimal use of !important
- Clear cascade order

### Maintainability
- ~230 lines per file (easy to scan)
- Single responsibility per module
- Clear naming conventions

## Future Enhancements

### Potential Additions
1. **themes/** - Light/dark theme variants
2. **utilities/** - Utility class library
3. **animations/** - Complex animations
4. **print.css** - Print styles

### Build Optimization
1. CSS minification
2. Autoprefixer for browser support
3. PurgeCSS for unused styles
4. CSS modules for scoping

## Maintenance Guide

### Adding New Styles
1. Identify the appropriate module
2. Follow existing patterns
3. Use CSS variables
4. Add mobile styles if needed
5. Update documentation

### Refactoring Existing Styles
1. Check dependencies
2. Test on all breakpoints
3. Verify cascade order
4. Update related modules

### Debugging
1. Check browser DevTools
2. Verify import order
3. Check specificity conflicts
4. Test mobile viewport

---

**Last Updated**: 2026-04-09
**Total Lines**: 2,302
**Modules**: 8
**Status**: ✅ Production Ready
