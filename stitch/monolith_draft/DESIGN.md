# Design System Documentation: Architectural Minimalism

## 1. Overview & Creative North Star
**Creative North Star: The Editorial Monolith**
This design system rejects the "softness" of modern SaaS interfaces in favor of architectural precision and editorial authority. It is inspired by Swiss International Style and high-end printed journals. By leveraging extreme contrast, a strictly sharp 0px radius, and intentional asymmetry, we move away from a "template" look toward a bespoke, curated experience. 

The aesthetic is not merely "minimalist"—it is **structural**. We use the absence of color as a canvas for hierarchy, where the weight of typography and the density of monochromatic blocks define the user's journey.

## 2. Colors & Tonal Depth
While the primary visual identity is driven by absolute black (`#000000`) and white (`#FFFFFF`), we utilize a sophisticated range of neutral tokens to create a "nested" hierarchy.

*   **The "No-Line" Rule for Layout:** To maintain a premium editorial feel, do not use 1px solid lines to separate major sections of the app (e.g., sidebar from main content). Instead, use background shifts. A `surface-container-low` (`#f3f3f3`) sidebar sitting against a `surface` (`#f9f9f9`) editor creates a cleaner, more sophisticated boundary than a stroke.
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of heavy cardstock. 
    *   **Base:** `surface` (#f9f9f9)
    *   **Content Blocks:** `surface-container-lowest` (#ffffff) for the highest focus (e.g., the active note).
    *   **Supporting Elements:** `surface-container-high` (#e8e8e8) for utility panels.
*   **Signature Textures:** Although the system is solid-color focused, use the `primary` (#000000) token for heavy "ink-block" CTAs to create a physical sense of weight.

## 3. Typography
The typography is the architecture of this system. We use **Inter** exclusively to provide a clean, modern, and highly legible sans-serif experience.

*   **Display & Headline (The Editorial Voice):** Use `display-lg` and `headline-lg` to create dramatic entries. In a note-taking context, the note title should feel like a magazine headline.
*   **Title & Body (The Functional Core):** Use `title-md` for organization and `body-lg` for the actual note-writing. The contrast between a massive `display` headline and a disciplined `body-md` label creates the "high-end" signature.
*   **Intentional Asymmetry:** Align headlines to the far left with generous top padding to allow the negative space to "breathe," emphasizing the professional, organized aesthetic.

## 4. Elevation & Depth
In this system, depth is achieved through **Tonal Layering**, not traditional drop shadows. We evoke a sense of physical layering without using "software-ish" effects.

*   **The Layering Principle:** To lift an element, change its surface token. An active note card should be `surface-container-lowest` (#ffffff) placed on a `surface-dim` (#dadada) workspace. This creates a "soft lift."
*   **The "Ghost Border" Fallback:** If a container requires a boundary for accessibility (e.g., a search input), use a "Ghost Border" by applying the `outline-variant` (#c6c6c6) at 20% opacity. Never use 100% opaque black borders for layout boxes; they are too aggressive for a professional note-taking environment.
*   **Zero Roundedness:** All elements—buttons, inputs, cards—must use a **0px radius**. This reinforces the "Architectural" feel and ensures every element feels intentional and sharp.

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#000000) background with `on_primary` (#e2e2e2) text. 0px corners. High-impact.
*   **Secondary:** `outline` (#777777) 1px border with transparent background.
*   **Tertiary:** Ghost style; text only in `on_surface_variant` (#474747), underlining only on hover.

### Input Fields
*   **Style:** No full box. Use a bottom border only (1px solid `primary`) or a solid block of `surface-container-highest` (#e2e2e2).
*   **States:** On focus, the bottom border thickens to 2px. Error states use `error` (#ba1a1a) text but maintain the sharp-edged block aesthetic.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines between notes in a list. Instead, use a 12px or 16px `spacing-scale` gap. 
*   **Selection:** An active note in the list should be indicated by a solid `primary` (#000000) vertical bar (4px wide) on the far left edge of the list item, paired with a `surface-container-highest` (#e2e2e2) background.

### Tooltips & Overlays
*   **Appearance:** Use `inverse_surface` (#303030) with `inverse_on_surface` (#f1f1f1) text.
*   **Sharpness:** Ensure even small floating elements maintain the 0px radius.

## 6. Do's and Don'ts

### Do:
*   **Do** use massive amounts of white space. The "premium" feel comes from the luxury of unused space.
*   **Do** use extreme typographic scale. A small `label-sm` next to a `headline-lg` creates professional tension.
*   **Do** keep every corner perfectly square (0px).

### Don't:
*   **Don't** use 1px borders for general containment; let the background colors do the work.
*   **Don't** use standard "drop shadows." If you must lift a floating menu, use a 10% opacity `on_surface` shadow with a 20px blur and 0px offset.
*   **Don't** use gradients or rounded corners. It breaks the "Architectural Minimalism" logic and makes the system look generic. 
*   **Don't** clutter the screen. If a feature isn't essential to the note-taking flow, hide it in a `surface-container` utility drawer.