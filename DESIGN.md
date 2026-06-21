# Design

## Visual System
- Surface style: restrained operational UI with white base and cobalt accents.
- Motion style: short transitions (150-250ms) for state changes only.
- Layout model: left nav + top utility bar + primary data workspace + detail panel.

## Palette (OKLCH)
```css
:root {
  --bg: oklch(1 0 0);
  --surface: oklch(0.985 0.003 230);
  --ink: oklch(0.22 0.02 230);
  --muted: oklch(0.54 0.02 230);
  --primary: oklch(0.63 0.11 230);
  --primary-dark: oklch(0.54 0.1 230);
}
```

## Typography
- Primary families: `Sora`, `Manrope`, `Avenir Next`, `Segoe UI`, sans-serif fallback.
- Scale intent: compact operational hierarchy with strong label/body contrast.

## Component States
- Inputs: default, focus ring, invalid-safe fallback.
- Buttons: default, hover, disabled.
- Nav/tab triggers: default, active, hover.
- Dialogs/drawers: open, close, focus return.
- Data states: empty, populated, pending formula.

## Responsive Rules
- Mobile: dialog-based nav, single-column property workspace.
- Tablet: mixed grids with compact typography.
- Desktop: fixed sidebar and two-column properties workspace.
- Tables remain horizontally readable via container overflow.
