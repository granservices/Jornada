---
name: Jornada
description: Operational employee hub with compact enterprise UI, light editorial Jornada surfaces, and precise linear structure.
colors:
  admin-canvas: "#101113"
  admin-canvas-elevated: "#141619"
  admin-shell: "rgba(23, 25, 28, 0.96)"
  admin-surface-1: "rgba(23, 25, 28, 0.94)"
  admin-surface-2: "rgba(32, 35, 39, 0.94)"
  admin-surface-3: "rgba(41, 45, 51, 0.94)"
  admin-panel-active: "rgba(155, 31, 46, 0.2)"
  admin-border: "#343940"
  admin-border-strong: "rgba(182, 75, 86, 0.62)"
  admin-text-primary: "#eceff1"
  admin-text-secondary: "#a3a9b1"
  admin-text-muted: "#69717b"
  admin-accent-bg: "rgba(155, 31, 46, 0.18)"
  admin-accent-border: "rgba(182, 75, 86, 0.46)"
  admin-accent-text: "#f0c3c7"
  admin-warning-bg: "rgba(180, 119, 34, 0.18)"
  admin-warning-border: "rgba(210, 151, 64, 0.34)"
  admin-warning-text: "#f2d3a0"
  admin-danger-bg: "rgba(155, 31, 46, 0.18)"
  admin-danger-border: "rgba(182, 75, 86, 0.42)"
  admin-danger-text: "#f2b8bf"
typography:
  headline:
    fontFamily: "Segoe UI, Roboto, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: "1.25"
    letterSpacing: "0"
  title:
    fontFamily: "Segoe UI, Roboto, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "1.25"
    letterSpacing: "0"
  body:
    fontFamily: "Segoe UI, Roboto, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.55"
    letterSpacing: "0"
  label:
    fontFamily: "Segoe UI, Roboto, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: "0.1em"
rounded:
  control: "4px"
  panel: "6px"
  compact-panel: "5px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.admin-panel-active}"
    textColor: "{colors.admin-text-primary}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.admin-surface-2}"
    textColor: "{colors.admin-text-primary}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  card-surface:
    backgroundColor: "{colors.admin-surface-1}"
    textColor: "{colors.admin-text-primary}"
    rounded: "{rounded.panel}"
    padding: "12px"
  input-compact:
    backgroundColor: "{colors.admin-surface-2}"
    textColor: "{colors.admin-text-primary}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  status-neutral:
    backgroundColor: "{colors.admin-surface-3}"
    textColor: "{colors.admin-text-secondary}"
    rounded: "{rounded.pill}"
    height: "24px"
---

# Design System: Jornada

## Overview

**Creative North Star: "Neo Operational Console"**

Neo is an operational platform, not a marketing SaaS dashboard. The interface should feel like a compact command surface used every day by employees, support teams, and administrators: calm, dense, legible, and precise.

The current app visual world follows the approved `/inbox` direction: light editorial operational surfaces, restrained graphite text, cool gray panels, and sparse wine accents. Light mode is the primary working theme. Dark mode is a real graphite companion theme for lower-light use, implemented through the same central tokens rather than page-local overrides.

**Key Characteristics:**

- Compact enterprise density.
- Light editorial operational surfaces, with an essential graphite dark mode using the same surface, status, button, and text tokens.
- Muted red used as rare operational accent.
- Almost-square panels and controls.
- Straight edges, low blur, low transparency, and no glass-card excess.
- One reusable surface system across Inbox, Atendimentos, Configuracao, Formularios, Perfil, Programacao, and Vencimentos.
- A visible action funnel before equivalent module choices, so users always know the next operational move.
- Tickets Atendimentos uses action-oriented queues: Para assumir, Meus atendimentos, Da equipe, SLA critico and Todos.

## Design Review Protocol

TasteSkill (`https://www.tasteskill.dev/docs`) is an external reference for design judgment, not a runtime dependency. Use it as a critique checklist alongside Impeccable:

- Read the brief and user intent before changing layout.
- Audit the existing surface before redesigning it.
- Preserve URL structure, navigation labels, and form field names unless a product decision says otherwise.
- Reject generic generated patterns that make every action look equally important.
- Keep one page theme, one shape system, and one accent discipline per surface.
- Run a hard pre-flight before shipping: the next action must be findable within seconds, copy must name the action, and empty/loading/error states must guide recovery.

## Colors

The palette is graphite, cool gray, and wine red. It avoids bright SaaS blues and avoids per-page accent colors.

### Primary

- **Gran Wine Accent**: Used for active navigation, selected filters, publish/update feedback, and priority emphasis. It should remain sparse.
- **Gran Wine Strong Border**: Used for focus, selected state borders, and primary action structure.

### Secondary

- **Aged Amber Warning**: Used only for warning/status chips. It should be muted, not golden or playful.
- **Wine Danger**: Used for destructive/error states. It stays in the same wine family instead of introducing a separate bright red system.

### Neutral

- **Deep Space Canvas**: The fixed app canvas behind the shell.
- **Graphite Shell**: Sidebar, header, and app frame.
- **Surface 1**: Top-level cards, panels, page toolbars, and list containers.
- **Surface 2**: Controls, list rows, nested groups, inputs, and hover surfaces.
- **Surface 3**: Small badges, neutral chips, and tertiary nested elements.
- **Primary Text**: High-contrast content and page titles.
- **Secondary Text**: Supporting copy and row metadata.
- **Muted Text**: Hints, labels, timestamps, and quiet counters.
- **Light Mode Surface**: Light mode is a muted lunar gray system, not a pure-white theme. Shells and cards must avoid `#fff`/near-white fills so the app stays comfortable for long operational sessions.
- **Dark Mode Surface**: Dark mode is graphite, not decorative black. Canvas, shell, cards, inputs, buttons, focus, and status chips must all switch through `--admin-*` and `--status-*` tokens with readable foregrounds.

### Named Rules

**The No Rogue Blue Rule.** Do not introduce blue badges, links, buttons, or row highlights in the admin shell unless a future brand decision creates a blue token.

**The Surface Level Rule.** Elements at the same visual level use the same surface token across every page.

**The Accent Scarcity Rule.** Wine red marks state or priority. It is not a general fill color for decorative blocks.

## Typography

**Display Font:** Segoe UI with system sans fallbacks.
**Body Font:** Segoe UI with system sans fallbacks.
**Label/Mono Font:** No separate mono face in the current system.

**Character:** The type is system-native, compact, and operational. It should read like an enterprise tool, not a landing page.

### Hierarchy

- **Headline** (600, 1.05rem, 1.25): App header page names only.
- **Title** (600, 12.5px to 13px, 1.25): Card titles, row titles, panel titles.
- **Body** (400, 12px, 1.55): Row details, helper text, descriptions, and dense readable copy.
- **Label** (600, 9px to 10px, 0.08em to 0.12em uppercase): Field labels, table headers, section metadata.

### Named Rules

**The Compact Copy Rule.** App surfaces should prefer short labels and row-first content over explanatory paragraphs.

**The Heading Restraint Rule.** No hero-scale type inside the app shell. Content density wins.

## Layout

The app shell is mobile-first but enterprise-dense on desktop. Desktop uses a fixed-height shell with internal scrolling in content panels, a compact header, and a collapsible sidebar. Mobile uses bottom navigation and keeps actions close to the current task.

Spacing is tight: repeated lists use 8px rhythm, compact toolbars use 8px gaps, page-level sections use 8px to 12px gaps, and controls generally use 32px height. The content area must adapt to sidebar width dynamically and should avoid wide empty gutters.

Administrative pages should favor table/list structure over floating card grids. Creation, listing, and detail flows should be split when combining them would reduce clarity.

Support detail screens follow a helpdesk conversation pattern. The message thread is the primary work area, especially on mobile. Requester, area, topic, attendant, field values, ratings, and operational actions are secondary context: show them in a side panel on desktop and behind a compact details disclosure on mobile.

## Elevation & Depth

Depth is a hybrid of tonal layering and restrained shadows. The app should not look like glassmorphism. Backdrop blur exists only to bind panels to the space scene; it must stay subtle.

### Shadow Vocabulary

- **Admin Shadow** (`0 16px 34px -28px rgba(0, 0, 0, 0.86)`): Shell, header, cards, and active filters in dark mode.
- **Light Admin Shadow** (`0 14px 30px -26px rgba(16, 17, 19, 0.32)`): Same purpose in light mode.

### Named Rules

**The Solid Panel Rule.** A working panel must be readable without relying on the background image. If the planets compete with text, the panel is too transparent.

**The Background Is Secondary Rule.** Fine grids and quiet horizon shading may sit behind the app, but they must never become the primary information layer.

**The Low-Glare Light Rule.** Light mode uses cool gray surfaces with controlled brightness. It should feel like an enterprise console in daylight, not a blank document.

## Shapes

Jornada uses almost-square enterprise geometry. Main panels use 6px radius, inner controls use 4px, compact nested panels can use 5px, and full pills are reserved for small status chips only.

Borders are one pixel and functional. Avoid large rounded cards, nested decorative cards, and pill-shaped controls with long text.

## Components

### Buttons

- **Shape:** Almost-square controls (4px to 6px radius).
- **Primary:** Wine active background, strong border, primary text, 32px compact height where possible.
- **Secondary:** Surface 2 background, regular border, primary text.
- **Ghost:** Transparent by default, border and surface appear on hover.
- **Hover / Focus:** Shift through existing admin tokens only. Focus uses the admin strong border/focus ring.

### Chips

- **Style:** Small, dense, and semantic.
- **Neutral:** Surface 3, secondary text.
- **Warning:** Muted amber tokens.
- **Critical:** Wine danger tokens.
- **State:** Chips do not carry large amounts of text; truncate when needed.

### Cards / Containers

- **Corner Style:** Panel radius 6px.
- **Background:** Surface 1 for top-level containers.
- **Nested Background:** Surface 2 for row groups, inputs, and secondary panels.
- **Border:** Admin border only.
- **Internal Padding:** 8px to 12px for dense admin surfaces; 16px only when a screen needs breathing room.

### Application Catalog

- **Structure:** The module portal uses React Aria `GridList`, with one actionable item per authorized application.
- **Hero boundary:** `/aplicativos` is the only logged-in surface allowed to use the offshore hero image. The first card row must overlap the hero/content boundary so the page reads as one portal, not a hero followed by an unrelated grid.
- **Density:** The portal must work at 100% browser zoom. Hero type, filters, cards, help strip, and footer stay compact enough for the main module choices to appear in the first viewport on common laptop/desktop heights.
- **Media:** Each item may use its transparent PNG application illustration as secondary context, fitted without cropping and kept behind the text hierarchy. Media never covers titles, descriptions, or the action row.
- **Identification:** Icons use the shared color discipline: Jornada in wine, QuickForms in muted amber, Tickets/Neo in graphite. Avoid green, blue, or per-app decorative palettes unless the design system is explicitly revised.
- **Surface:** Catalog cards are light operational panels using `--admin-surface-*`, `--admin-border`, 6px radius, and restrained shadow. Do not return to dark translucent text bases or glass cards.
- **Hover:** Hover can lift the card slightly, strengthen the wine border, and move the arrow; it should not enlarge the layout or obscure neighboring items.
- **Interaction:** The whole item is the action surface. Keyboard focus, hover, press, disabled, and external SSO loading states are expressed on the item rather than through a nested button or link.
- **Findability:** A compact search field and compact category filters use the same control geometry as `/inbox`. Destination details are implied by the module card and action label unless the route is external.

### Application Catalog Administration

- **Structure:** `/administracao/aplicativos` is a compact list-and-editor surface, never a card grid. The selected row and edit form remain adjacent on wide screens and stack on small screens.
- **Controls:** Creation, edit, active status, route type, order, and image preview use compact tokenized controls. The application code stays visible but disabled during editing because it is the stable access identifier.

### Inputs / Fields

- **Style:** Surface 2 background, admin border, 4px radius, 32px compact height for filters/search.
- **Focus:** Strong border and subtle active background.
- **Placeholder:** Muted text.
- **Error:** Danger text token; do not use raw bright red classes.

### Navigation

The desktop sidebar is a large vertical card detached from screen edges. It can collapse to icons, expand on hover, and be locked open/closed. Active navigation uses wine active background, admin border, and primary text.

Mobile navigation is bottom-fixed, compact, and tokenized. Active mobile items must not turn white or blue.

### Formily Designer

The Formily/AntD editor is intentionally isolated under `.jornada-formily-designer`. It may keep the official Designable layout and AntD internals, but its global CSS must not leak into the Jornada admin shell.

## Do's and Don'ts

### Do:

- **Do** use `SectionCard` for top-level app cards and panels.
- **Do** use `--admin-surface-1`, `--admin-surface-2`, and `--admin-surface-3` by visual level.
- **Do** keep controls compact and aligned like rows/tables.
- **Do** use React Aria Components for accessible behavior where we own the visual component.
- **Do** isolate AntD/Formily inside the designer route.
- **Do** validate dark and light mode whenever a new surface token is added.

### Don't:

- **Don't** create page-local `rgba()` surfaces when an admin surface token already exists.
- **Don't** use pure white shells, cards, lists, or page backgrounds in the admin app.
- **Don't** use blue links, badges, row highlights, or buttons in the admin shell.
- **Don't** use large rounded SaaS cards for operational pages.
- **Don't** use nested decorative cards.
- **Don't** make the background more important than the content.
- **Don't** rely on frontend menu hiding as permission control.
