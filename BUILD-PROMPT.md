# ReviewDrop — Build Prompt

**Paste this into a new Claude Code session opened from this directory to start building.**

---

## Context

Read `PRODUCT-SPEC.md` in this directory for the full product specification.

## What to Build (Phase 1 — The Library)

Build `reviewdrop.js` — a single, zero-dependency JavaScript library (< 15KB gzipped) that turns
any HTML page into a reviewable document with per-element commenting.

### Core Requirements

1. **Single file output:** `dist/reviewdrop.js` — one IIFE bundle, no dependencies
2. **Shadow DOM:** All UI lives inside a Shadow DOM attached to `<body>` — zero CSS conflicts
3. **Auto-discovery:** Automatically find commentable elements on the page:
   - All h1-h6 headings
   - Images, SVGs > 24px, videos
   - Elements with class containing: card, tile, item, feature, tier, step, hero, cta
   - Buttons, anchor tags with visible text
   - Any block element > 100px tall with meaningful text content
   - Override: `data-reviewdrop` (force include), `data-reviewdrop-ignore` (force exclude)
4. **Hover trigger:** Small amber icon (top-right of element) appears on hover
5. **Click → Popover:** Anchored form with:
   - Auto-generated element label ("Hero > h1: Learn French...")
   - Textarea
   - Submit + Cancel buttons
6. **Output modes** (via `data-mode` on the `<script>` tag):
   - `clipboard` (default): Each submit → clipboard + toast "Copied — paste in chat"
   - `collect`: Accumulate in memory → floating "Download" button → JSON or Markdown file
   - `callback`: Fires `window.reviewDropOnComment({ element, path, comment, timestamp })`
7. **Visual feedback:** Commented elements get a dashed outline + count badge
8. **Counter badge:** Fixed bottom-right, shows comment count, click to see list / export all
9. **Configuration via data attributes:**
   ```html
   <script src="reviewdrop.js"
     data-mode="clipboard"
     data-color="#F59E0B"
     data-reviewer="Name"
     data-exclude=".nav, .footer"
   ></script>
   ```
10. **Programmatic API:**
    ```js
    ReviewDrop.init(options)
    ReviewDrop.getComments()
    ReviewDrop.exportMarkdown()
    ReviewDrop.exportJSON()
    ReviewDrop.download('md' | 'json')
    ReviewDrop.destroy()
    ReviewDrop.on('comment', callback)
    ```

### Element Path Generation

Generate human-readable paths for each element:
- Use nearest section heading as parent context
- Include element tag, class hints, and truncated text content
- Examples: `"Section: Pricing > h3: Guided Friend"`, `"Hero > p: KhudSeSikho is a friendship..."`

### Build Setup

- Source: `src/` directory with ES6 modules, clean separation:
  - `src/index.js` — entry point, reads config from script tag
  - `src/discovery.js` — element discovery engine
  - `src/path.js` — human-readable path generation
  - `src/ui.js` — Shadow DOM UI (triggers, popover, counter, toast)
  - `src/storage.js` — output adapters (clipboard, collect, callback, api stub)
  - `src/styles.js` — CSS as JS string (injected into Shadow DOM)
- Build: esbuild (fast, simple) → `dist/reviewdrop.js` + `dist/reviewdrop.min.js`
- Tests: Vitest for unit tests, Playwright for browser integration tests
- `package.json` with `name: "reviewdrop"`, proper exports, bin, files

### Quality Bar

- Works on any HTML page opened from filesystem (file:// protocol)
- Works on any hosted page
- Mobile responsive (touch-friendly triggers, full-width popover on small screens)
- No interference with host page styles or scripts
- Keyboard accessible: Tab to focus triggers, Enter to open, Escape to close
- Light and dark mode support (detect from host page or data-theme attribute)

### Test Pages

Create `examples/` directory with:
- `examples/simple.html` — basic page with headings, paragraphs, images
- `examples/landing-page.html` — copy the KhudSeSikho landing page, add ReviewDrop script
- `examples/dashboard.html` — a mock dashboard with cards, charts, tables

### First Internal Deployment

After building, create a one-line integration guide showing how to add ReviewDrop to:
- `../khudsesikho.com/landing-page.html`
- `../khudsesikho.com/docs/concept-architecture.html`

Just one `<script>` tag before `</body>`.

---

## What NOT to Build Yet

- No SaaS/cloud/API backend (Phase 3)
- No React/Vue components (Phase 2)
- No CLI tool (Phase 2)
- No real-time collaboration (Phase 3)
- No screenshot capture (Phase 2)

## Architecture Notes

- Keep it under 15KB gzipped — every byte counts for a drop-in library
- Shadow DOM is non-negotiable — the #1 promise is zero CSS conflicts
- IntersectionObserver for performance — only process visible elements
- MutationObserver to handle dynamically added content (SPAs, carousels)
- Clean teardown: `ReviewDrop.destroy()` must remove every trace

## Ship Criteria

- [ ] `npm run build` produces `dist/reviewdrop.js` < 15KB gzipped
- [ ] Works on all 3 example pages with zero config
- [ ] Clipboard mode: each comment copies structured text immediately
- [ ] Collect mode: download produces valid Markdown and JSON
- [ ] Zero console errors on host pages
- [ ] Mobile: triggers work on touch, popover is usable
- [ ] `ReviewDrop.destroy()` leaves no traces
- [ ] All unit tests pass
- [ ] README.md with usage, API docs, examples
