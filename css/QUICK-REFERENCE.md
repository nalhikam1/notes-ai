# CSS Quick Reference

Quick guide for common styling tasks in Fnote.

## 🎨 Colors

```css
/* Backgrounds */
--bg      /* #0f0f0f - Main background */
--bg2     /* #161616 - Sidebar, cards */
--bg3     /* #1e1e1e - Inputs, hover */
--bg4     /* #252525 - Deeper elements */

/* Text */
--text    /* #e8e4dc - Primary text */
--text2   /* #9a9589 - Secondary text */
--text3   /* #5a5550 - Tertiary/muted */

/* Accent */
--accent  /* #d4a853 - Brand gold */
--accent2 /* #b8872d - Darker gold */
--accent-dim   /* rgba(212, 168, 83, 0.12) */
--accent-dim2  /* rgba(212, 168, 83, 0.06) */

/* Borders */
--border  /* #2a2a2a - Primary border */
--border2 /* #333 - Lighter border */

/* Status */
--red     /* #c0392b - Error/delete */
--green   /* #27ae60 - Success/saved */
```

## 📏 Spacing

```css
/* Dimensions */
--sidebar-w: 260px;
--rs-w: 340px;
--top-nav-h: 56px;
--status-bar-h: 30px;
--toolbar-h: 48px;
--bottom-bar-h: 100px;

/* Border Radius */
--r: 8px;   /* Standard */
--r2: 12px; /* Larger */

/* Common Padding */
padding: 8px;   /* Tight */
padding: 12px;  /* Standard */
padding: 16px;  /* Comfortable */
padding: 20px;  /* Spacious */

/* Common Gaps */
gap: 4px;   /* Minimal */
gap: 8px;   /* Standard */
gap: 12px;  /* Comfortable */
gap: 16px;  /* Spacious */
```

## 🔤 Typography

```css
/* Font Families */
font-family: 'DM Sans', sans-serif;      /* Body text */
font-family: 'Lora', serif;              /* Headings, quotes */
font-family: 'JetBrains Mono', monospace; /* Code, meta */

/* Font Sizes */
font-size: 10px;  /* Meta, labels */
font-size: 11px;  /* Small text */
font-size: 12px;  /* Secondary */
font-size: 13px;  /* Standard */
font-size: 14px;  /* Comfortable */
font-size: 16px;  /* Editor body */
font-size: 18px;  /* H3 */
font-size: 22px;  /* H2 */
font-size: 28px;  /* H1 */

/* Font Weights */
font-weight: 400; /* Regular */
font-weight: 500; /* Medium */
font-weight: 600; /* Semibold */

/* Line Heights */
line-height: 1;     /* Icons, tight */
line-height: 1.3;   /* Headings */
line-height: 1.5;   /* Forms */
line-height: 1.6;   /* Chat, descriptions */
line-height: 1.75;  /* Body text */
line-height: 1.85;  /* Editor content */
```

## 🎭 Common Patterns

### Button
```css
.my-button {
  padding: 11px 12px;
  background: var(--accent);
  color: #0f0f0f;
  border: none;
  border-radius: var(--r);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}

.my-button:hover {
  background: var(--accent2);
}
```

### Card
```css
.my-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 16px;
  transition: border-color .2s;
}

.my-card:hover {
  border-color: var(--accent);
}
```

### Input
```css
.my-input {
  width: 100%;
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: var(--r);
  padding: 11px 12px;
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color .2s;
}

.my-input:focus {
  border-color: var(--accent);
}
```

### Dropdown Menu
```css
.my-menu {
  position: fixed;
  background: var(--bg2);
  border: 1px solid var(--border2);
  border-radius: var(--r2);
  padding: 6px;
  z-index: 10000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, .6);
}

.my-menu-item {
  padding: 10px 12px;
  border-radius: var(--r);
  cursor: pointer;
  transition: all .15s;
}

.my-menu-item:hover {
  background: var(--bg3);
  color: var(--text);
}
```

## 🎬 Animations

```css
/* Fade In */
animation: fadeIn .2s ease;

/* Slide Up */
animation: slideUp .2s ease;

/* Spin (loading) */
animation: spin .8s linear infinite;

/* Pulse */
animation: pulse 1.5s ease-in-out infinite;

/* Bounce */
animation: bounce 1s ease-in-out infinite;

/* Custom Transition */
transition: all .15s;  /* Fast */
transition: all .2s;   /* Standard */
transition: all .25s;  /* Smooth */
```

## 📱 Responsive

```css
/* Desktop Only */
@media (min-width: 901px) {
  .desktop-only { display: block; }
}

/* Mobile Only */
@media (max-width: 900px) {
  .mobile-only { display: block; }
  .hide-m { display: none !important; }
}

/* Tablet */
@media (min-width: 600px) and (max-width: 900px) {
  /* Tablet styles */
}

/* Small Mobile */
@media (max-width: 400px) {
  /* Small screen adjustments */
}
```

## 🎯 Common Classes

```css
/* Layout */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }

/* Visibility */
.show { display: block; }
.hide { display: none; }
.hide-m { display: none; } /* Mobile only */
.desktop-only { } /* Desktop only */

/* States */
.active { /* Active state */ }
.selected { /* Selected state */ }
.disabled { opacity: .4; cursor: not-allowed; }

/* Text */
.text-center { text-align: center; }
.text-muted { color: var(--text3); }
.text-accent { color: var(--accent); }
```

## 🔧 Utility Snippets

### Center Content
```css
display: flex;
align-items: center;
justify-content: center;
```

### Truncate Text
```css
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

### Smooth Scroll
```css
overflow-y: auto;
-webkit-overflow-scrolling: touch;
```

### Hide Scrollbar
```css
scrollbar-width: none;
&::-webkit-scrollbar { display: none; }
```

### Backdrop Blur
```css
backdrop-filter: blur(4px);
background: rgba(0, 0, 0, .7);
```

### Hover Lift
```css
transition: transform .2s;
&:hover { transform: translateY(-2px); }
```

## 📦 Z-Index Layers

```css
z-index: 50;    /* Toolbar */
z-index: 100;   /* Status bar, AI dropdown */
z-index: 150;   /* Mobile toolbar */
z-index: 199;   /* Sidebar overlay */
z-index: 200;   /* Sidebar, mobile menus */
z-index: 300;   /* AI overlay */
z-index: 500;   /* Modal overlay */
z-index: 1000;  /* Toast, onboarding */
z-index: 10000; /* Dropdowns, menus, popups */
```

## 🎨 Theming

### Adding a New Color
1. Add to `css/base.css`:
```css
:root {
  --my-color: #hexcode;
}
```

2. Use in components:
```css
color: var(--my-color);
```

### Creating a Variant
```css
.btn-primary { /* Base */ }
.btn-secondary { /* Variant */ }
.btn-danger { /* Another variant */ }
```

## 🐛 Debugging Tips

### Check Specificity
```css
/* Low specificity (good) */
.class { }

/* Medium specificity */
.parent .child { }

/* High specificity (avoid) */
#id .class { }

/* Nuclear option (avoid) */
.class { property: value !important; }
```

### Inspect Cascade
1. Open DevTools
2. Select element
3. Check "Computed" tab
4. See which styles are applied

### Test Responsive
1. Open DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test different viewports
4. Check mobile menu behavior

## 📚 Resources

- **CSS Variables**: All in `css/base.css`
- **Layout Structure**: `css/layout.css`
- **Components**: `css/components.css`
- **Mobile Styles**: `css/mobile.css`
- **Full Docs**: `css/README.md`
- **Architecture**: `css/ARCHITECTURE.md`

---

**Quick Tip**: Use browser DevTools to inspect existing components and copy their styles!
