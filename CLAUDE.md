# CLAUDE.md

## Project Overview

AIBOD Factory is a Software Manufacturing Platform that treats software development as a factory-based manufacturing process. It uses a "Blueprint" architecture to design, prototype, manufacture, and improve software.

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS 3
- **Linting**: ESLint 9
- **Schema**: JSON Schema (2020-12) for Blueprint definitions
- **i18n**: Japanese / English support

## Directory Structure

- `factory/` - Core factory system (schema, blueprints, jigs, flyers)
- `factory/schema/` - Blueprint JSON Schema definition
- `factory/jigs/` - Factory tools (DataScope, PyIOScope) — each is a React+Vite app
- `demo/` - Interactive demo applications (wafermap, planner, organizer, scheduler)
- `html/` - Additional HTML pages (factory tour, whitepaper, production lines)
- `img/` - Image assets
- `obs/` - Obsolete/archived versions

## Key Concepts

- **Blueprint**: JSON Schema-based configuration defining metadata, layers, interfaces, behavior (workflow DAG / state machines), BOM, and quality gates.
- **Jigs**: Reusable factory tools (e.g., DataScope for data analysis, PyIOScope for Python I/O analysis).

## Development

### Jig apps (e.g., DataScope, PyIOScope)

```bash
cd factory/jigs/datascope
npm install
npm run dev
```

### Build

```bash
npm run build
```

## Conventions

- Landing page is `index.html` at root
- Demo apps follow the naming pattern `NNN-NNNN-X_name/` under `demo/`
- Internationalization uses an i18n framework with JP/EN locale support
- Archived/previous versions go in `obs/`

## HTML Coding Rules

These rules apply to all static HTML pages in the project. Subagents must follow them.

### Document Structure

- DOCTYPE: `<!DOCTYPE html>`, lang attribute set to `ja` by default (`<html lang="ja">`)
- Include `<meta charset="UTF-8" />` and `<meta name="viewport" content="width=device-width, initial-scale=1" />`
- Link shared stylesheet via `<link rel="stylesheet" href="styles.css" />`
- Inline `<script>` blocks go at the bottom of `<body>`, not in `<head>`
- No external JS frameworks for the main site — vanilla JS only (React+Vite is only for jig apps under `factory/jigs/`)

### CSS Design System (styles.css)

Use CSS custom properties defined in `:root`:

| Variable      | Value                    | Usage                        |
|---------------|--------------------------|------------------------------|
| `--cyan`      | `#00b3ec`                | Primary accent               |
| `--blue`      | `#1d2087`                | Secondary accent / gradients |
| `--navy`      | `#0a1428`                | Deep background              |
| `--ink`       | `#e5e7eb`                | Default text color           |
| `--muted`     | `#9fb1ca`                | Subdued / secondary text     |
| `--accent`    | `#22c55e`                | Green accent (SME mode)      |
| `--card`      | `rgba(255,255,255,.04)`  | Card background              |
| `--card-bd`   | `rgba(255,255,255,.12)`  | Card border                  |

- Dark theme only. Background uses radial/linear gradients over deep navy/black.
- Font stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", sans-serif`
- Base font size: `1.125rem` (18px)
- Max content width: `1120px`, centered with `margin: 0 auto`

### Layout Patterns

- **Header**: Sticky top nav using `position: sticky; backdrop-filter: blur(12px)`. Contains `.nav` flex container with `.brand` and `.nav-right`.
- **Main sections**: Use `<section class="section" id="...">` with `.section-header` (flex, space-between) containing `.section-title` and `.section-sub`.
- **Grid layouts**: Use CSS Grid. Cards use `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`. Process steps use `repeat(4, minmax(0, 1fr))`.
- **Responsive breakpoints**: `880px` (2-col grids), `768px` (tablet adjustments), `640px` (mobile text sizes), `600px` (nav stacks vertical), `480px` (single column).

### Component Classes

- **`.tile-container`** → Wrapper with 3D perspective for flip cards
- **`.tile`** → Flippable card (front/back). Uses `transform-style: preserve-3d`. Toggled with `.flipped` class via JS.
  - **`.tile-face`** → Shared face styling (absolute, backface-hidden)
  - **`.tile-front`** → Front face with radial gradient background
  - **`.tile-back`** → Back face (orange gradient), `transform: rotateY(180deg)`
  - **`.tile-title`** → Flex header with title text and optional badge
  - **`.tile-content`** → Body text
  - **`.tile-meta`** → Tag-like metadata spans (dashed border pills)
  - **`.tile-footer`** → Action buttons, placed outside `.tile` but inside `.tile-container`
  - **`.tile-hint`** → "More →" / "← Back" prompt at bottom-right of face
- **`.btn`** → Base button: inline-flex, rounded `.8rem`, subtle border
- **`.btn.primary`** → Gradient background `linear-gradient(90deg, var(--cyan), var(--blue))`
- **`.service-card`** → Article card for services (1rem padding, rounded 1rem)
- **`.contact`** → Contact section card
- **`.filter-btn`** → Pill-shaped filter toggle (`.active` gets cyan-blue gradient)

### Internationalization (i18n)

- All user-visible text must have a `data-i18n` attribute with a dotted key: `data-i18n="section.subsection.key"`
- The `I18N` object (inline `<script>`) maps keys for `ja` and `en` locales
- `applyLang()` iterates `[data-i18n]` elements and sets `innerHTML` from the dictionary
- Language is selected via `?lang=` URL param or browser language, defaulting to `ja`
- When adding new text, add entries to **both** `I18N.ja` and `I18N.en`

### View Mode System (Advanced / SME)

- Sections or elements scoped to a mode use `data-mode="advanced"` or `data-mode="sme"`
- JS `setMode()` shows/hides elements by matching `data-mode` attribute
- Mode is selected via `?mode=` URL param, defaulting to `advanced`
- SME mode overrides use `[data-mode="sme"]` CSS selector for green accent colors and different gradients
- Section-scoped overrides use `#sme-usecases .class` selectors

### Tile Data Attributes (for filtering)

- `data-industry="自動車"` / `data-industry="半導体"` on `.tile-container` for industry filter
- `data-keyword="受注"` / `data-keyword="部品物流"` / `data-keyword="テスト分析"` for keyword filter
- Filter buttons use `data-filter-type` and `data-filter-value` attributes
- Links can trigger filters via `data-filter-industry` attribute

### Inline Style Usage

- Inline `style` attributes are used in the codebase for one-off adjustments (e.g., `margin`, `font-size` on `<h3>` inside tiles). This pattern is acceptable for tile content but prefer CSS classes for reusable patterns.

### Image References

- Images go in `img/` directory
- Reference with relative paths: `./img/filename.png` or `img/filename.png`

### Adding a New Production Line Tile

Follow this structure:

```html
<div class="tile-container" data-industry="..." data-keyword="...">
  <div class="tile">
    <div class="tile-face tile-front">
      <div class="tile-title">
        <img src="img/character.png" alt="..." class="tile-character" />
        <div>
          <div class="tile-title-line" data-i18n="lines.pnXXXX.partnumber">9050-NNN-XXXX-X</div>
          <h3 style="margin:.1rem 0 .2rem; font-size:1.3rem;" data-i18n="lines.pnXXXX.title">Title</h3>
          <div class="tile-filter-badges">
            <span class="filter-badge" data-i18n="...">Badge</span>
          </div>
        </div>
        <span class="tile-badge" data-i18n="lines.pnXXXX.badge">Badge</span>
      </div>
      <p class="tile-content" data-i18n="lines.pnXXXX.body">Description</p>
      <div class="tile-meta">
        <span data-i18n="lines.pnXXXX.meta1">Meta 1</span>
        <span data-i18n="lines.pnXXXX.meta2">Meta 2</span>
        <span data-i18n="lines.pnXXXX.meta3">Meta 3</span>
      </div>
      <div class="tile-hint">More →</div>
    </div>
    <div class="tile-face tile-back">
      <!-- back content -->
      <div class="tile-hint">← Return</div>
    </div>
  </div>
  <div class="tile-footer">
    <a class="btn" href="./demo/..." data-i18n="lines.btn.demo">Demo</a>
    <a class="btn" href="#contact" data-line-id="..." data-i18n="lines.btn.consult">Consult</a>
  </div>
</div>
```

Then add corresponding `ja` and `en` entries to the `I18N` object in the `<script>` block.
