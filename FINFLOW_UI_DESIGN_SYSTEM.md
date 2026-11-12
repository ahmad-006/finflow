# FinFlow UI Design System and Screen Specification

**Product:** FinFlow, business cash flow intelligence and invoicing for SMEs
**Audience of this file:** autonomous coding agents (Antigravity, Jules, Copilot agents) and the developer reviewing their output
**Direction:** light theme only, premium, classic, minimal
**Status:** binding. Where this file and any earlier UI text disagree, this file wins.

---

## 0. How an agent must use this file

1. Read this file completely before writing any UI code. Read `AGENTS.md` and the master plan as usual.
2. This file supersedes two earlier statements:
   - The Phase 0 DoD item "dark mode support" is **removed**. FinFlow ships light only. Do not install `next-themes`, do not write `dark:` classes.
   - The README and plan use emoji (for example the wave in the title). Emoji never appear inside the product UI.
3. **Phase lock still applies.** UI work is split by phase so it does not violate `AGENTS.md` Rule 1:
   - **Phase 0** builds: tokens (Section 3), fonts, shadcn primitive overrides (Section 7), the app shell (Section 6), the state components (Section 10), and a `/dev/ui` kit page that is excluded from production builds.
   - **Phases 1 to 7** build only their own routes (Section 12), using the page templates and primitives from Phase 0. They add no new visual patterns. If a screen needs a pattern that does not exist, add it to the kit page first, then use it.
4. Never invent a color, font size, radius, shadow, or spacing value. Use tokens only. If a token is missing, stop and ask.
5. Run the automated checks in Section 2.3 and the acceptance checklist in Section 18 before marking any phase complete.

---

## 1. Design intent

### 1.1 One sentence

A private banking statement that happens to be interactive: calm, exact, and unhurried.

### 1.2 Principles

1. **Numbers are the product.** Money figures get the best typography, alignment, and whitespace on every screen. Everything else is quiet.
2. **Structure carries information.** A border, divider, or label exists only because it tells the reader something (a group boundary, a total, a column). Never decorative.
3. **One memorable element per screen.** On Overview it is the liquid cash figure and the forecast curve. On an invoice it is the total. Everything else stays restrained.
4. **Same pattern, same place.** Page title, primary action, filters, table, pagination, and empty state sit in the same position on every list screen. People learn the app once.
5. **Density is calm, not cramped.** Generous outer margins, tight and consistent inner rhythm. Tables are comfortable, not airy.
6. **Honest states.** Empty, loading, error, and overdue states are designed with the same care as the happy path.
7. **No decoration without a job.** If removing an element changes nothing about comprehension, remove it.

### 1.3 Where the boldness goes

Spend visual weight in exactly two places: the serif page title and large money figures, and the forecast chart. All other surfaces use the same neutral treatment.

### 1.4 Visual summary

| Axis | Decision |
| :--- | :--- |
| Background | Cool, near-white canvas with pure white working surfaces |
| Ink | Deep navy-black, not pure black and not warm brown |
| Accent | One: Oxford blue. Used for primary actions, links, focus, the forecast line |
| Status colors | Muted and desaturated: green, brick red, ochre. Always paired with a text label |
| Type | Serif for page titles and hero figures only. Humanist sans for everything else |
| Shape | Small, hierarchical radii. Hairline borders instead of shadows |
| Motion | Short, functional, only in response to action or data change |

---

## 2. Anti-slop contract

This is the most important section. These are the visual and writing habits people mock in AI-generated interfaces. Every one is forbidden here.

### 2.1 Forbidden patterns

| # | The tell | Why it reads as AI | Rule in FinFlow |
| :-- | :--- | :--- | :--- |
| 1 | Purple, indigo, or violet to blue gradients | The default "AI startup" look | No gradients anywhere in the UI. Flat fills only |
| 2 | Gradient text, gradient buttons, gradient borders | Same | Forbidden |
| 3 | Glassmorphism, `backdrop-blur`, frosted panels | Overused effect | Forbidden. Surfaces are opaque |
| 4 | Glowing or colored shadows, large soft drop shadows under every card | Template chrome | Only the single `--shadow-pop` on floating layers (menus, dialogs). Panels use a 1px border, no shadow |
| 5 | Everything is a rounded card with one radius | The SaaS-card kit | Radii are hierarchical (Section 3.5). Sections are separated by whitespace and hairlines, not by wrapping everything in boxes |
| 6 | Cards inside cards | Visual noise | One level of container maximum |
| 7 | Pill buttons and fully rounded everything | Template default | Buttons are 6px radius. Full radius only for avatars |
| 8 | Emoji in headings, buttons, empty states, toasts | Instantly recognizable | No emoji anywhere in the UI or copy |
| 9 | Icons inside colored circles above every feature | Generic feature-grid | No icon badges. Icons are bare, 1.5px stroke, and only where they aid scanning |
| 10 | A row of four identical KPI cards, each with icon, number, and a green up-arrow | The classic AI dashboard | Overview uses one "position strip" with unequal emphasis (Section 12.3). No trend arrows unless there is a real comparison period |
| 11 | Hero or auth screen with blobs, orbs, mesh gradients, abstract 3D shapes | Filler imagery | None. Auth screens are plain. No illustrations |
| 12 | Split-screen auth with a gradient art panel | Template | Auth is a single centered column on the canvas (Section 12.1) |
| 13 | Tracked-out ALL-CAPS eyebrow label above every heading | Template chrome | No uppercase labels. No eyebrows. Sentence case everywhere |
| 14 | One word in a headline colored, italic, or bold for emphasis | Common generated headline | Forbidden |
| 15 | Middle-dot strings `A · B · C`, spaced em dashes `Word — fragment`, `→` appended to buttons | Template punctuation | Use separate elements or plain commas. No arrows in button text |
| 16 | Numbered markers `01 / 02 / 03` on non-sequences | Decoration | Numbers appear only for real sequences (invoice numbers, steps in a real wizard) |
| 17 | Monospace font for small labels "to look technical" | Template chrome | No monospace in the UI. Figures use tabular sans |
| 18 | Pure default Inter or Geist on everything, default shadcn look untouched | Reads as unstyled starter | Fonts and component skins in this file are mandatory. Do not ship stock shadcn styling |
| 19 | Default Tailwind blue-500 or indigo-600 as the primary | Reads as unconfigured | Only the tokens in Section 3 |
| 20 | Warm cream background plus serif display plus terracotta accent | The currently over-produced "tasteful AI" look | Canvas is cool, accent is blue. The serif is limited to titles and figures |
| 21 | Fade-and-slide-up entrance animation on every section, hover lift on every card, `hover:scale-105`, bounce, pulse, shimmer on static content | Motion for its own sake | No entrance animations. No hover transforms. Motion rules in Section 16 |
| 22 | Spinners everywhere | Lazy loading state | Skeletons that match the final layout. Spinners only inside a button during submit |
| 23 | Toast for every action | Noise | Toasts only for background results the user cannot see otherwise (Section 10.4) |
| 24 | "Welcome back, Alex! 👋", "Oops!", "Let's get started", "Unleash", "Seamless", "Elevate", "Supercharge", "Powerful insights" | Marketing voice in a tool | Plain, direct copy (Section 11) |
| 25 | Sparkles icon or "AI-powered" badges | Trend chasing | Forecasts are labeled "Forecast". No sparkles |
| 26 | Placeholder data: "John Doe", "Acme Inc.", "Lorem ipsum", round numbers like 10,000 and 99.9% | Obvious mock data | Realistic seed data (Section 11.3) |
| 27 | Rainbow chart palettes, 3D charts, pie charts for time series, charts with no axis labels | Chart junk | Chart rules in Section 8.6 |
| 28 | Low-contrast gray text on white (`text-gray-400`) and placeholder text as the only label | Accessibility failure | Contrast tokens in Section 3.1. Visible labels always |
| 29 | Colored left-border stripe on cards and alerts | Overused callout style | Alerts use a tinted background with a text label, no stripe |
| 30 | Progress bars, rings, or gauges with no meaning | Decoration | Visualize only real quantities with real denominators |
| 31 | Center-aligned everything | Template layout | Left-align content and tables. Center only the auth column and empty-state text |
| 32 | Identical spacing everywhere, no hierarchy | Flat, lifeless | Spacing scale with deliberate grouping (Section 3.4) |
| 33 | Dashboards where every number is up and to the right and green | Fake data tell | Seed data includes overdue, negative, and flat values (Section 11.3) |
| 34 | A badge on everything | Noise | Badges are for invoice status and risk only |
| 35 | Fake testimonials, logo walls, stat strips such as "10k+ users" | Filler | No marketing content inside the app |
| 36 | Dividers between every list item plus a card border plus a shadow | Triple chrome | One separation device per boundary |
| 37 | Tooltips that restate the label | Noise | Tooltips only add information (a date, a rate, a calculation) |

### 2.2 Writing tells

No exclamation marks. No emoji. No "Oops". No apologies in errors. No filler openers ("Please note that", "Simply"). Avoid em dashes in product copy. Use sentence case for every heading, label, and button.

### 2.3 Automated checks (agents must run these)

Add `scripts/ui-lint.mjs` in Phase 0 and run it in `npm run lint` and CI. It fails the build if it finds any of the following in `src/**/*.{ts,tsx,css}`:

| Check | Pattern (regex, case-insensitive) |
| :--- | :--- |
| Gradients | `bg-gradient`, `gradient-to`, `linear-gradient`, `radial-gradient`, `conic-gradient`, `bg-clip-text` |
| Blur and glass | `backdrop-blur`, `backdrop-filter`, `blur-` |
| Heavy shadows | `shadow-(md\|lg\|xl\|2xl\|inner)` (only `shadow-pop` and `shadow-none` allowed) |
| Oversized radii | `rounded-(xl\|2xl\|3xl)`, `rounded-full` outside `Avatar` |
| Motion tells | `animate-(bounce\|ping\|spin\|pulse)` outside `Skeleton` and `ButtonSpinner`, `hover:scale`, `hover:-translate`, `transition-all` |
| Dark mode | `dark:`, `next-themes` |
| Default palette | `(bg\|text\|border)-(slate\|gray\|zinc\|neutral\|stone\|red\|green\|blue\|indigo\|violet\|purple\|emerald\|sky)-[0-9]` |
| Uppercase labels | `uppercase`, `tracking-(wide\|wider\|widest)` |
| Monospace | `font-mono` |
| Emoji | Unicode ranges `U+1F300-1FAFF`, `U+2600-27BF` in any string |
| Forbidden copy | `Oops`, `Welcome back`, `Lorem`, `John Doe`, `Acme`, `Seamless`, `Unleash`, `Supercharge`, `Elevate` |
| Arrow buttons | `→` or `&rarr;` inside button or link text |
| Raw hex in components | `#[0-9a-fA-F]{3,8}` outside `globals.css` and chart theme file |

Also add a Playwright visual test (Section 17.4).

---

## 3. Design tokens

All tokens live in `src/app/globals.css`. Components consume them through Tailwind theme names, never raw values.

### 3.1 Color

| Token | Hex | Use |
| :--- | :--- | :--- |
| `--canvas` | `#F4F5F7` | App background behind content |
| `--surface` | `#FFFFFF` | Panels, tables, inputs, dialogs |
| `--sunken` | `#EDEFF2` | Table header, hover row, disabled field, skeleton base |
| `--line` | `#E2E5EA` | Default hairline borders and dividers |
| `--line-strong` | `#CBD0D8` | Input borders, emphasized dividers |
| `--ink` | `#1B2433` | Primary text, primary figures |
| `--ink-2` | `#475062` | Secondary text, table body labels |
| `--ink-3` | `#5E6779` | Tertiary text, helper text, axis labels. Minimum text token allowed |
| `--brand` | `#1F3A5F` | Primary button, links, focus ring, selected nav, forecast line |
| `--brand-hover` | `#17304F` | Primary hover and pressed |
| `--brand-tint` | `#E8EDF4` | Selected row, active nav background, info alert background |
| `--positive` | `#2F6B4F` | Paid, inflow, healthy |
| `--positive-tint` | `#E7F1EB` | Paid badge background |
| `--negative` | `#A23B2E` | Overdue, outflow, deficit, destructive text |
| `--negative-tint` | `#F6E9E6` | Overdue badge background, error alert |
| `--caution` | `#8A5A12` | Watchlist, due soon, warnings |
| `--caution-tint` | `#F7EEDB` | Caution badge background |
| `--chart-inflow` | `#4C8A6B` | Chart inflow bars |
| `--chart-outflow` | `#B9604F` | Chart outflow bars |

Rules:
- Text on `--canvas` or `--surface` uses `--ink`, `--ink-2`, or `--ink-3` only. Nothing lighter. All three meet 4.5:1 on both backgrounds (verify with axe; adjust if a measured ratio fails).
- Status text on its tint must meet 4.5:1. The pairs above were chosen to do so.
- Color is never the only signal. Every status has a text label.
- Brand blue is the only chromatic accent. Do not add a second.
- Pure black and pure white text are not used. White is used only on `--brand` buttons.

### 3.2 CSS variables and shadcn mapping

```css
@import "tailwindcss";

:root {
  color-scheme: light;

  --canvas: #F4F5F7;
  --surface: #FFFFFF;
  --sunken: #EDEFF2;
  --line: #E2E5EA;
  --line-strong: #CBD0D8;
  --ink: #1B2433;
  --ink-2: #475062;
  --ink-3: #5E6779;
  --brand: #1F3A5F;
  --brand-hover: #17304F;
  --brand-tint: #E8EDF4;
  --positive: #2F6B4F;
  --positive-tint: #E7F1EB;
  --negative: #A23B2E;
  --negative-tint: #F6E9E6;
  --caution: #8A5A12;
  --caution-tint: #F7EEDB;
  --chart-inflow: #4C8A6B;
  --chart-outflow: #B9604F;

  /* shadcn/ui variable mapping */
  --background: var(--canvas);
  --foreground: var(--ink);
  --card: var(--surface);
  --card-foreground: var(--ink);
  --popover: var(--surface);
  --popover-foreground: var(--ink);
  --primary: var(--brand);
  --primary-foreground: #FFFFFF;
  --secondary: var(--surface);
  --secondary-foreground: var(--ink);
  --muted: var(--sunken);
  --muted-foreground: var(--ink-3);
  --accent: var(--sunken);
  --accent-foreground: var(--ink);
  --destructive: var(--negative);
  --border: var(--line);
  --input: var(--line-strong);
  --ring: var(--brand);

  --radius-badge: 3px;
  --radius-control: 6px;
  --radius-panel: 8px;
  --radius-overlay: 12px;

  --shadow-pop: 0 4px 16px rgba(27, 36, 51, 0.10), 0 1px 3px rgba(27, 36, 51, 0.06);

  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-sunken: var(--sunken);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-brand-tint: var(--brand-tint);
  --color-positive: var(--positive);
  --color-positive-tint: var(--positive-tint);
  --color-negative: var(--negative);
  --color-negative-tint: var(--negative-tint);
  --color-caution: var(--caution);
  --color-caution-tint: var(--caution-tint);
  --font-sans: var(--font-plex-sans), system-ui, sans-serif;
  --font-serif: var(--font-source-serif), Georgia, serif;
  --shadow-pop: var(--shadow-pop);
}

html { background: var(--canvas); color: var(--ink); font-family: var(--font-sans); }
body { font-size: 14px; line-height: 20px; font-variant-numeric: lining-nums; -webkit-font-smoothing: antialiased; }
.num { font-variant-numeric: tabular-nums lining-nums; }
```

Remove the `.dark` block that shadcn generates.

### 3.3 Typography

**Fonts** (loaded with `next/font/google`, `display: "swap"`):
- **Source Serif 4**, weights 500 and 600. Used for: page titles (h1), the hero figure on Overview, the invoice total, and the wordmark. Nowhere else.
- **IBM Plex Sans**, weights 400, 500, 600. Used for everything else, including all tables and all money figures outside the hero.

```ts
// src/app/fonts.ts
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"], weight: ["400", "500", "600"],
  variable: "--font-plex-sans", display: "swap",
});
export const sourceSerif = Source_Serif_4({
  subsets: ["latin"], weight: ["500", "600"],
  variable: "--font-source-serif", display: "swap",
});
```

**Scale** (size / line-height, weight):

| Role | Token | Size / line | Weight | Font |
| :--- | :--- | :--- | :--- | :--- |
| Page title (h1) | `text-title` | 28 / 36 | 600 | Serif |
| Hero figure | `text-hero` | 44 / 48 | 500 | Serif, tabular |
| Invoice total | `text-total` | 32 / 40 | 500 | Serif, tabular |
| Section heading (h2) | `text-section` | 18 / 26 | 600 | Sans |
| Subsection (h3) | `text-sub` | 15 / 22 | 600 | Sans |
| Body | `text-body` | 14 / 20 | 400 | Sans |
| Body emphasis | `text-body-strong` | 14 / 20 | 500 | Sans |
| Reading text | `text-read` | 16 / 26 | 400 | Sans (max 68ch) |
| Small | `text-small` | 13 / 18 | 400 | Sans |
| Caption and axis | `text-caption` | 12 / 16 | 400 or 500 | Sans |

Rules:
- Sentence case always. No uppercase transform, no letter-spacing changes.
- Money in tables and tiles uses `.num` (tabular lining figures) and is right-aligned in tables.
- Line length under 75 characters for prose. Table and form text is exempt.
- Headings never carry an eyebrow above them and never use a colored or italic word.
- Minimum text size is 12px, used only for chart axes and table meta.

### 3.4 Spacing

Base unit 4px. Allowed steps: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

| Use | Value |
| :--- | :--- |
| Inline gap between icon and label | 8 |
| Gap between related controls | 8 to 12 |
| Form field vertical gap | 20 |
| Panel inner padding | 24 (16 on mobile) |
| Space between page sections | 32 |
| Page outer padding | 32 desktop, 24 tablet, 16 mobile |
| Page header to content | 24 |

Group related items tightly and separate groups generously. If two gaps in one component are the same but mean different things, one of them is wrong.

### 3.5 Radius, borders, elevation

| Element | Radius | Border | Shadow |
| :--- | :--- | :--- | :--- |
| Badge | 3px | none | none |
| Button, input, select, checkbox | 6px | 1px `--line-strong` (inputs, secondary buttons) | none |
| Panel (table container, chart container, summary block) | 8px | 1px `--line` | none |
| Dialog, sheet, popover, menu | 12px (sheet: 0 on the screen edge, 12px on inner edge) | 1px `--line` | `--shadow-pop` |
| Avatar | full | none | none |

Panels sit on `--canvas` as `--surface` with a hairline. Nothing else is boxed. A page section is usually a heading plus a panel, or just a heading plus content on the canvas.

### 3.6 Z-index

`base 0`, `sticky 10`, `sidebar 20`, `overlay 40`, `dialog 50`, `toast 60`. No other values.

---

## 4. Iconography and imagery

- **Library:** `lucide-react` only. Stroke width 1.5. Sizes 16 (inline, in buttons, in table cells) and 20 (navigation).
- **Color:** inherit text color. Never put an icon inside a colored circle or tile.
- **Use icons for:** navigation items, ambiguous icon-only buttons (always with `aria-label` and a tooltip), sort direction, row actions menu, close, calendar and search affordances.
- **Do not use icons for:** every KPI, every table row, empty states, section headings, decoration.
- **Imagery:** none. No stock photos, illustrations, 3D art, or abstract shapes.
- **Wordmark:** the text "FinFlow" in Source Serif 4, weight 600, 20px, `--ink`. No logo glyph. Favicon: a white serif "F" on a `--brand` rounded square (radius 6 at 32px).
- **Avatars:** initials on `--sunken` with `--ink-2` text, 32px, used only in the user menu.

---

## 5. Tone of the interface (summary)

Direct, specific, calm. Verbs on buttons. Nouns on navigation. Full guidance in Section 11.

---

## 6. Layout system

### 6.1 Screen types

| Type | Width | Navigation | Content max width | Page padding |
| :--- | :--- | :--- | :--- | :--- |
| Mobile | under 768 | Top bar plus left drawer | 100% | 16 |
| Tablet | 768 to 1023 | Collapsed rail (64px, icons plus tooltip) | 100% | 24 |
| Laptop | 1024 to 1279 | Full sidebar (240px) | 100% | 32 |
| Desktop | 1280 to 1599 | Full sidebar (248px) | 1200px, left-aligned in the content area | 32 |
| Wide | 1600 and above | Full sidebar (248px) | 1320px, left-aligned | 40 |

Content is left-aligned inside the content area, not centered, so the layout does not shift when the viewport resizes. Print has its own rules (Section 15).

### 6.2 App shell

```
Desktop and laptop
+----------+--------------------------------------------------+
| Wordmark |  [page header: title            primary action ] |
|          |                                                  |
| Overview |  [page content]                                  |
| Invoices |                                                  |
| Clients  |                                                  |
| Cash flow|                                                  |
| Calendar |                                                  |
|          |                                                  |
| ------   |                                                  |
| Settings |                                                  |
| User menu|                                                  |
+----------+--------------------------------------------------+
```

- **Sidebar:** `--surface`, 1px right border `--line`. Width 248 (240 on laptop). Items are 40px high with 6px radius, 12px horizontal padding, a 20px icon, an 8px gap, and `text-body-strong`.
- **Nav item states:** default `--ink-2`; hover `--sunken` background; active `--brand-tint` background with `--brand` text, weight 600. No left stripe.
- **Nav labels:** Overview, Invoices, Clients, Cash flow, Calendar. Settings and the user menu are pinned at the bottom, separated by a hairline.
- **Top bar:** only on mobile and tablet. 56px high, `--surface`, bottom hairline. Holds the menu button, the wordmark, and the user menu.
- **Page header** (every authenticated page):
  ```
  [Breadcrumb, only on detail pages]
  Title (serif 28/36)                            [Secondary]  [Primary action]
  One line of description in ink-2 (optional)
  ```
  Primary action is always right-aligned and uses the Primary button. At most one primary action per page. On mobile the action moves below the title at full width.
- No page has a banner, hero, or decorative header.

### 6.3 Page templates

Every route uses exactly one of these templates.

**T1 List page** (Invoices, Clients)
```
Page header
Toolbar: [search] [filter] [filter]                    [count]
Panel
  Table
  Pagination row (inside panel, hairline above)
```

**T2 Detail page** (Client, Invoice)
```
Breadcrumb
Page header (title = entity name, meta line beneath)
Two columns on desktop: main (8/12) | summary rail (4/12)
  Main: sections as heading + panel
  Rail: one panel of key figures and actions
```
On tablet and mobile the rail stacks above the main column.

**T3 Overview** (Overview, Cash flow)
```
Page header
Position strip (one panel, dividers between figures)
Chart panel (full width)
Two columns: Needs attention | Upcoming
```

**T4 Form page** (New invoice)
```
Page header
Form column (max 720px) or two-column builder at lg
Sticky action bar at the bottom (Cancel, Save draft, Issue invoice)
```

**T5 Auth** (Login, Register)
```
Canvas
Centered column, 400px wide (480px for Register)
Wordmark above, panel below, one-line helper text under the panel
```

**T6 Full-bleed tool** (Calendar)
```
Page header
Calendar in a panel that fills the remaining height
```

**T7 Document** (Invoice print, public invoice)
White background, A4 proportions, no app chrome (Section 15).

**T8 System** (404, error, forbidden)
Centered text block on the canvas inside the app shell when authenticated, otherwise plain canvas.

---

## 7. Component specifications

Build these by customizing shadcn/ui primitives in `src/components/ui`. Each must be present on the `/dev/ui` kit page in every state.

### 7.1 Button

| Variant | Background | Text | Border | Use |
| :--- | :--- | :--- | :--- | :--- |
| Primary | `--brand` | white | none | The single main action |
| Secondary | `--surface` | `--ink` | 1px `--line-strong` | Other actions |
| Ghost | transparent | `--ink-2` | none | Toolbar and row actions |
| Destructive | `--negative` | white | none | Only inside a confirmation dialog |
| Link | transparent | `--brand` | none | Inline navigation, underline on hover |

- Height 40 (default), 32 (compact, in table toolbars), 44 on touch devices (coarse pointer).
- Padding 16 horizontal. Radius 6. Weight 500. No uppercase, no arrows, no icon-only primary buttons.
- States: hover darkens (`--brand-hover` or `--sunken`), pressed same as hover, focus-visible shows the focus ring, disabled uses `--sunken` background and `--ink-3` text with `cursor-not-allowed`, loading shows a 16px spinner to the left of the label and keeps the width fixed.
- Label rules: verb plus object when space allows ("Add client", "Issue invoice", "Send reminder"). Same action keeps the same name everywhere.

### 7.2 Inputs

- Height 40, radius 6, 1px `--line-strong`, background `--surface`, text `--ink`, placeholder `--ink-3`.
- Focus: border `--brand` plus `outline: 2px solid var(--brand); outline-offset: 1px`. No translucent or glowing rings.
- Invalid: border `--negative`, error message below.
- Disabled: `--sunken` background.
- Labels sit above the field, `text-body-strong`. Helper text below, `text-small` `--ink-3`. Optional fields say "(optional)" after the label. No asterisks, no floating labels.
- Currency inputs: text right-aligned, tabular, currency code shown as a read-only prefix inside the field.
- Select: native-feeling shadcn Select styled like an input. Chevron 16px `--ink-3`.
- Date input: shadcn Popover with Calendar. Display format `12 Nov 2026`. Typing is also accepted.
- Checkbox and radio: 16px, 3px radius for checkbox, `--brand` fill when checked.

### 7.3 Table

- Container: Panel (`--surface`, 1px `--line`, 8px radius, overflow hidden).
- Header row: `--sunken` background, 40px high, `text-caption` weight 500, `--ink-2`, sentence case. Sticky within the panel when the page scrolls.
- Body rows: 52px (comfortable) or 44px (compact option on desktop), bottom hairline `--line`, last row has none.
- Hover row: `--sunken`. Selected row: `--brand-tint`.
- Column alignment: text left, money and numbers right (tabular), dates left, status left, row actions right.
- Money columns show the currency code in a muted `--ink-3` span before the number only when the table mixes currencies. Otherwise the code appears once in the column header.
- Row actions: a ghost icon button with a menu, visible on row hover and always visible on touch.
- Sorting: click header, 16px chevron, one active sort at a time.
- Primary identifier column (invoice number, client name) is `--ink` weight 500 and is the link to the detail page.
- No zebra striping. No vertical gridlines. No heavy borders.
- Pagination row: 52px, count on the left ("1 to 25 of 148"), Previous and Next ghost buttons on the right.
- Mobile (under 768): each row becomes a two-line list item (identifier and amount on line 1, status and date on line 2). No horizontal scroll for primary tables.

### 7.4 Status badge

| Status | Background | Text | Label |
| :--- | :--- | :--- | :--- |
| Draft | `--sunken` | `--ink-2` | Draft |
| Sent | `--brand-tint` | `--brand` | Sent |
| Paid | `--positive-tint` | `--positive` | Paid |
| Overdue | `--negative-tint` | `--negative` | Overdue |
| Cancelled | `--sunken` | `--ink-3` | Cancelled (text struck through is **not** used) |
| Healthy (client) | `--positive-tint` | `--positive` | Healthy |
| Watchlist (client) | `--caution-tint` | `--caution` | Watchlist |
| Critical (client) | `--negative-tint` | `--negative` | Critical |

Badge: height 22, padding 0 8, radius 3, `text-caption` weight 500, no border, no icon, no dot. Detail views may append the duration in plain text outside the badge ("12 days overdue").

Status is derived at read time for "Overdue" (due date before today and status is Sent). Show the derived status, not a stale stored value.

### 7.5 Panel and section

- A panel is `--surface`, 1px `--line`, 8px radius, padding 24.
- A section is a `text-section` heading (with an optional right-aligned action) followed by one panel or by content on the canvas.
- Panels are never nested. Inside a panel, group with spacing and hairlines.

### 7.6 Dialog, sheet, popover

- Dialog: 480px wide (640 for forms with two columns), radius 12, `--shadow-pop`, overlay `rgba(27,36,51,0.40)` flat (no blur). Header with `text-section` title and a close button, body, footer right-aligned with Secondary then Primary.
- Sheet: right-side drawer, 480px, full height, same header and footer pattern. Used for "Add client" and "Edit client".
- Confirmation dialog: title states the action ("Delete client"), body states the consequence and what is blocked, and the confirm button repeats the verb ("Delete client"). Never "Yes" and "No".
- Focus is trapped, Escape closes, focus returns to the trigger.

### 7.7 Tabs and segmented controls

- Tabs: text tabs with a 2px `--brand` underline on the active tab, hairline across the full width. No pills.
- Segmented control (for period switches such as 30 days and 90 days): 32px high, 1px `--line-strong`, active segment `--surface` with `--ink` text on a `--sunken` track.

### 7.8 Alerts and inline messages

- Tinted background (`--negative-tint`, `--caution-tint`, `--brand-tint`), `--ink` text, 12px 16px padding, radius 6, one-line bold lead followed by the explanation. **No colored side stripe, no icon circle.** A 16px icon is allowed at the start.
- Alerts appear inline in the content they concern. No floating alert banners.

### 7.9 Tooltip

Dark `--ink` background, white text, `text-caption`, radius 6, 8px 10px padding, 400ms open delay. Only for icon-only buttons and for truncated or calculated values. Never for restating a visible label.

### 7.10 Tags and filters

Filters are ghost buttons with a chevron that open a popover list. Applied filters appear as plain `--brand-tint` chips with a close icon, radius 6, below the toolbar. A single "Clear all" link follows the chips.

### 7.11 Avatar and user menu

Initials avatar 32px in the sidebar footer. Menu items: Settings, Sign out.

### 7.12 Skeleton

`--sunken` rectangles with 6px radius that match the final layout (same row height, same column widths). One soft opacity fade (1.4s, from 100% to 60%) on the group, disabled under reduced motion.

---

## 8. Data display

### 8.1 Number formatting

Use `Intl.NumberFormat` through a single helper in `src/lib/format.ts`. Never format inline.

| Item | Format | Example |
| :--- | :--- | :--- |
| Money, table | currency code plus grouped number, 2 decimals | `PKR 1,284,500.00` |
| Money, hero | same with 0 decimals when over 100,000 and the decimals dimmed otherwise | `PKR 4,380,250` |
| Negative | true minus sign (U+2212), `--negative` color | `−PKR 62,400.00` |
| Zero | `0.00` in `--ink-3` | |
| Percent | up to 1 decimal | `14.5%` |
| Date | `D MMM YYYY` | `12 Nov 2026` |
| Date, compact | `D MMM` | `12 Nov` |
| Relative | only in detail meta: "due in 9 days", "12 days overdue" | |
| Invoice number | exactly as stored | `INV-2026-0042` |

Money is always computed and rounded with decimal arithmetic on the server. The UI only formats strings or numbers it was given.

### 8.2 Status vocabulary

Use exactly: Draft, Sent, Paid, Overdue, Cancelled. Client risk: Healthy, Watchlist, Critical. Do not invent synonyms ("Pending", "Unpaid", "In progress").

### 8.3 Position strip (Overview)

One panel containing four figures separated by 1px vertical `--line` dividers. The first figure is larger than the others.

```
+--------------------------------------------------------------------------+
| Liquid cash          | Receivables, next 30 days | Overdue      | Cash gap |
| PKR 4,380,250        | PKR 2,914,600             | PKR 618,300  | 18 Dec   |
| (serif, 44)          | (sans, 24, 600)           | (24, red)    | (24)     |
| as of 12 Nov, 14:05  | 9 invoices                | 4 invoices   | Below buffer |
+--------------------------------------------------------------------------+
```

- Label above each figure in `text-small` `--ink-2`. Supporting line beneath in `text-small` `--ink-3`.
- The "Cash gap" figure shows the first date the forecast falls below the safety buffer. If none, it reads "None in 30 days" in `--positive`.
- No icons, no trend arrows, no sparklines. A comparison ("+4.2% vs last month") appears only if the data for it exists.
- Values update live. The changed figure briefly tints (Section 16.2).

### 8.4 Key-value blocks

Detail rails and summaries use a definition list: label left in `--ink-2`, value right in `--ink`, 12px vertical gap, hairline between groups only.

### 8.5 Totals block (invoices)

Right-aligned, 320px wide: Subtotal, Tax (rate shown), then a hairline, then Total in `text-total` serif. If the invoice currency differs from the base currency, add one muted line: "Equals PKR 1,284,500.00 at 278.4000".

### 8.6 Charts

Pick one library for the whole app (recommendation: Chart.js through `react-chartjs-2`, since the assignment names it). All charts read their styling from one theme file `src/lib/chart-theme.ts`, which is the only place raw hex values may appear besides `globals.css`.

Rules:
- **Series colors:** balance line `--brand` 2px; inflow `--chart-inflow`; outflow `--chart-outflow`. Maximum three colors in any chart.
- **Fills:** a flat 10% tint of `--brand` under the balance line. No gradient fills.
- **Grid:** horizontal hairlines only, `--line`. No vertical grid, no chart border.
- **Axes:** 12px `--ink-3`. Y axis shows compact money (`2.5M`). X axis shows `D MMM`, at most 6 labels.
- **Safety buffer:** a dashed `--negative` horizontal reference line labeled "Safety buffer" at the right end. Days below it get a `--negative-tint` background band.
- **Legend:** inline text above the chart at the left, using small color keys. No legend box.
- **Tooltip:** white panel, 1px `--line`, `--shadow-pop`, lists date, balance, inflows, outflows. No colored header.
- **Forecast waterfall** (Cash flow page): floating bars for daily net change plus a running balance line. Bars use inflow and outflow colors.
- **Chart types allowed:** line, area (flat tint), bar, floating bar. Forbidden: pie, donut, radar, 3D, gauge.
- **Aging breakdown:** horizontal stacked bar with four buckets (Current, 1 to 30, 31 to 60, over 60 days), neutral to `--negative` single-hue steps, with the amounts printed at the right of the bar.
- **Animation:** 300ms line draw on first render only. No bounce. Re-render on data change updates in place with a 180ms ease.
- **Accessibility:** every chart has a visible "View as table" toggle that swaps the canvas for a data table, and an `aria-label` that states the key takeaway ("Cash falls below the safety buffer on 18 Dec").
- **Empty chart:** show axes with a centered sentence ("No receivables or expenses in the next 30 days."), not a blank box.

### 8.7 Calendar (FullCalendar)

Override FullCalendar's CSS with tokens in `src/modules/calendar/calendar.css`.

- Grid lines `--line`. Day header text `--ink-2` weight 500, sentence case ("Mon", not "MON").
- Today: cell background `--brand-tint`, date number in `--brand` weight 600.
- Events: single-line rows with 22px height, radius 3, tinted backgrounds from the status table in 7.4 and the matching text color. Event text: client name and amount, truncated.
- Only invoices and expenses appear. No colored side stripes.
- Toolbar: our own page-header controls (Today, Previous, Next, month title, view segmented control Month, Week, List). Hide FullCalendar's default toolbar.
- List view uses the same row pattern as the invoice table.
- Event click opens the invoice sheet (Section 7.6), not a popover.
- Mobile defaults to List view.

### 8.8 Lists that are not tables

"Needs attention" and "Upcoming" lists use rows separated by hairlines: primary text left (client and invoice number), amount right, status or date on a second line in `--ink-3`. No avatars, no icons.

---

## 9. Forms

- One column by default, max width 560px. Two columns only at `lg` and above for short related fields (issue date and due date, currency and tax rate).
- Group fields under `text-sub` headings with 32px between groups. Do not wrap groups in extra panels beyond the single form panel.
- Validation runs on blur and on submit. Error text appears under the field in `--negative`, `text-small`, linked with `aria-describedby`. The first invalid field receives focus on submit.
- Submit button reads the action ("Add client"). While pending it shows the inline spinner and stays the same width.
- Unsaved changes: leaving a dirty form shows the confirmation dialog "Discard changes".
- Server errors that are not field-specific appear in an inline alert at the top of the form.
- Autocomplete attributes on every auth and contact field. Correct `inputmode` for numeric fields.

### 9.1 Invoice builder (T4)

```
Page header: New invoice                         (no primary action here)

[ Client select ]  [ Currency select ]  [ Issue date ] [ Terms: Net 30 v ] [ Due date ]

Line items
+----------------------------------------------------------+
| Description              Qty    Unit price      Amount  x |
| [Consulting, phase 1  ]  [ 12]  [ 18,500.00]   222,000.00 |
| [                     ]  [   ]  [          ]        0.00  |
+----------------------------------------------------------+
  Add line

Notes (optional)                               Totals block (8.5)

Sticky bar:  Cancel                     Save draft    Issue invoice
```

- Line item grid uses the table look (7.3) with inputs inside cells, borderless until hover or focus.
- Amount is read-only, tabular, right-aligned, computed client-side for display and re-verified on the server.
- Due-date presets are a Select ("On receipt", "Net 15", "Net 30", "Net 60") that fills the due date.
- Currency change shows the converted base-currency line under the totals, with the rate and its date in `--ink-3`.
- Remove line is a ghost icon button. Reordering uses drag handles only on desktop and move up/down in the row menu on touch.
- Sticky bar: `--surface`, top hairline, padding 16 32, actions right-aligned.
- Mobile: line items become stacked blocks, each with Description on its own row, then Qty, Unit price, Amount in a three-column row.

---

## 10. Feedback and states

### 10.1 Loading

Route-level `loading.tsx` renders skeletons of the exact template: page header block, then the same table or panel structure. Interactions that finish quickly show no loading indicator. Button submits use the inline spinner.

### 10.2 Empty states

Centered inside the panel, `text-sub` heading, one sentence in `--ink-2`, one action. No icon, no illustration.

| Screen | Heading | Body | Action |
| :--- | :--- | :--- | :--- |
| Clients | No clients yet | Add a client before you issue an invoice. | Add client |
| Invoices | No invoices yet | Invoices you issue appear here with their payment status. | New invoice |
| Invoices, filtered | No invoices match these filters | Try removing a filter or searching by invoice number. | Clear filters |
| Cash flow, no data | Nothing to forecast yet | Issue an invoice or record an expense to see your 30 day position. | New invoice |
| Calendar | No events in this range | Due dates and expenses appear here once recorded. | (none) |

### 10.3 Errors

- Field errors: Section 9.
- Page errors (`error.tsx`): heading "This page could not load", body states what failed in plain terms and that nothing was changed, buttons "Try again" and "Go to overview". Never show stack traces, codes, or "Oops".
- Network failure on an action: inline alert near the action, with a Retry button.
- 404: heading "Page not found", body "The address may be wrong or the item may have been deleted.", button "Go to overview".
- Forbidden: heading "You do not have access", body names the missing role.

### 10.4 Success and toasts

Prefer inline confirmation (a changed badge, an updated row). Use a toast only when the result is invisible on screen: "Reminder sent to Hamdan Textiles", "PDF downloaded". Toast: bottom right, 360px, `--surface`, 1px `--line`, `--shadow-pop`, 4 seconds, one at a time, no icon, no color stripe, action link optional ("Undo"). Use shadcn Sonner restyled.

### 10.5 Destructive and irreversible actions

Always a confirmation dialog stating the consequence. Marking an invoice paid and cancelling an invoice both confirm with the amount and client in the body.

### 10.6 Offline and real-time connection

If the live connection drops, show a small inline text in the page header meta: "Live updates paused. Reconnecting." Remove it on reconnect. No banners.

---

## 11. Content and microcopy

### 11.1 Voice

Plain, specific, calm. Write for a finance manager who is busy. State what happened and what to do next. No marketing language inside the product.

### 11.2 Rules

- Sentence case for headings, labels, buttons, menu items.
- Buttons: verb first. "Save changes", not "Submit".
- A name stays the same everywhere: "Issue invoice" in the button, "Invoice issued" in the confirmation.
- Errors explain the cause and the fix. No apologies, no blame, no jokes.
- Numbers and dates are never abbreviated beyond the formats in 8.1.
- No exclamation marks. No emoji. No "please" in buttons.
- Page descriptions are one sentence or absent.

### 11.3 Seed and demo data

Seeds must look like a real small business with uneven numbers, mixed status, and a couple of problems.

- Company: "Rehman and Sons Trading", base currency PKR, liquid reserve `PKR 4,380,250.00`, safety buffer `PKR 1,200,000.00`.
- Clients (varied, realistic): Hamdan Textiles (Pvt) Ltd, Northgate Logistics GmbH, Salma Furniture Works, Crestline Packaging LLC, Dr. A. Qureshi Clinics, Bayview Hospitality Group, Metro Auto Parts, Kinnaird Print House.
- Invoices: 30 to 40, amounts non-round (for example `PKR 187,450.00`, `USD 2,340.75`, `EUR 1,180.00`, `GBP 960.40`), mixed Draft, Sent, Paid, Overdue, one Cancelled. At least three overdue by 5, 19, and 47 days.
- Expenses: payroll on the 28th, rent on the 1st, software subscriptions, a utility bill, one large equipment payment that creates a forecast dip below the buffer.
- Never use: John Doe, Acme, Lorem ipsum, Test, 10,000, 50%, 99.9%.
- Seed values must produce at least one forecast date below the buffer so the deficit state is visible during development.

### 11.4 Standard strings (extend, do not reword)

| Context | Text |
| :--- | :--- |
| Mark paid confirm title | Mark invoice as paid |
| Mark paid confirm body | This records PKR 187,450.00 from Hamdan Textiles as received today. |
| Reminder button | Send reminder |
| Reminder success toast | Reminder sent to Hamdan Textiles |
| Client delete blocked | This client has unpaid invoices. Settle or cancel them before deleting. |
| Session expired | Your session ended. Sign in to continue. |
| Wrong credentials | The email or password is incorrect. |

---

## 12. Route-by-route specification

Routes marked **(proposed)** are not in the current master plan. Create them only when the owning phase includes them; otherwise the pattern still applies when they are added.

### 12.1 Auth (Phase 1), template T5

**/login**
```
                    FinFlow
        +------------------------------+
        | Sign in                      |
        | Email        [            ]  |
        | Password     [            ]  |
        | [x] Keep me signed in        |
        | [        Sign in          ]  |
        +------------------------------+
        New to FinFlow? Create a workspace
```
- Panel 400px, padding 32, canvas background around it. Title "Sign in" in serif 28/36. Primary button full width.
- Errors appear in an inline alert above the button.
- Link "Create a workspace" is a Link button below the panel.

**/register**
- Panel 480px. Sections as headings inside one panel: Business, Account, Opening position. Fields: company name, business email, full name, password, base currency (Select), opening liquid cash, safety buffer.
- Password rules are a plain text checklist beneath the field ("At least 12 characters", "Contains a number"), turning `--positive` when met, with no strength bar.
- Primary button "Create workspace".

### 12.2 Shell and settings (Phase 0 and 1)

- Authenticated layout from 6.2 wraps every route group `(dashboard)`.
- **/settings (proposed)**, template T2 without rail: sections Workspace (name, base currency), Cash position (liquid reserve, safety buffer), Account (name, password). Each section is a heading and one panel with a Save changes button.

### 12.3 Overview (Phase 5), template T3, route `/dashboard`

```
Overview
Your cash position as of 12 Nov 2026, 14:05

[ Position strip (8.3) ]

30 day forecast                                [30 days | 90 days]
+--------------------------------------------------------------+
| legend: Balance  Inflows  Outflows                            |
| (chart, 320px high)                                           |
+--------------------------------------------------------------+

Needs attention                      Due in the next 14 days
+---------------------------------+  +--------------------------+
| list rows (8.8)                 |  | list rows                |
+---------------------------------+  +--------------------------+
```
- "Needs attention" lists overdue invoices (oldest first) and the first deficit date as a row with the amount short of the buffer.
- Primary action in the header: "New invoice".
- Counters and the chart update live (Section 16).

### 12.4 Clients (Phase 2)

**/clients** template T1
- Toolbar: search (client name or email), filter Risk (Healthy, Watchlist, Critical). Primary action "Add client" opens the sheet.
- Columns: Client (name plus email on a second line in `--ink-3`), Terms ("Net 30"), Billed, Outstanding, Overdue, Risk (badge), actions menu.
- Risk badge rules: Healthy (nothing overdue), Watchlist (oldest overdue 1 to 29 days), Critical (30 days or more).

**/clients/[id]** template T2
- Breadcrumb "Clients". Title is the client name. Meta line: email, phone, terms.
- Main: heading "Invoices" with a table (T1 table, no toolbar), then heading "Payment history" listing paid invoices with days to pay.
- Rail: key-value block (Billed, Collected, Outstanding, Overdue, Average days to pay) and actions "Send reminder" (Secondary) and "Edit client" (Secondary).
- Aging: a four-bucket stacked bar from 8.6 above the invoice table.

**Add and edit client sheet**: fields name, email, phone (optional), address (optional), payment terms Select. Footer: Cancel, Add client.

### 12.5 Invoices (Phase 3)

**/invoices** template T1
- Toolbar: search (number or client), filters Status, Client, Currency, Due date range. Primary action "New invoice".
- Columns: Number, Client, Issued, Due, Amount (invoice currency), In PKR (base), Status, actions.
- Row menu: View, Download PDF, Send reminder, Mark as paid, Cancel invoice.
- Above the table, a plain text summary line: "148 invoices, PKR 3,532,900.00 outstanding".

**/invoices/new** template T4. Builder from 9.1.

**/invoices/[id]** template T2
- Title: invoice number in serif. Badge next to it. Meta: client link, issue date, due date.
- Main: a document-style panel that mirrors the printed invoice (line items table, totals block, notes).
- Rail: Amount due (serif `text-total`), status, due in or overdue by, currency and rate, then actions: Mark as paid (Primary only when Sent or Overdue), Send reminder, Download PDF, Cancel invoice (Ghost, destructive text).
- Activity section below: a plain chronological list (Created, Reminder sent, Paid) with dates. Reads from the audit log when it exists.

**/invoices/[id]/print** template T7. Section 15.

### 12.6 Cash flow (Phase 5), template T3, route `/cash-flow` **(proposed)**

- Header action: "Add expense".
- Position strip variant: Opening cash, Expected inflows, Scheduled outflows, Lowest projected balance (with date).
- Waterfall chart panel (8.6), then Expenses table (T1 table: Date, Description, Category, Amount, Recurrence, actions), then Assumptions note panel describing in two sentences how the forecast treats due dates and overdue invoices.

### 12.7 Calendar (Phase 6), template T6, route `/calendar`

- Header controls from 8.7. Calendar panel fills the viewport height minus the header (min 560px).
- Legend line under the header: Paid, Sent, Overdue, Expense as text with their tinted swatches.

### 12.8 Reminders and live sync (Phase 7)

- No new routes. Reminder button states: "Send reminder" (default), spinner, then toast, then the row gains "Last reminder 12 Nov" in `--ink-3`.
- Live updates follow Section 16.2.

### 12.9 Public invoice **(proposed)** `/p/[token]`, template T7

Read-only invoice on white, wordmark top left, amount due large, no sidebar, no login. Footer line with the sender's name and contact. A single "Download PDF" Secondary button.

### 12.10 System routes (Phase 0)

`not-found.tsx`, `error.tsx`, `loading.tsx` per route group, forbidden view. Template T8 and Section 10.

---

## 13. Responsive behavior by screen type

| Element | Mobile (<768) | Tablet (768 to 1023) | Laptop and up |
| :--- | :--- | :--- | :--- |
| Navigation | Top bar, left drawer 280px | 64px icon rail, tooltips | Full sidebar |
| Page header action | Full-width below title | Right-aligned | Right-aligned |
| Position strip | 2 by 2 grid, hairlines between | 4 across, smaller gaps | 4 across |
| Chart | Full width, 240px high, 4 x labels | 280px | 320px |
| Tables | Two-line list rows | Table, secondary columns hidden | Full table |
| Detail rail | Stacks above main | Stacks above main | Right column |
| Forms | Single column | Single column | Single or two columns |
| Dialogs | Full-screen sheet from bottom | Centered dialog | Centered dialog |
| Calendar | List view default | Week view default | Month view default |
| Sticky action bar | Full-width buttons, stacked | Inline | Inline |
| Touch targets | 44px minimum | 44px minimum | 40px |

Columns hidden on tablet in the invoice table: In PKR (base) and Issued. In the client table: Terms and Overdue.

Test widths: 360, 390, 768, 1024, 1280, 1536, 1920.

---

## 14. Accessibility

- WCAG 2.2 AA minimum.
- Focus: `outline: 2px solid var(--brand); outline-offset: 2px` on all interactive elements using `:focus-visible`. Never remove outlines.
- Contrast: all text meets 4.5:1 (3:1 for 18px and above bold or 24px). Verify with axe in Playwright.
- Hit targets 40px desktop, 44px touch (`@media (pointer: coarse)`).
- Keyboard: every action reachable, dialogs trap focus, menus support arrow keys, tables are real `<table>` elements with `<th scope>`.
- Skip link "Skip to content" visible on focus.
- Status is never color only. Charts have a table alternative and a text summary.
- Live updates: counters and lists use `aria-live="polite"` regions. Do not announce every tick of a chart.
- `prefers-reduced-motion`: disable all transitions beyond opacity and remove skeleton fades.
- Forms: labels programmatically linked, errors linked with `aria-describedby`, required state via `aria-required`.
- Language `en`, document titles unique per route ("Invoices, FinFlow").

---

## 15. Print, PDF, and email styling

### 15.1 Invoice document (print and public view)

- White background, ink text, no shadows, no borders except table hairlines and the totals rule.
- Layout (A4, 20mm margins): sender wordmark and details top left, "Invoice" in serif 28 with number and dates top right; Bill to block; line items table (Description, Qty, Unit price, Amount); totals block right-aligned with Total in serif 18pt; notes and payment details at the bottom.
- Fonts: Source Serif 4 and IBM Plex Sans (embed them in jsPDF using `addFileToVFS` so currency text renders consistently). If embedding is not feasible in the phase, use jsPDF's built-in Times for serif and Helvetica for sans and keep the same hierarchy.
- `@media print`: hide sidebar, top bar, actions, and toasts; set `@page { size: A4; margin: 20mm; }`; table header repeats on page breaks; avoid breaking inside rows.
- jsPDF output and the print stylesheet must look like the same document.

### 15.2 Reminder email (EmailJS template)

Plain, left-aligned, 560px wide, white background, `--ink` text, one `--brand` text link or button "View invoice". Subject: "Payment reminder: INV-2026-0042". No images, no banner, no footer marketing.

---

## 16. Motion

### 16.1 Rules

- Durations 120ms (hover, focus), 180ms (open, close, layout shifts). Easing `cubic-bezier(0.2, 0, 0, 1)`.
- Allowed properties: `opacity`, `background-color`, `border-color`, `color`, and a 4px `translateY` on menus and dialogs opening. Never `transition: all`.
- No entrance animation on page load. No scroll-triggered reveals. No hover lift. No scale.
- Respect `prefers-reduced-motion: reduce` by removing translate and fades longer than 0ms.

### 16.2 Live data changes

When a value changes through real-time sync or an optimistic update:
- The changed number or row gets a `--brand-tint` background that fades to transparent over 800ms. Numbers do not roll or count up.
- A status badge swaps instantly with a 120ms background transition.
- The chart updates in place: line and bars morph over 180ms.
- The overdue counter increments with the same tint flash.
- The optimistic state is the real appearance. If the server rejects the change, revert and show an inline alert at the affected row or panel.

---

## 17. Implementation notes for agents

### 17.1 Files to create in Phase 0

```
src/app/globals.css              tokens and base (Section 3)
src/app/fonts.ts                 font loading
src/components/ui/*              shadcn primitives restyled to this spec
src/components/shell/            Sidebar, TopBar, PageHeader, UserMenu
src/components/data/             DataTable, StatusBadge, Money, DateText, KeyValue, PositionStrip
src/components/feedback/         EmptyState, ErrorState, Skeletons, InlineAlert
src/components/charts/           ChartFrame (legend, table toggle), chart-theme.ts
src/lib/format.ts                all number, money, date formatting
src/app/dev/ui/page.tsx          kit page, 404 in production
scripts/ui-lint.mjs              checks from Section 2.3
tests/ui/*.spec.ts               Playwright visual and a11y tests
```

### 17.2 Tailwind and shadcn

- Tailwind classes use the token names from `@theme` (`bg-surface`, `text-ink-2`, `border-line`, `text-brand`). Utility palettes such as `gray-500` are forbidden.
- Add custom utilities for the type scale (`text-title`, `text-hero`, `text-total`, `text-section`, `text-sub`, `text-body`, `text-small`, `text-caption`) in the theme.
- When running `npx shadcn@latest add`, immediately edit each generated component to match Section 7. Remove default `shadow-*`, `rounded-xl`, `dark:` classes, and default gray palette references.
- Use `cva` variants for Button and Badge so variants cannot drift.

### 17.3 Components own their patterns

Pages compose `PageHeader`, `DataTable`, `Panel`, `PositionStrip`, `EmptyState`, `StatusBadge`, and `Money`. A page file must not contain raw table markup, hand-written badge styling, or inline number formatting.

### 17.4 Tests

- **Visual snapshots** (Playwright) of every route at widths 390, 768, 1280 with seed data. Update snapshots only on intentional change.
- **Axe** accessibility scan on every route, zero violations at AA.
- **ui-lint** passes with zero findings.
- **Keyboard test** on login, new invoice, and the client sheet.

---

## 18. Acceptance checklist (add to every phase DoD)

A phase is not complete until all of these hold for its routes:

- [ ] Uses the correct template from Section 6.3 and the standard page header.
- [ ] Only tokens from Section 3 are used. `npm run lint` including `ui-lint` reports zero findings.
- [ ] No item from the forbidden list in Section 2.1 appears. Reviewer spot-checks items 1, 5, 10, 13, 21, 24, 26.
- [ ] Loading, empty, error, and populated states all implemented and shown on the kit page or in tests.
- [ ] Money, dates, and statuses follow Sections 8.1 and 8.2 and use the shared helpers.
- [ ] Works at 360, 768, 1024, 1280, and 1920 widths with no horizontal page scroll.
- [ ] Axe scan shows zero AA violations. Keyboard path completes the main task. Focus is visible everywhere.
- [ ] Seed data is realistic per Section 11.3 and includes overdue and below-buffer cases.
- [ ] Charts follow Section 8.6 and have a table alternative.
- [ ] Copy follows Section 11: sentence case, verb-first buttons, no exclamation marks, no emoji.
- [ ] Screenshots at 390, 768, and 1280 attached to the PR.

---

## 19. Appendix

### 19.1 Text to add to `AGENTS.md`

```
### 5. UI System (Mandatory)
* Read FINFLOW_UI_DESIGN_SYSTEM.md before any UI work. It overrides prior UI statements.
* Light theme only. No dark mode, no `dark:` classes.
* Use design tokens and shared components only. No raw colors, no default Tailwind palettes.
* Forbidden: gradients, glassmorphism, emoji, uppercase labels, hover scale, entrance animations,
  icon-in-circle tiles, identical KPI card rows, placeholder data such as "John Doe" or "Acme".
* `npm run lint` must include `scripts/ui-lint.mjs` with zero findings.
* Every PR touching UI includes screenshots at 390, 768, and 1280 px.
```

### 19.2 Replace in the master plan

- Phase 0 DoD: replace "dark mode support" with "light theme tokens, fonts, shell, kit page, and `ui-lint` in place".
- Phase 1 UI text: replace "split-screen layout" with the centered single-column auth template (Section 12.1).
- Phase 2: replace "Status badges" description with Section 7.4 and the aging buckets in Section 8.6.
- Phase 5: replace "shaded area curve" with the flat-tint area plus buffer reference line (Section 8.6). Resolve the Chart.js or Recharts choice.

### 19.3 Open decisions for the developer

1. **Chart library:** Chart.js (matches the assignment) or Recharts. Choose one before Phase 5.
2. **Accent color:** Oxford blue `#1F3A5F` is the default. If changed, update `--brand`, `--brand-hover`, `--brand-tint` together and re-verify contrast.
3. **Font embedding in PDFs:** decide in Phase 4 whether to embed Source Serif 4 and IBM Plex Sans in jsPDF or fall back to built-in fonts.
4. **Proposed routes** (`/cash-flow`, `/settings`, `/p/[token]`): confirm they will exist, because the plan needs an expenses module and a public invoice link to fully support the forecast and reminders.
