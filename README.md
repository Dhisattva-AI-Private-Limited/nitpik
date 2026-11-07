# ReviewDrop

**Per-element commenting for any HTML page. One `<script>` tag. Zero dependencies.**

## Status

Specification ready — see `PRODUCT-SPEC.md` for the full product vision and `BUILD-PROMPT.md` to start building.

## Quick Concept

```html
<!-- Add this one line to any HTML page -->
<script src="reviewdrop.js"></script>

<!-- That's it. Every element is now commentable on hover. -->
```

## Directory Structure

```
review-drop/
├── README.md              ← This file
├── PRODUCT-SPEC.md        ← Full product specification
├── BUILD-PROMPT.md        ← Paste into a new session to start building
├── src/                   ← (to be built) Library source
├── dist/                  ← (to be built) Built library
└── examples/              ← (to be built) Test pages
```

## Related Projects

- **KhudSeSikho.com** (`../khudsesikho.com/`) — First internal user
- **Universal Waitlist Platform** (`../universal-waitlist-platform/`) — Will handle ReviewDrop's own pre-launch signups
