# Fnote CSS Architecture

Modular CSS structure for better maintainability and organization.

## File Structure

```
css/
├── base.css        # Variables, reset, animations
├── layout.css      # Main app structure, grid, flexbox
├── components.css  # Reusable UI components
├── onboarding.css  # Welcome/setup screens
├── sidebar.css     # Left navigation panel
├── editor.css      # Tiptap editor & toolbar
├── chat.css        # AI assistant panel
└── mobile.css      # Responsive overrides
```

## Module Breakdown

### 1. base.css (Foundation)
- CSS custom properties (colors, dimensions, etc.)
- Global reset styles
- Scrollbar styling
- Keyframe animations (fadeIn, slideUp, spin, pulse, bounce)

### 2. layout.css (Structure)
- Main app layout (#app, #workspace, #editor-view)
- Top navigation & breadcrumbs
- Status bar
- Dashboard views & grids
- Empty states

### 3. components.css (UI Elements)
- Buttons (primary, secondary, icon)
- Form inputs (text, select, textarea)
- Modals & overlays
- Toast notifications
- Cards (stat, project)
- Badges & chips
- AI loading overlay

### 4. onboarding.css (Setup Flow)
- Onboarding container & card
- Step indicators & dots
- Provider selection grid
- Form styling specific to onboarding

### 5. sidebar.css (Navigation)
- Sidebar structure & header
- Search input
- Collapsible sections
- Tree structure (folders, notes)
- Sidebar items & menu buttons
- Persona badge
- Template items

### 6. editor.css (Content Editing)
- Note header & title
- Toolbar (desktop)
- Toolbar dropdowns & menus
- AI dropdown menu
- Color picker popup
- Slash command menu
- Editor content area
- Tiptap styles (headings, lists, tables, etc.)
- Task list styling
- Code blocks & syntax
- Links & images

### 7. chat.css (AI Assistant)
- Right sidebar structure
- Chat tabs
- Message bubbles (user & AI)
- Chat input & send button
- Table of contents (TOC)

### 8. mobile.css (Responsive)
- Mobile breakpoints (@media queries)
- Mobile toolbar (bottom)
- Mobile menus
- Sidebar overlays
- Touch-friendly sizing
- Landscape & small screen adjustments

## Import Order

The main `style.css` imports modules in this order:

1. base → Foundation
2. layout → Structure
3. components → UI elements
4. onboarding → Setup screens
5. sidebar → Navigation
6. editor → Content editing
7. chat → AI assistant
8. mobile → Responsive overrides

This order ensures proper CSS cascade and specificity.

## CSS Variables

All design tokens are defined in `base.css`:

```css
/* Colors */
--bg, --bg2, --bg3, --bg4
--border, --border2
--text, --text2, --text3
--accent, --accent2, --accent-dim, --accent-dim2
--red, --green

/* Dimensions */
--sidebar-w: 260px
--rs-w: 340px
--top-nav-h: 56px
--status-bar-h: 30px
--toolbar-h: 48px
--bottom-bar-h: 100px

/* Borders & Shadows */
--r: 8px (border radius)
--r2: 12px (larger radius)
--shadow: 0 4px 20px rgba(0, 0, 0, 0.4)
```

## Responsive Breakpoints

- **Desktop**: > 900px
- **Tablet**: 600px - 900px
- **Mobile**: < 600px
- **Small Mobile**: < 400px
- **Landscape Mobile**: height < 500px

## Best Practices

1. **Use CSS Variables**: Always use `var(--variable)` for colors, spacing, etc.
2. **Mobile-First**: Base styles work on mobile, desktop adds enhancements
3. **Avoid !important**: Only use when absolutely necessary (e.g., overriding browser defaults)
4. **Consistent Naming**: Use BEM-like naming (block__element--modifier)
5. **Transitions**: Keep animations smooth (0.15s - 0.25s)

## Adding New Styles

When adding new features:

1. Identify which module it belongs to
2. Add styles to the appropriate file
3. Use existing CSS variables
4. Follow the naming conventions
5. Add mobile styles to `mobile.css` if needed

## Performance

- Total CSS size: ~85KB (unminified)
- Modular loading via @import
- Browser caching per module
- No unused styles (each module is actively used)

## Maintenance

To update styles:
1. Find the relevant module
2. Make changes
3. Test on desktop & mobile
4. Check for specificity conflicts
5. Update this README if structure changes
