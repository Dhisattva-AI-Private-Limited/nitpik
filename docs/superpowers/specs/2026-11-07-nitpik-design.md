# NitPik — Design Document

**Product:** NitPik
**Parent Company:** Dhisattva AI Pvt Ltd
**Date:** 2026-11-07
**Status:** Design — builder-checked, awaiting owner approval before build

---

## 1. Intent & Why

Teams vibe-code HTML pages (landing pages, dashboards, architecture docs, reports) faster than
ever. But the feedback loop is still broken: stakeholders screenshot, write "the hero text feels
wrong" in a chat, and the developer guesses which element they mean. This is the gap between
Google Docs (where you comment on the exact word) and the web (where you can't).

**NitPik closes that gap.** One `<script>` tag turns any HTML page into a reviewable document.
Hover any element, click, type your feedback, submit. Each comment is pinned to the exact
element — not a vague "section 3." It works offline, from the filesystem, with zero accounts or
extensions.

**Why now:** Vibe coding has exploded the number of HTML deliverables teams produce. The tooling
for creating pages has leapt ahead; the tooling for reviewing them hasn't. NitPik is the
missing step after vibe coding.

**Business model:** Open-core. The JS library is open-source (MIT) and always free — the top of
the funnel. NitPik Cloud (SaaS) adds persistence, real-time collaboration, dashboards, and
integrations — that's the paid product.

---

## 2. Goals, Non-Goals, Anti-Goals

### Goals
- One script tag, zero config, works on any HTML page (hosted or file://)
- Per-element commenting with human-readable element paths
- < 15KB gzipped, zero dependencies, Shadow DOM encapsulated
- Three local output modes: clipboard (instant), collect (download), callback (custom)
- Marketing site that sells the vision and drives npm installs
- MCP server / Claude Code skill so AI coders can add NitPik in one prompt
- Open-source library on Bachao.AI's public GitHub; paid SaaS in private repo
- Viral organic adoption — the product's simplicity is the growth engine

### Non-Goals
- NOT a design tool (use Figma)
- NOT a bug tracker (use Linear/GitHub Issues)
- NOT a heatmap/analytics tool (use Hotjar)
- NOT handling auth or cloud backend in Phase 1
- NOT building React/Vue components in Phase 1
- NOT building the CLI tool in Phase 1

### Anti-Goals (what would make it fail even if it technically works)
- Requiring any setup beyond one script tag
- Interfering with the host page's styles or scripts
- Looking like a generic AI-generated widget (must feel hand-crafted)
- Making the reviewer create an account to leave feedback
- Being slow — must initialize in < 2 seconds on a complex page

---

## 3. Users

### Developer / Builder (adds the script)
Building HTML with AI/vibe coding. Wants specific, element-level feedback from stakeholders.
Needs: one-line integration, zero build step, easy removal when done.

### Reviewer / Stakeholder (gives feedback)
Non-technical: founder, designer, client, PM, marketing lead. Opens a page in a browser and
wants to point at things and say what's wrong. Needs: zero learning curve, each comment feels
done when submitted.

### AI Coder (adds NitPik via MCP/skill)
Using Claude Code, Cursor, or similar. Says "add review comments to this page" and NitPik is
injected, configured, and ready. The MCP also reads back collected comments so the AI can act
on the feedback.

### Team Lead (SaaS — Phase 3)
Coordinates feedback across multiple reviewers on multiple pages. Needs: dashboard, review
history, assignment, status tracking.

---

## 4. What Gets Built (Phase 1 — Four Deliverables)

### 4.1 The Library (`nitpik.js`)

**Single file, < 15KB gzipped, zero dependencies, ES5-compatible output.**

**Architecture:**
```
src/
├── index.js          — Entry point, reads config from script tag data attributes
├── discovery.js      — Element discovery engine (smart selectors + IntersectionObserver)
├── path.js           — Human-readable element path generation
├── ui.js             — Shadow DOM UI (triggers, popover, counter, toast)
├── storage.js        — Output adapters (clipboard, collect, callback, api stub)
├── events.js         — Event system (on/off/emit)
└── styles.js         — CSS as JS string (injected into Shadow DOM)
```

**Build:** esbuild → `dist/nitpik.js` + `dist/nitpik.min.js` (IIFE bundle)

**Element Discovery:**
Auto-discovers commentable elements via smart selector list:
- All h1-h6 headings
- Images, SVGs > 24px, videos, iframes
- Elements with class containing: card, tile, item, feature, tier, step, hero, cta
- Buttons, anchor tags with visible text
- Form fields, input groups
- Any block element > 100px tall with meaningful text content
- Developer overrides: `data-nitpik` (include) / `data-nitpik-ignore` (exclude)
- Uses IntersectionObserver — only processes visible elements
- MutationObserver for dynamically added content (SPAs, carousels)

**Element Path Generation:**
Human-readable identifiers using nearest section heading, tag, class hints, truncated text:
- `"Hero > h1: Learn French Like It's Second Nature"`
- `"Section: Pricing > Card 2: Guided Friend"`
- `"Footer > Link: Privacy"`

**UI (all inside Shadow DOM — zero CSS conflicts):**
- **Hover trigger:** Small accent-colored comment icon, top-right of element on hover
- **Popover form:** Anchored to element. Contains: element path label, textarea, Submit + Cancel
- **Visual indicators:** Commented elements get subtle dashed outline + count badge
- **Counter badge:** Fixed bottom-right, shows total comments, click to expand list / export
- **Toast:** Brief confirmation after each submit ("Copied — paste in chat!")
- **Responsive:** Touch-friendly triggers on mobile, full-width popover on small screens
- **Keyboard accessible:** Tab to focus triggers, Enter to open, Escape to close

**Output Modes (via `data-mode` on the script tag):**
- `clipboard` (default): Each submit copies `[Element Path]: Comment text` to clipboard + toast
- `collect`: Accumulates in memory, floating "Download Feedback" button → Markdown or JSON
- `callback`: Fires `window.nitpikOnComment({ element, path, comment, timestamp, reviewer })`
- `api`: POSTs to endpoint (Phase 3 SaaS stub — config ready, endpoint not built yet)

**Configuration (all via data attributes — zero JS config needed):**
```html
<!-- Minimal -->
<script src="nitpik.js"></script>

<!-- Customized -->
<script src="nitpik.js"
  data-mode="collect"
  data-color="#F59E0B"
  data-position="top-right"
  data-exclude=".nav, .footer"
  data-include="[data-review]"
  data-reviewer="Shouvik"
></script>
```

**Programmatic API:**
```js
NitPik.init(options)          // Manual init with options object
NitPik.getComments()          // Returns all comments as array
NitPik.exportMarkdown()       // Returns markdown string
NitPik.exportJSON()           // Returns JSON string
NitPik.download('md' | 'json') // Triggers file download
NitPik.destroy()              // Remove all NitPik UI — zero traces
NitPik.on('comment', fn)      // Event listener
NitPik.off('comment', fn)     // Remove listener
NitPik.count                  // Current comment count
```

**Quality Bar:**
- Works on any HTML page from filesystem (file:// protocol)
- Works on any hosted page (http/https)
- Mobile responsive (touch triggers, full-width popover on small screens)
- No interference with host page styles or scripts (Shadow DOM guarantee)
- Keyboard accessible
- `NitPik.destroy()` leaves zero traces
- < 2 second initialization on complex pages
- Zero console errors on host pages

### 4.2 Marketing Site (`index.html`)

**Self-contained HTML file** (per owner's global rules — no CDN, no external fonts, inline
everything, works from filesystem). Saved to project root or `site/` directory.

**Brand Identity — NitPik (NOT Bachao.AI brand):**
- NitPik has its own identity, separate from Bachao.AI
- Accent color: Amber/warm (#F59E0B) — matches the comment trigger icon in the library
- Secondary: Dark slate (#1E293B) for text, light gray (#F8FAFC) backgrounds
- Typography: system font stack (Inter, system-ui, sans-serif)
- Tone: Developer-friendly, slightly playful (matches "nitpik"), professional enough for teams
- Logo: "NitPik" wordmark — clean, no gimmicks
- Icons: sourced from Animotion MCP (per owner's global rules)

**Page Structure:**
1. **Hero** — "Nitpick any page. One script tag." + live demo GIF/animation
2. **The Problem** — "Your stakeholders screenshot and say 'the thing feels wrong'"
3. **How It Works** — 3-step: Add script → Hover any element → Click and comment
4. **Live Demo** — The marketing page itself has NitPik enabled (meta/recursive)
5. **For Vibe Coders** — "You built it with AI. Now get real human feedback."
6. **Output Modes** — Clipboard / Collect / Callback explained visually
7. **One Script Tag** — The code snippet, copy button, npm install command
8. **Open Source** — MIT license, GitHub link, "Free forever for local use"
9. **NitPik Cloud (Coming Soon)** — Tease the SaaS: real-time, dashboard, Slack
10. **Footer** — GitHub, npm, Dhisattva AI Pvt Ltd credit

**Key Design Principles:**
- The page itself runs NitPik (eat your own dogfood / recursive demo)
- Light theme (per owner's global preference)
- No AI-tells: no shields, sparkles, robot heads, decorative circles
- Every icon from Animotion MCP
- Mobile-first responsive

### 4.3 MCP Server + Claude Code Skill

**The killer differentiator:** NitPik is the first review tool that's AI-native.

**MCP Server (`nitpik-mcp`):**
A lightweight MCP server exposing tools that any AI coding assistant can call:

- `nitpik_inject(file_path, options?)` — Adds `<script src="nitpik.js">` to an HTML file
  before `</body>`. Options: mode, color, reviewer, exclude selectors.
- `nitpik_strip(file_path)` — Removes the NitPik script tag cleanly.
- `nitpik_read_comments(file_path)` — If a NitPik collect-mode JSON file exists alongside the
  HTML, reads and returns the comments as structured data.
- `nitpik_status(file_path)` — Checks if NitPik is installed on the file and what mode it's in.

**Claude Code Skill (`nitpik:add-review`):**
A skill file that, when invoked (`/nitpik`), finds HTML files in the current project and offers
to inject NitPik. Workflow:
1. Finds HTML files in the project
2. Asks which file(s) to add NitPik to (or all)
3. Injects the script tag with sensible defaults
4. Reports what was done

**Distribution:**
- MCP server published to npm (`nitpik-mcp`) — installable as `npx nitpik-mcp`
- Skill file included in the library repo under `.claude/skills/nitpik.md`
- README includes one-liner for adding to Claude Code MCP config

### 4.4 Repository Structure (Open-Source)

```
nitpik/
├── README.md                    — The product page (GitHub README IS the launch)
├── LICENSE                      — MIT
├── package.json                 — name: "nitpik", exports, files
├── src/                         — Library source (ES6 modules)
│   ├── index.js
│   ├── discovery.js
│   ├── path.js
│   ├── ui.js
│   ├── storage.js
│   ├── events.js
│   └── styles.js
├── dist/                        — Built output
│   ├── nitpik.js
│   └── nitpik.min.js
├── site/                        — Marketing site
│   └── index.html
├── examples/                    — Test/demo pages
│   ├── simple.html
│   ├── landing-page.html
│   └── dashboard.html
├── mcp/                         — MCP server
│   ├── package.json
│   ├── server.js
│   └── README.md
├── .claude/
│   └── skills/
│       └── nitpik.md            — Claude Code skill
├── tests/
│   ├── unit/                    — Vitest unit tests
│   └── e2e/                     — Playwright browser tests
├── esbuild.config.js            — Build config
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-11-07-nitpik-design.md  — This document
```

---

## 5. Open-Core Split

### Open-Source (MIT, Bachao.AI public GitHub)
- Core library: nitpik.js (all local modes)
- Auto-discovery engine
- Shadow DOM UI
- Programmatic API
- MCP server (inject/strip/read local comments)
- Claude Code skill
- Marketing site (in repo)
- Examples
- CLI tool (Phase 2: inject/strip/serve)

### Paid SaaS — NitPik Cloud (Private Repo, Phase 3)
- Cloud API backend (comments stored server-side)
- Real-time multi-reviewer collaboration (WebSocket)
- Team dashboard (all comments across all pages in a project)
- Comment threading and status (Open / Resolved / Won't Fix)
- Assignment to team members
- Slack/webhook notifications
- Review sessions with deadlines
- SSO, audit log for enterprise
- Advanced MCP (cloud-connected: read team comments, sync resolution status)
- Priority support

**The upsell hook:** The open-source library has an `api` mode with a config stub for the
cloud endpoint. When a solo dev outgrows clipboard mode and wants their team to see comments
in real-time, they add an API key and everything flows to NitPik Cloud. The library IS the
funnel.

### Pricing (tentative, Phase 3)
- **Free:** Open-source library, local modes, unlimited, forever
- **Pro ($9/mo):** Cloud storage, 5 projects, 3 reviewers, history
- **Team ($29/mo):** Unlimited projects, 10 reviewers, Slack/webhook, priority
- **Enterprise:** SSO, audit log, custom domain, SLA

---

## 6. Viral Growth Strategy (Organic, No Paid Push)

### Why It Will Spread
The product demos itself. Every page with NitPik shows every reviewer the tool. Every
reviewer who sees it wants it for their own projects. Zero-cost distribution through usage.
The simplicity IS the growth engine.

### Launch Playbook

**1. The README IS the product page.**
GitHub README with a demo GIF showing: hover → click → comment → clipboard copy in 3 seconds.
This GIF is the #1 discovery vector. It gets embedded in every blog post, tweet, and HN
submission.

**2. Show HN (primary launch channel).**
"Show HN: NitPik — One script tag to turn any HTML page into a reviewable document"
Research shows HN outperforms Product Hunt for dev tools. Authentic, technical, no marketing
speak. Time it for US morning (10am ET Tuesday-Thursday).

**3. The AI angle is the unfair advantage.**
"Hey Claude, add NitPik to this page" as a demo clip. AI coding YouTubers and Twitter/X dev
accounts would amplify this. Nobody else has MCP integration for a review tool. This is the
hook that makes NitPik feel inevitable, not just useful.

**4. r/webdev + r/javascript + Dev.to post.**
"I was tired of stakeholders sending screenshots saying 'the thing feels wrong'" — relatable
problem story, not product marketing.

**5. The recursive marketing page.**
The NitPik marketing site itself runs NitPik. Visitors can leave comments on the marketing
page. This is the most compelling demo possible — the product demos itself while you read
about it.

**6. Internal dogfooding → case study.**
Use NitPik on KhudSeSikho.com, Bachao.AI dashboards, and all Dhisattva pages. Write up the
before/after as a genuine case study.

**7. Product Hunt (secondary, after momentum).**
Launch after HN traction exists. PH works best as an amplifier of existing momentum, not a
cold start.

### SEO Keywords (target in README, marketing site, blog posts)
- "website feedback tool"
- "visual feedback tool open source"
- "website review tool free"
- "HTML page commenting"
- "website annotation tool"
- "client feedback web design"
- "vibe coding feedback"
- "review tool one script tag"

---

## 7. Constraints

- Library must be < 15KB gzipped (every byte counts for adoption)
- Shadow DOM is non-negotiable (zero CSS conflicts is the #1 promise)
- Must work on file:// protocol (offline review is a key differentiator)
- Marketing site must be self-contained HTML (owner's global rules)
- All icons from Animotion MCP (owner's global rules — no AI-tells)
- Light theme default (owner's global rules)
- No Bachao.AI brand on NitPik (separate product identity under Dhisattva AI)
- Git: public repo on Bachao.AI GitHub for open-source; private repo for SaaS

---

## 8. Builder Check Resolutions (2026-11-07)

The following were surfaced by a builder review and resolved. Items marked "owner decided" were
confirmed by the product owner; items marked "builder's call" are the builder's to settle.

### Resolved

1. **Name is NitPik (final).** All identifiers use NitPik: npm package `nitpik`, global
   `NitPik`, attributes `data-nitpik-*`, callback `nitpikOnComment`, MCP `nitpik-mcp`.
   *(Owner decided.)*

2. **MCP `nitpik_read_comments` reads a path argument.** The library's collect-mode download
   uses `<page-basename>.nitpik.json` as the default filename. The MCP tool accepts an explicit
   `json_path` argument — it does not scan Downloads or guess. *(Builder's call.)*

3. **MCP `nitpik_inject` copies `dist/nitpik.js` next to the target HTML file.** This preserves
   the file:// offline promise. The injected tag carries `data-nitpik-injected` for reliable
   detection by `nitpik_strip` and `nitpik_status`. For hosted pages, the MCP may optionally
   use a jsDelivr CDN URL instead — the `--cdn` flag. *(Builder's call.)*

4. **Marketing site inlines the library.** The full minified library is inlined as a `<script>`
   block inside `index.html`, keeping the page self-contained. The page runs in `clipboard`
   mode — visitors try commenting, see the toast, understand how it works. It's a demo, not a
   real review session. *(Builder's call.)*

5. **15KB is a target, not a hard CI gate.** The `dist/nitpik.min.js` file is what counts.
   Modern APIs (IntersectionObserver, ShadowRoot, MutationObserver, Promise) are used directly
   — all available in evergreen browsers. `document.execCommand('copy')` is the fallback for
   `navigator.clipboard.writeText` on `file://` (which lacks a secure context). No IE11
   support. *(Builder's call.)*

6. **Comment data schema:**
   ```json
   {
     "version": "1",
     "comments": [
       {
         "selector": "section.pricing > div:nth-child(2) > h3",
         "path": "Section: Pricing > Card 2: Guided Friend",
         "tagName": "H3",
         "textPreview": "Guided Friend",
         "comment": "This name is confusing",
         "reviewer": "Shouvik",
         "timestamp": "2026-11-07T10:30:00.000Z"
       }
     ]
   }
   ```
   The `selector` is a CSS selector re-findable by `document.querySelector`. The `path` is the
   human-readable label. Markdown export uses the `path` as the heading, `comment` as the body.
   *(Builder's call.)*

7. **API mode is a minimal stub in Phase 1.** Accepts `data-mode="api"`, `data-endpoint`, and
   `data-api-key` attributes. If endpoint is set, POSTs each comment as JSON. If not set, logs
   a console warning. This locks the config shape for Phase 3 without building a backend.
   *(Builder's call.)*

8. **Nested elements: innermost wins.** When commentable elements are nested, the innermost one
   gets the trigger. The trigger's click handler stops propagation. Max ~200 triggers per page
   (skip beyond that). On touch devices, a floating "Review Mode" toggle reveals all triggers
   simultaneously. *(Builder's call.)*

9. **Reviewer identity and persistence.** If `data-reviewer` is set, it's used. If not, the
   first comment prompts for a name and stores it in `localStorage` (best-effort, try/catch).
   In `collect` mode, comments persist in `localStorage` across reloads (keyed by page URL) so
   a refresh doesn't lose work. A "Clear" button in the counter panel resets. *(Builder's call.)*

10. **Repo: Bachao.AI GitHub org, copyright Dhisattva AI Pvt Ltd.** MIT LICENSE names
    "Dhisattva AI Pvt Ltd" as the copyright holder. The repo name is `nitpik`. CI: GitHub
    Actions with build + test + gzip size report. *(Owner confirmed org; builder's call on CI.)*

11. **Animotion icons: sourced but inlined efficiently.** The library's trigger icon is sourced
    from Animotion MCP but inlined as raw SVG path data (just the `d` attribute, ~200 bytes)
    to respect the 15KB budget. The marketing site uses full Animotion SVG icons. Both satisfy
    the Animotion-only rule. *(Builder's call.)*

12. **Keyboard accessibility is Phase 1.** Tab through triggers, Enter to open popover, Escape
    to close. Triggers are real focusable elements (buttons) inside the Shadow DOM. This adds
    complexity but ships inclusive from day one. *(Owner decided.)*

### What's Left to the Builder

- Exact CSS for the Shadow DOM UI (hover triggers, popover, toast, counter badge)
- Which specific Animotion icon(s) to use for the trigger and UI chrome
- esbuild configuration details (target, format, minify options)
- Test strategy (which unit tests, which e2e Playwright scenarios)
- Marketing site copy (structure is defined above; words are the builder's craft)
- NitPik wordmark/logo design for the marketing site
- MCP server transport (stdio for Claude Code, HTTP for broader compatibility, or both)
- Demo GIF for the README (a Phase 1 nice-to-have, not a blocker for the code)
- Handling pages that already have Shadow DOMs (nested Shadow DOM edge case)

---

*This design document is the input for the implementation plan. Approved by the owner before
any code is written.*
