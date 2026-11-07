# ReviewDrop — Product Specification

**Project:** ReviewDrop  
**Parent Company:** Dhisattva AI Pvt Ltd  
**Status:** Specification — Ready for Development  
**Date:** 2026-11-07  
**First Internal Client:** KhudSeSikho.com (landing page + architecture doc review)

---

## 1. Vision & Purpose

A tiny, zero-dependency JavaScript library that turns any HTML page into a reviewable document.
Drop one `<script>` tag — every element becomes commentable on hover. Each comment submits
individually (clipboard, download, or API) for incremental feedback workflows.

**Think:** Figma comments meets browser DevTools — but for non-technical stakeholders reviewing
any web page, locally or hosted.

**Business model: Open-core.** The JS library is open-source (MIT) and always free — install
from npm, self-host, use offline, forever. The managed SaaS (ReviewDrop Cloud) adds cloud
persistence, real-time team collaboration, dashboards, Slack/webhook integrations, and is the
paid product. Users choose based on budget and comfort: solo devs and OSS projects use the
library; teams and agencies pay for the hosted version. The open-source library IS the top of
the funnel — every user who outgrows clipboard mode is a potential cloud customer.

**Why this exists:** Every time a developer builds an HTML page (landing page, report, dashboard,
email template) and shares it for review, the feedback loop is broken. Stakeholders screenshot,
write "the hero text feels wrong" in a chat, and the developer has to guess which element they
mean. ReviewDrop makes the feedback loop as tight as commenting in a Google Doc — but for any
HTML file, even one opened from the filesystem.

---

## 2. Core Concept

### How It Works (User Perspective)

1. Developer adds `<script src="reviewdrop.js"></script>` (or a `<script>` CDN tag) to any page
2. Page renders normally — but now every major element shows a small comment icon on hover
3. Reviewer clicks the icon → a small popover form appears anchored to that element
4. Reviewer types their comment and hits **Submit**
5. The comment is immediately:
   - **Local mode:** Copied to clipboard as structured text (element + comment), ready to paste into a chat/issue
   - **File mode:** Accumulated and downloadable as a JSON/Markdown file
   - **API mode (SaaS):** Sent to ReviewDrop cloud, visible to the whole team in real-time
6. The element gets a visual indicator showing it has been commented on
7. A floating counter badge shows total comments and offers "Export All" / "Download"

### What Makes It Different

- **Per-element, not per-section.** Comments anchor to the exact element (h1, card, button, image), not a vague "section 3"
- **Incremental submission.** Each comment goes out immediately — no "fill everything then export." The reviewer can paste one comment, the developer fixes it, reviewer moves on
- **Works offline.** No server needed for local file review. Open an HTML from disk, review it, export feedback
- **Zero config default.** The script auto-discovers commentable elements (headings, cards, images, buttons, links, any block with enough content). No `data-*` attributes needed unless you want to customize
- **Non-destructive.** All ReviewDrop UI lives in a Shadow DOM — zero CSS conflicts with the host page. Removing the script tag removes everything

---

## 3. User Personas

### 3.1 Developer / Builder (Adds the script)
- Building HTML pages, dashboards, reports, landing pages, email templates
- Wants fast, specific feedback from stakeholders
- Needs: one-line integration, no build step, easy removal when done

### 3.2 Reviewer / Stakeholder (Gives feedback)
- Non-technical: founder, designer, client, PM, marketing lead
- Opens the page in a browser and wants to point at things and say what's wrong
- Needs: zero learning curve, works like "click and type," each comment feels done when submitted

### 3.3 Team Lead (SaaS — manages reviews)
- Coordinates feedback across multiple reviewers on multiple pages
- Needs: dashboard, review history, assignment, status tracking

---

## 4. Features — Phased Roadmap

### Phase 1: Open-Source JS Library (Build First — Use Internally)

**Core Library (`reviewdrop.js`)**
- Single file, < 15KB gzipped, zero dependencies, ES5 compatible
- Shadow DOM encapsulation (no CSS conflicts)
- Auto-discovery of commentable elements via smart selector list:
  - All headings (h1-h6)
  - All images, SVGs > 24px, videos, iframes
  - Cards / tiles (elements with class containing `card`, `tile`, `item`, `feature`)
  - Buttons, links with visible text, CTAs
  - Form fields, input groups
  - Any block element > 100px tall with text content
  - Developer can override with `data-reviewdrop` attribute (include) or `data-reviewdrop-ignore` (exclude)
- **Hover trigger:** Small amber comment icon appears top-right of any commentable element on hover
- **Click → Popover form:** Anchored to the element, contains:
  - Element identifier (auto-generated: "Hero > h1", "Section: Pricing > Card 2", etc.)
  - Textarea for the comment
  - Submit button + Cancel
- **Visual indicators:**
  - Commented elements get a subtle dashed outline
  - Comment count badge on each commented element
  - Floating counter (bottom-right): "3 comments" with expand/collapse for quick list

**Output Modes (configurable via `data-mode` attribute on the script tag):**
- `clipboard` (default): Each submit copies `[Element Path]: Comment text` to clipboard + shows toast "Copied — paste in chat!"
- `collect`: Accumulates all comments in memory, floating "Download Feedback" button exports as:
  - Markdown (default): structured with element paths and comments
  - JSON: machine-readable with element selectors, text content preview, comment, timestamp
- `callback`: Fires a JS callback (`window.reviewDropOnComment(data)`) for custom integrations
- `api`: POSTs each comment to a configurable endpoint (Phase 3 SaaS)

**Configuration (all via `data-*` attributes on the `<script>` tag — zero JS config needed):**
```html
<!-- Minimal (auto-discover, clipboard mode) -->
<script src="reviewdrop.js"></script>

<!-- Customized -->
<script src="reviewdrop.js"
  data-mode="collect"
  data-color="#F59E0B"
  data-position="top-right"
  data-exclude=".nav, .footer"
  data-include="[data-review]"
  data-reviewer="Shouvik"
></script>
```

**Programmatic API (optional, for developers who want control):**
```js
ReviewDrop.init({ mode: 'collect', color: '#F59E0B' });
ReviewDrop.getComments();        // Returns all comments as array
ReviewDrop.exportMarkdown();     // Returns markdown string
ReviewDrop.exportJSON();         // Returns JSON string
ReviewDrop.download('md');       // Triggers file download
ReviewDrop.destroy();            // Remove all ReviewDrop UI
ReviewDrop.on('comment', fn);   // Event listener
```

**Element Path Generation:**
The library generates human-readable element identifiers:
- `Hero > Heading: "Learn French Like It's Second Nature"`
- `Section: Pricing > Card 2: "Guided Friend"`
- `Footer > Link: "Privacy"`
- Uses section headings, aria labels, text content, class names, and DOM position

### Phase 2: Enhanced Library + CLI

**Smart Features:**
- **Question prompts:** Developer can add `data-reviewdrop-question="What do you think of this pricing?"` to any element — the popover shows the question above the textarea
- **Category tags:** Reviewer can tag comments (Content, Design, Bug, Question) via quick pills
- **Screenshot capture:** Option to capture element screenshot with the comment (canvas-based, no server)
- **Keyboard nav:** Tab through commentable elements, Enter to comment, Escape to cancel
- **Dark mode support:** Adapts to host page's color scheme
- **Multiple reviewers:** `data-reviewer` attribute, comments tagged per reviewer, different highlight colors

**CLI Tool (`npx reviewdrop`):**
- `npx reviewdrop serve ./page.html` — Opens page in browser with ReviewDrop injected
- `npx reviewdrop inject ./page.html` — Adds the script tag to the file
- `npx reviewdrop strip ./page.html` — Removes the script tag cleanly
- `npx reviewdrop export ./feedback.json --format md` — Convert between formats

**Framework Integrations:**
- React: `<ReviewDrop />` wrapper component
- Vue: `v-reviewdrop` directive
- Vite/Webpack plugin: auto-inject in dev mode, auto-strip in production

### Phase 3: ReviewDrop Cloud (SaaS — Commercialize)

**Hosted Reviews:**
- Developer gets a project, adds the script with an API key
- Comments go to ReviewDrop cloud in real-time
- Dashboard shows all comments across all pages in a project
- Threaded replies on comments
- Comment status: Open / Resolved / Won't Fix
- Assignment: assign a comment to a team member
- Notification: email/Slack when new comment arrives

**Collaboration:**
- Share review link (page URL + ReviewDrop overlay)
- Multiple concurrent reviewers with distinct colors
- Real-time presence (see who's reviewing)
- Review sessions with deadlines

**Pricing (tentative):**
- **Free:** Open-source library, local modes only, unlimited
- **Pro ($9/mo):** Cloud storage, 5 projects, 3 reviewers, history
- **Team ($29/mo):** Unlimited projects, 10 reviewers, Slack/webhook, priority
- **Enterprise:** SSO, audit log, custom domain, SLA

**Integration with Universal Waitlist Platform:**
- ReviewDrop Cloud dashboard uses the Universal Waitlist Platform for its own pre-launch signups
- Cross-sell: ReviewDrop users discover Dhisattva's other tools

---

## 5. Technical Architecture

### Library (Phase 1)
```
reviewdrop.js (single file, < 15KB gzip)
├── Shadow DOM container (all UI encapsulated)
│   ├── Hover triggers (positioned absolutely on commentable elements)
│   ├── Comment popover (anchored to active element)
│   ├── Toast notifications
│   └── Counter badge (fixed bottom-right)
├── Element discovery engine
│   ├── Smart selector matching
│   ├── Path generation (human-readable)
│   └── Intersection Observer (only process visible elements)
├── Storage adapter (pluggable)
│   ├── ClipboardAdapter (default)
│   ├── CollectAdapter (in-memory + download)
│   ├── CallbackAdapter (custom JS function)
│   └── APIAdapter (Phase 3)
└── Event system (on/off/emit)
```

### Build
- Source: ES6+ modules
- Build: Rollup or esbuild → single IIFE bundle
- Target: ES5 (IE11 not required, but wide browser support)
- Tests: Vitest + Playwright for real browser testing
- CI: GitHub Actions
- Package: npm (`reviewdrop`) + CDN (jsDelivr)

### SaaS Backend (Phase 3)
- API: Node.js (Fastify) or Python (FastAPI)
- Database: PostgreSQL (comments, projects, users)
- Real-time: WebSocket for live collaboration
- Auth: JWT + OAuth (GitHub, Google)
- Hosting: Railway / Render / AWS

---

## 6. Internal Use — First Deployments

| Page | Mode | Priority |
|------|------|----------|
| KhudSeSikho landing page | clipboard + collect | P0 — first user |
| KhudSeSikho architecture doc | clipboard + collect | P0 |
| Bachao.AI reports & dashboards | collect | P1 |
| TokenTrim admin UI | collect | P1 |
| All Dhisattva product pages | collect | P2 |

---

## 7. Success Metrics

### Phase 1 (Library)
- < 15KB gzipped
- Works on any HTML page with zero config
- < 2 second initialization on a complex page
- Used successfully on 5+ internal Dhisattva pages
- Published to npm

### Phase 3 (SaaS)
- 500 npm downloads/week within 3 months of launch
- 50 cloud users within 3 months
- < 200ms comment submission latency

---

## 8. Non-Goals (Explicit)

- NOT a full design tool (use Figma for that)
- NOT a bug tracker (use Linear/GitHub Issues)
- NOT a heatmap/analytics tool (use Hotjar for that)
- NOT a screen recording tool
- NOT handling authentication in Phase 1 (local-only)
- NOT a CMS or content editor — comments are feedback, not edits

---

## 9. Competitive Landscape

| Tool | What It Does | Why ReviewDrop Is Different |
|------|-------------|---------------------------|
| Figma Comments | Comments on design files | ReviewDrop works on live HTML, not design files |
| Pastel | Screenshot + annotate websites | ReviewDrop is per-element, not screenshot-based; works offline |
| Markup.io | Visual feedback on websites | Requires account + browser extension; ReviewDrop is a script tag |
| BugHerd | Bug reporting overlay | Enterprise-priced, heavy; ReviewDrop is lightweight + open-source |
| Userback | Visual feedback widget | Focused on end-user feedback, not stakeholder review |

**ReviewDrop's moat:** It's the only tool that is (a) a single script tag, (b) works offline from filesystem, (c) per-element not screenshot, (d) open-source core, (e) incremental submission.

---

## 10. Open Questions

1. **Name:** "ReviewDrop" is a working title. Alternatives: AnnotateJS, PagePulse, InlineReview, HoverNote, MarkIt
2. **License:** MIT for the library? Keep SaaS proprietary?
3. **npm scope:** `reviewdrop` or `@dhisattva/reviewdrop`?
4. **Should the library support non-HTML?** (PDFs rendered in browser, canvas-based apps)
5. **Accessibility:** Full keyboard nav in Phase 1 or Phase 2?

---

*This spec is the starting point. Open a session in this directory to begin Phase 1 implementation.*
