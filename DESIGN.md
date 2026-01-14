# ConsultantOS Design System

## Design Philosophy

ConsultantOS is a **world-leading startup consultant operating system**. The design must reflect:

- **Authority & Trust**: Corporate professionalism that inspires confidence
- **Clarity & Focus**: Clean, distraction-free interfaces that let the work shine
- **Premium Quality**: Every detail polished to perfection
- **Strategic Intelligence**: Design that communicates expertise and insight

---

## Brand Identity

### Typography

**Primary Font: Montserrat**
- A geometric sans-serif that balances professionalism with modern approachability
- Clean, confident letterforms that read beautifully at all sizes
- Perfect for both headlines and body text

| Usage | Weight | Size |
|-------|--------|------|
| H1 Headlines | Bold (700) | 48-72px |
| H2 Section Headers | Semibold (600) | 32-48px |
| H3 Card Titles | Semibold (600) | 20-24px |
| Body Text | Regular (400) | 14-16px |
| Labels & Captions | Medium (500) | 12-14px |
| Buttons | Semibold (600) | 14px |

### Color Palette

The palette is predominantly **white** with intentional **navy accents** that convey corporate authority.

#### Primary Colors

| Token | Color | HSL | Usage |
|-------|-------|-----|-------|
| `navy-900` | Dark Navy | `220 60% 12%` | Primary brand, headers, sidebar |
| `navy-800` | Navy | `220 55% 18%` | Secondary backgrounds, cards in dark mode |
| `navy-700` | Medium Navy | `220 50% 25%` | Borders, dividers |
| `navy-600` | Light Navy | `220 45% 35%` | Muted text, icons |
| `navy-100` | Pale Navy | `220 30% 96%` | Light backgrounds, hover states |

#### Accent Colors (Whisps of Intentional Color)

| Token | Color | HSL | Usage |
|-------|-------|-----|-------|
| `accent-blue` | Electric Blue | `210 100% 50%` | CTAs, links, active states |
| `accent-gold` | Corporate Gold | `45 90% 55%` | Premium highlights, success |
| `accent-emerald` | Success Green | `160 70% 40%` | Positive states, confirmations |
| `accent-coral` | Attention Red | `10 80% 60%` | Warnings, destructive actions |

#### Neutrals

| Token | Color | HSL | Usage |
|-------|-------|-----|-------|
| `white` | Pure White | `0 0% 100%` | Primary backgrounds |
| `gray-50` | Off White | `220 20% 98%` | Subtle backgrounds |
| `gray-100` | Light Gray | `220 20% 96%` | Card backgrounds, inputs |
| `gray-200` | Border Gray | `220 15% 90%` | Borders, dividers |
| `gray-500` | Medium Gray | `220 10% 50%` | Muted text |
| `gray-900` | Almost Black | `220 20% 10%` | Primary text |

---

## Component Design Principles

### Buttons

**Design Language**: Solid, confident, with subtle sophistication

```
Primary Button:
- Background: navy-900
- Text: white
- Border-radius: 8px (rounded-lg)
- Padding: 12px 24px
- Shadow: subtle drop shadow
- Hover: lighten to navy-800, slight lift
- Transition: 150ms ease

Secondary Button:
- Background: transparent
- Border: 1px solid navy-700
- Text: navy-900
- Hover: navy-100 background

Ghost Button:
- Background: transparent
- Text: navy-600
- Hover: navy-100 background
```

### Form Inputs

**Design Language**: Clean, minimal, with clear focus states

```
Input Fields:
- Background: white
- Border: 1px solid gray-200
- Border-radius: 8px
- Padding: 12px 16px
- Focus: 2px ring accent-blue, border accent-blue
- Placeholder: gray-500
- Transition: 150ms ease
```

### Cards

**Design Language**: Subtle elevation, clean boundaries

```
Card:
- Background: white
- Border: 1px solid gray-200
- Border-radius: 12px (rounded-xl)
- Shadow: 0 1px 3px rgba(0,0,0,0.05)
- Hover: slight shadow increase, subtle border change
- Padding: 24px
```

### Logo

**Design**: A professional monogram/wordmark combination

The logo should convey:
- **C** and **O** letterforms representing "ConsultantOS"
- Geometric precision reflecting systematic thinking
- Navy primary color for authority
- Clean, reproducible at any size

```
Logo Mark:
- Geometric "C" shape with integrated "O"
- Navy-900 primary color
- Works at 24px minimum
- Optional accent color highlight
```

---

## Layout Principles

### Spacing Scale

Use an 8px base unit for consistency:

| Token | Value |
|-------|-------|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-12` | 48px |
| `space-16` | 64px |

### Container Widths

- Max content width: `1280px`
- Sidebar width: `256px` (16rem)
- Reading width: `720px` (for long-form content)

### Grid System

- 12-column grid for complex layouts
- Gap: 24px default
- Responsive breakpoints: 640px, 768px, 1024px, 1280px

---

## Visual Hierarchy

### Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Default content |
| Dropdown | 10 | Menus, popovers |
| Sticky | 20 | Sticky headers |
| Modal Backdrop | 40 | Overlay backgrounds |
| Modal | 50 | Modal dialogs |
| Toast | 60 | Notifications |

### Shadow Scale

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
```

---

## Animation & Transitions

### Timing Functions

- **Default**: `150ms ease` - Most interactions
- **Entrance**: `200ms ease-out` - Elements appearing
- **Exit**: `150ms ease-in` - Elements disappearing
- **Emphasis**: `300ms ease-in-out` - Attention-grabbing

### Motion Principles

1. **Purposeful**: Every animation serves a function
2. **Subtle**: Motion enhances, never distracts
3. **Consistent**: Same interactions = same animations
4. **Performant**: Use transforms and opacity only

---

## Accessibility

### Color Contrast

- All text meets WCAG 2.1 AA standards (4.5:1 minimum)
- Interactive elements have clear focus states
- Don't rely on color alone to convey information

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--accent-blue);
  outline-offset: 2px;
}
```

### Touch Targets

- Minimum 44x44px for touch interfaces
- Adequate spacing between interactive elements

---

## Dark Mode Considerations

While the primary experience is light (white background), dark mode uses:

- **Background**: navy-900
- **Cards**: navy-800
- **Borders**: navy-700
- **Text**: white/gray-100
- **Accents**: Slightly increased saturation for visibility

The transition between modes should feel seamless and maintain the same visual hierarchy.

---

## Implementation Notes

### CSS Custom Properties

All design tokens are defined as CSS custom properties in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 220 60% 12%;
  --primary: 220 60% 12%;
  --accent: 210 100% 50%;
  /* ... */
}
```

### Tailwind Integration

Tokens are mapped to Tailwind classes via `tailwind.config.ts`:

```typescript
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: "hsl(var(--primary))",
  // ...
}
```

---

## Examples

### Hero Section

- Large, bold Montserrat headline
- Navy text on white background
- Single navy CTA button with subtle shadow
- Generous whitespace (64px+ vertical padding)

### Feature Cards

- White background with subtle gray border
- Navy icon in light gray circular container
- Clean typography hierarchy
- Hover: slight shadow increase, border darkens

### Navigation

- White/transparent background with navy text
- Active state: navy background, white text
- Hover: light navy background
- Clear, readable at all viewport sizes
