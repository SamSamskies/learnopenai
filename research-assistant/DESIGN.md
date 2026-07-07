---
name: Scholarly Precision
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#40484b'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#70787c'
  outline-variant: '#c0c8cb'
  surface-tint: '#306576'
  primary: '#003441'
  on-primary: '#ffffff'
  primary-container: '#0f4c5c'
  on-primary-container: '#87bbce'
  inverse-primary: '#9acee1'
  secondary: '#545f72'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f7'
  on-secondary-container: '#586377'
  tertiary: '#482700'
  on-tertiary: '#ffffff'
  tertiary-container: '#623d13'
  on-tertiary-container: '#dda975'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b6ebfe'
  primary-fixed-dim: '#9acee1'
  on-primary-fixed: '#001f28'
  on-primary-fixed-variant: '#114d5d'
  secondary-fixed: '#d8e3fa'
  secondary-fixed-dim: '#bcc7dd'
  on-secondary-fixed: '#111c2c'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#f3bc87'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#643e14'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1120px
  gutter: 24px
---

## Brand & Style

This design system is built for high-stakes intellectual work. It moves away from the frantic, glowing aesthetics of general-purpose AI and toward the quiet authority of a modern research library. The personality is academic yet technologically advanced—expert, focused, and profoundly calm.

The design style is **Minimalism** blended with **Editorial** sensibilities. It prioritizes content clarity through generous whitespace, high-quality typography, and a "sharp brief" aesthetic. Visual noise is aggressively reduced to minimize cognitive load, ensuring that the AI’s insights remain the focal point. Interface elements are treated as subtle containers for information rather than decorative objects.

## Colors

The palette rejects "tech-vibrant" trends in favor of a sophisticated, low-fatigue environment. 

- **Primary Action:** A deep, intellectual Teal (`#0F4C5C`) is used exclusively for primary calls-to-action and critical interactive states. 
- **Neutrals:** A range of Slate and Charcoal grays provide the structural framework. The background is a crisp white, while secondary surfaces use a soft off-white to create subtle contrast.
- **Accents:** Semantic colors (success, error) should be desaturated to maintain the professional tone. 
- **Borders:** Instead of shadows, use a consistent 1px stroke in a light cool gray to define boundaries.

## Typography

The typographic system creates an "Editorial-Tech" hybrid. 

**Source Serif 4** is used for headlines, long-form reading, and citations to evoke the feeling of a published journal or research brief. Its sturdy terminals ensure legibility at various weights.

**Geist** is used for the UI layer, navigation, and data entry. Its monospaced-influenced DNA provides the precision required for a technical tool while maintaining a clean, modern aesthetic. 

- Use tight tracking on serif displays and slightly open tracking on sans-serif labels.
- Paragraphs should maintain a line height of 1.5x–1.6x for optimal reading of dense research data.

## Layout & Spacing

The layout utilizes a **Fixed Grid** for content consumption to ensure line lengths remain readable (ideally between 60-80 characters for research text). 

- **Desktop:** 12-column grid centered in a 1120px container. Margins are generous (64px+) to create a "canvas" feel.
- **Tablet:** 8-column grid with 32px margins.
- **Mobile:** 4-column grid with 16px margins.

Spacing follows a strict 4px/8px baseline shift. Use larger gaps (`lg` and `xl`) between distinct research sections to signal a change in topic or data source.

## Elevation & Depth

This design system avoids traditional drop shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Background):** Pure white or `#F8F9FA`.
- **Level 1 (Cards/Sidebar):** Defined by a 1px border (`#E2E8F0`). No shadow.
- **Level 2 (Modals/Popovers):** A very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)) is permitted only when elements must float over the main workspace.

Depth is primarily communicated through color shifts (stepping from white to light gray) rather than physical displacement.

## Shapes

Shapes are balanced between "precision" and "approachability." 

Standard components like cards and input containers use a **Rounded** (0.5rem) corner radius. This softens the rigid grid without feeling overly "bubbly" or consumer-grade. Buttons and tags use the same radius to maintain a cohesive language across the tool.

## Components

### Buttons & Chips
Buttons use solid fills for primary actions (Deep Teal) and ghost styles (1px border) for secondary actions. Chips/Tags for research categories should be rectangular with the standard 0.5rem radius and use subtle slate backgrounds with charcoal text.

### The Composer
The bottom input bar is the focal point. It is a large, rounded container with an auto-growing textarea. It uses a subtle 1px border that darkens on focus. Icons inside the composer (e.g., "Attach Paper," "Run Analysis") are simple 20px strokes.

### Research Cards
Cards house AI-generated summaries and source citations. They should feature a thin border, no shadow, and internal padding of `md` (24px). The header of the card uses the serif typeface for the title.

### Input Fields
Fields are clean and minimal. Use "Geist" for input text. Labels are placed above the field in `label-sm` (uppercase) to differentiate them from user data.

### Citations
Citations are treated as high-priority sub-components. They should appear as small, subtle badges with a monospaced feel, allowing the user to hover for a quick preview of the source text.