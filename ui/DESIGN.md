---
name: ReedShield
description: A light, premium enterprise security console — warm off-white grounds, crisp white cards, restrained borders, a controlled violet brand accent, and a clear green/amber/orange/red security-status scale.
colors:
  bg: "#FAFAF9"
  surface: "#FFFFFF"
  surface-subtle: "#F5F5F4"
  border: "#E7E5E4"
  border-strong: "#D6D3D1"
  text: "#1C1917"
  text-secondary: "#57534E"
  text-muted: "#78716C"
  brand: "#7C3AED"
  brand-strong: "#6D28D9"
  brand-wash: "#F5F3FF"
  status-low: "#16A34A"
  status-medium: "#D97706"
  status-high: "#EA580C"
  status-critical: "#DC2626"
  status-info: "#0891B2"
typography:
  display:
    fontFamily: "Inter, Archivo, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, Archivo, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  subtitle:
    fontFamily: "Inter, Archivo, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Inter, Archivo, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  body-lg:
    fontFamily: "Inter, Archivo, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  title:
    fontFamily: "Inter, Archivo, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter, Archivo, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, Archivo, Segoe UI, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
  mono:
    fontFamily: "Fragment Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "4px"
  DEFAULT: "6px"
  md: "6px"
  lg: "8px"
  xl: "10px"
  "2xl": "12px"
  "3xl": "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "24px"
  page: "24px"
shadow:
  xs: "0 1px 2px rgba(28,25,23,0.04)"
  sm: "0 1px 2px rgba(28,25,23,0.05), 0 1px 3px rgba(28,25,23,0.05)"
  md: "0 4px 12px rgba(28,25,23,0.08)"
  lg: "0 8px 28px rgba(28,25,23,0.10)"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.brand-strong}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
    border: "1px solid {colors.border-strong}"
  button-destructive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.status-critical}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "20px"
    border: "1px solid {colors.border}"
    shadow: "{shadow.xs}"
  card-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    padding: "16px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "40px"
    border: "1px solid {colors.border-strong}"
  nav-item-active:
    backgroundColor: "{colors.brand-wash}"
    textColor: "{colors.brand-strong}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  badge:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: ReedShield

## Overview

**Creative North Star: "Light Premium Enterprise Security."**

ReedShield is an AI Security Posture Management console for people under time pressure: an analyst triaging alerts, a Data Protection Officer with a breach clock running, an auditor who must produce evidence tomorrow. The interface earns their trust through clarity and restraint, in the register that serious security products live in today. The reference points are Wiz-level information clarity, Linear-level interface polish, and Stripe-level cleanliness: a warm off-white ground, crisp white cards, hairline borders, disciplined type, and a single controlled brand accent.

Density is high and deliberate. Tables are compact and scannable; the summary of a page is a row of quiet metric cards, not oversized hero numbers. Emphasis comes from weight, size, and the security-status colors, never from glow, heavy gradient, or blur. Corners are gently rounded. The single brand accent, a controlled violet, marks primary actions, selection, and active navigation; it never merely decorates.

This system is a clean replacement of the previous "auditor's working-papers" world (ledger-green paper, hairline rulings, tick-mark and stamp identity, square corners). That world and its palette are the anti-reference and are not to be reintroduced, nor is the generic default look (bright `#2563eb` blue on stark white with heavy floating cards), nor a dark "SOC console" with neon accents.

**Key Characteristics:**
- Warm off-white page ground (`#FAFAF9`) with crisp white cards; borders and light shadow do the work of separation.
- Inter for all UI text (Archivo as the loaded fallback face), Fragment Mono for identifiers, timestamps, and hashes; tabular figures in tables.
- Security status uses a fixed green/amber/orange/red scale (Low/Medium/High/Critical) plus info cyan, always paired with a label or accessible name; color is never the only signal.
- A controlled violet brand accent for primary actions, selection, and active navigation.
- The marketing surface and the product console share this brand, type, and color system but stay visually distinct: marketing is spacious and expressive, the console is dense and utilitarian.

## Colors

A warm-neutral stone palette, one brand accent, and a five-step security-status scale.

### Brand
- **Brand Violet** (#7C3AED): primary buttons, the selected/active row wash (via #F5F3FF), active navigation, focus rings, and brand marks. Deepens to #6D28D9 on hover and press. Used on well under 10% of any screen.

### Neutral (warm "stone")
- **Page** (#FAFAF9): the app and marketing ground.
- **Surface** (#FFFFFF): cards, tables, inputs, the sidebar, the top bar. This is the system "white"; the Tailwind `white` token is true white and `paper.sheet` is the surface.
- **Surface Subtle** (#F5F5F4): table header rows, hover rows, badges, inset wells.
- **Border** (#E7E5E4) and **Border Strong** (#D6D3D1): hairline separators between rows and cards, and input borders.
- **Text** (#1C1917), **Text Secondary** (#57534E), **Text Muted** (#78716C): three text weights; muted holds ~4.6:1 on white and is the floor for small text.

### Security status (fixed meanings)
- **Low** (#16A34A, green): low severity, pass, healthy, on-track.
- **Medium** (#D97706, amber): medium severity, warning, review needed.
- **High** (#EA580C, orange): high severity.
- **Critical** (#DC2626, red): critical severity, fail, overdue, destructive.
- **Info** (#0891B2, cyan): informational or neutral notices; occasional accent.

### Named Rules
**The One Accent Rule.** Violet is the only brand accent. Severity and health are expressed with the status scale, and each status color means exactly one thing across the console.
**The Labeled Status Rule.** A status dot, pill, or bar ships with a label or an accessible name. No status is color-only.

## Typography

**UI Font:** Inter (with Archivo, Segoe UI, Helvetica Neue, Arial fallback), loaded from Google Fonts. Archivo remains available as a loaded face for display contexts.
**Mono Font:** Fragment Mono (with ui-monospace fallback) for identifiers, dates, timestamps, hashes, and code-like references.

**Character:** one clean grotesque, set tight, with weight and size carrying hierarchy. The mono is for data that people compare or copy, never as a "technical" costume for prose.

### Hierarchy
- **Display** (600, up to 40px on marketing / ~clamp, tracking -0.03em): marketing and page hero headings.
- **Headline** (600, 22px, tracking -0.02em): page titles (`h1`) in the console header and section headings.
- **Title** (600, 15px): card and panel titles.
- **Body** (400, 14px, line-height 1.5): table cells, descriptions, notes; prose blocks cap around 62–68ch.
- **Label** (600, 11px, tracking 0.06em, uppercase): column headings and small section labels; used sparingly.
- **Mono** (400, 12.5px): references, ids, dates, timestamps.

### Named Rules
**The Tabular Figures Rule.** `font-variant-numeric: tabular-nums` is set for tables; every number aligns.

## Layout

The console: a 256px sidebar (collapsible to a rail, and tuckable entirely with a pull handle and Ctrl+B) on white with a right border, a light top bar, and a page column capped at 1440px with 24px side padding and 20–24px vertical rhythm between cards. Pages open with a header (title, optional meta, actions) closed by a 1px bottom border, then a row of summary metric cards, then a responsive grid of cards and tables.

The marketing site: a centered 1200px column, a sticky translucent header with the brand at the left and Sign in plus a Get Started button at the top right, generous section spacing, and full-width alternating bands (white and off-white) to separate sections. Tables and wide content scroll inside their own container; the page body never scrolls horizontally.

## Elevation & Depth

Light and calm. Depth comes from the surface/ground contrast (white cards on off-white), hairline borders, and restrained shadows. Cards rest on `shadow-xs`; they may lift to `shadow-md` on hover where interactive. Menus, popovers, and modals use `shadow-lg`. Nothing uses heavy or colored glows.

### Named Rules
**The Restrained Shadow Rule.** Separation is border-first, shadow-second. Do not stack large blurred shadows or use colored shadows; reserve the larger shadows for genuinely floating overlays.

## Shapes

Gently rounded. Cards, inputs, and buttons use 8px (`rounded-lg`); larger surfaces and hero cards use 10–16px; pills and avatars use `rounded-full`; small chips use 4–6px. Status dots are filled circles. The Tailwind radius scale runs 4px→16px plus full.

## Components

### Buttons
- **Shape:** 8px radius, 40px tall (36px small), ~14.5px 600 weight, 16px side padding.
- **Primary:** brand violet on white text; hover #6D28D9; focus ring 2px violet with 2px offset.
- **Outline:** white surface, ink text, 1px border-strong; hover surface-subtle.
- **Ghost:** transparent, ink text, hover surface-subtle.
- **Destructive:** critical-red outline and text at rest; fills red with white text on hover or focus; isolated with empty space so it cannot be hit by accident.
- **Loading:** a 14px current-color spinner precedes the label; `aria-busy`.

### Status indicators (`components/paper/TickMark`)
- **Kinds:** severity `low`/`medium`/`high`/`critical` plus `pass`/`warn`/`fail`/`na`/`info`.
- **Form:** a filled status dot with an optional label; `text-status-*` / `bg-status-*` tokens carry the fixed meanings.
- **Label:** the word prints beside the dot; without it the element carries an accessible name.

### Status pills (`components/paper/Stamp`, `components/ui/Badge`)
- **Style:** a flat rounded-full pill, 1px border, subtle tinted background (via color-mix), 11–12px medium/semibold text, no rotation.
- **Uses:** factual states such as ENFORCED, DEMO DATA, ACTIVE, OPEN, IN PROGRESS, and severity/health labels.

### Cards (`components/paper/Sheet`, `components/ui/Card`)
- **Corner Style:** 8px (`rounded-lg`).
- **Background:** white surface; header is part of the card, not a tinted band.
- **Header:** 15px 600 title, 13px muted subtitle, optional action slot.
- **Border:** 1px border (#E7E5E4). Shadow `xs`.
- **Internal Padding:** ~20px.

### Tables (`components/paper/Ledger`)
- **Head:** surface-subtle row, 11px uppercase muted labels, 1px border below.
- **Cells:** 14px ink, compact vertical padding, row separators on #F5F5F4, mono for id columns, right-aligned tabular numerals.
- **States:** hover and keyboard focus on surface-subtle; selected/expanded row on brand-wash (#F5F3FF); an expanded row renders a detail block full-width beneath it; empty state is a centered muted sentence.
- **No vertical column rulings.**

### Metric cards (`components/paper/LedgerLine`)
- **The summary row:** a grid of metric cards, each with an 11–12px label, a ~30px figure, an optional movement line in a status color, and a note.

### Inputs / Fields
- **Style:** white surface, 1px border-strong, 8px radius, 40px tall, 14px ink text; selects and text inputs share it.
- **Focus:** 2px violet ring; caret and selection are violet.
- **Checkbox:** native control with `accent-color` violet.

### Navigation
- **Sidebar:** white with a right border; plain uppercase group labels (MONITOR, DISCOVER, PROTECT, ADMIN); items ~36px tall; the active item sits on brand-wash with brand-strong text and a violet left indicator; collapsed mode shows icons with tooltips; a Tuck away control and Ctrl+B hide it entirely.
- **Top bar:** white, 1px border below; breadcrumbs, search, period select, notifications, help, account avatar (rounded-full, brand).
- **Sub-navigation** (DPDPA): a tab row under the page header with a 2px brand underline on the active tab.

### Marketing
- **Header:** sticky, translucent, brand at left, nav center, Sign in + Get Started (violet) at top right.
- **Hero:** eyebrow label, large display headline (single `h1`), supporting paragraph, primary + secondary CTA, and a product-as-proof console preview.
- **Sections:** capability grid, numbered product story, risk prioritization, compliance frameworks, enterprise readiness, final CTA, and a 6-column footer.

### Login / Get Started
- **Login (`LoginPage`):** split panel — left brand message with an abstract asset-graph visual; right card with "Welcome back", Sign in, and Continue with SSO. No password fields in the SPA; Keycloak performs authentication.
- **Keycloak theme (`auth/keycloak-theme/reedshield`):** the hosted credential page is re-skinned with this palette (white card, violet Sign in button, ReedShield logo). Templates and all auth handling are inherited from the stock theme.
- **Signed out (`SignedOut`):** "You're securely signed out." with Return to ReedShield.
- **Get Started (`marketing/GetStarted`):** left journey (connect cloud/AI/code, numbered steps); right account panel that hands off to Keycloak.

## Do's and Don'ts

### Do:
- **Do** put content on white cards over the warm off-white ground, separated by 1px borders and light shadow.
- **Do** keep the status scale meanings fixed: green low, amber medium, orange high, red critical, cyan info.
- **Do** pair every status color with a label or accessible name.
- **Do** keep the violet accent to primary actions, selection, and active navigation.
- **Do** stamp DEMO DATA on any surface whose figures are synthetic.
- **Do** keep numerals tabular and right-aligned in tables; keep tables compact.

### Don't:
- **Don't** reintroduce the working-papers world: ledger-green grounds, hairline column rulings, tick-mark/stamp identity, square corners, or the old tab colors.
- **Don't** reintroduce the generic default look (bright #2563eb blue, stark white, heavy floating cards) or a dark neon SOC theme.
- **Don't** stack heavy or colored shadows, or lean on gradients and glass.
- **Don't** use color alone for status, or use a status color for decoration.
- **Don't** use monospace for prose or buttons; it belongs to identifiers, dates, and hashes.
- **Don't** let the marketing and console surfaces drift apart on brand, type, or color even as their density differs.
