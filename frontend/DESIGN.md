---
name: LexIntelligence Executive
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#009eb9'
  on-tertiary-container: '#002f38'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-desktop: 40px
  container-padding-mobile: 20px
  card-gap: 24px
  section-margin: 64px
---

## Brand & Style

The design system projects a persona of high-performance intelligence: authoritative, precise, and technologically advanced. It is tailored for legal professionals who require the reliability of an enterprise tool but the speed and cognitive clarity of next-generation AI.

The aesthetic fuses **Modern Corporate** reliability with a highly refined **Glassmorphism** style. It leverages high-energy light accents—Indigo, Violet, and Cyan—to represent the "electrical" nature of AI processing. The result is a UI that feels deep, layered, and premium, using light not just for visibility, but to guide the user's focus toward critical insights within a dense information landscape.

## Colors

The palette is anchored in a deep, midnight navy (`#0F172A`) to establish a professional foundation. Energy is injected through three high-vibrancy pillars: **Indigo** (Action), **Violet** (Logic), and **Cyan** (Precision).

Surface colors utilize a tiered dark-mode approach. Backgrounds are pure neutrals, while interactive containers use semi-transparent overlays. To enhance the "AI-driven" feel, background glows are placed strategically behind primary modules, using the `glow-indigo` and `glow-cyan` radial gradients to create a sense of depth and luminescence without sacrificing readability.

## Typography

This design system employs a dual-typeface system to balance impact and utility. **Manrope** is used for headlines to provide a confident, geometric structure with high legibility at large scales. Bold weights and tight letter-spacing are prioritized for Display levels to create a clear hierarchy.

**Hanken Grotesk** serves as the primary engine for body text and labels. Its slightly wider apertures and contemporary proportions ensure that long-form legal documents remain readable even on luminous dark backgrounds. Line heights have been intentionally increased to provide breathing room within content-heavy interfaces.

## Layout & Spacing

The layout follows a **Fluid Grid** model with an emphasis on "Luxurious Padding." Rather than cramming data, the system uses generous whitespace to reduce cognitive load. 

A 12-column system is used for desktop (1440px+), with 24px gutters. For cards and primary containers, internal padding is scaled up to 32px or 40px to create a more "premium" and spacious feel. Spacing should always be a multiple of the 8px unit, ensuring a consistent rhythmic scale across all viewports.

## Elevation & Depth

Depth is achieved through **High-Contrast Glassmorphism**. Elements do not simply sit on the background; they float within a layered environment.

1.  **Backdrop Blur:** A consistent `20px` to `32px` blur is applied to all glass panels to ensure background noise does not interfere with content.
2.  **Contrast Borders:** Every card and modal features a `1px` solid border. These borders use a linear gradient (Top-Left: `rgba(255,255,255,0.2)` to Bottom-Right: `rgba(255,255,255,0.05)`) to simulate a "razor-sharp" edge catching light.
3.  **Tonal Glows:** Instead of traditional black shadows, elevated elements use a soft, primary-tinted outer glow (`rgba(99, 102, 241, 0.1)`) to signify active state or importance.

## Shapes

The design system utilizes **Rounded** geometry (`0.5rem` base) to soften the analytical nature of legal tech. 

- **Cards & Modals:** Use `rounded-xl` (1.5rem) to create a modern, framed appearance.
- **Buttons & Inputs:** Use `rounded-lg` (1rem) to provide a distinct, tactile feel.
- **Indicators:** Small badges and chips use a "Pill" shape for maximum differentiation from structural elements.

## Components

### Cards
Cards are the primary container. They must feature a `32px` internal padding and a background of `rgba(30, 41, 59, 0.7)`. The high-contrast border and 24px backdrop blur are mandatory to maintain the premium glass effect.

### Buttons
Primary buttons utilize the `action` gradient with white text for maximum pop. Secondary buttons use a "ghost" style: a transparent background with the high-contrast 1px border. Hover states should trigger an increase in the intensity of the button's outer glow.

### Input Fields
Inputs are styled as "dark-wells." A subtle inset shadow gives them a recessed look, while the focus state uses a vibrant Cyan border and a soft glow to signal readiness.

### Insight Chips
Small, informational tags that use the `insight` gradient at low opacity (15%) with a high-saturation text color. These are used to categorize legal data types or AI-confidence levels.

### Lists
List items should be separated by high-transparency dividers (`rgba(255, 255, 255, 0.05)`). Each item requires a `16px` vertical padding to maintain the spacious aesthetic.