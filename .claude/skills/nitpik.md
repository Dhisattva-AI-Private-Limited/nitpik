---
name: nitpik
description: Add NitPik per-element commenting to any HTML page
---

# NitPik

NitPik is a zero-dependency script that lets a reviewer hover any element on an HTML page, leave a comment on that exact element, and export the comments as Markdown or JSON.

## Quickest integration

1. Make sure `nitpik.js` is available next to the HTML page. If it is not:
   - From npm: `npm install nitpik`, then copy `node_modules/nitpik/dist/nitpik.js` next to the page.
   - From a checkout of this repo: run `npm run build`, then copy `dist/nitpik.js` next to the page.
2. Add this line immediately before `</body>`:

```html
<script src="nitpik.js"></script>
```

Add `data-*` attributes to the same tag to configure it (see below). With no attributes, NitPik runs in `clipboard` mode.

## Configuration (data attributes on the script tag)

| Attribute | Values / default | Purpose |
|---|---|---|
| `data-mode` | `clipboard` (default), `collect`, `callback`, `api` | Where a submitted comment goes. |
| `data-color` | CSS colour, default `#F59E0B` | Accent colour for triggers and outlines. |
| `data-position` | string | Parsed from the tag but not yet applied by the UI. Do not rely on it. |
| `data-exclude` | CSS selector | Elements matching this selector, and their descendants, are not commentable. |
| `data-include` | CSS selector | Extra elements to make commentable beyond the default set. |
| `data-reviewer` | string | Reviewer name stored with each comment. Falls back to the name saved in `localStorage`. |
| `data-endpoint` | URL | Required for `api` mode. Each comment is POSTed as JSON. |
| `data-api-key` | string | Sent as the `X-API-Key` header in `api` mode. |
| `data-max-elements` | integer, default `200` | Upper bound on how many elements get triggers. |

Mode behaviour:
- `clipboard`: copies the comment to the clipboard.
- `collect`: keeps comments in `localStorage` behind a counter; export them from the panel or with `NitPik.download()`.
- `callback`: calls `window.nitpikOnComment(comment)` for each submitted comment. Define that function before NitPik loads or before a comment is submitted.
- `api`: POSTs each comment to `data-endpoint`.

Example:

```html
<script src="nitpik.js" data-mode="collect" data-color="#2563eb" data-reviewer="Asha"></script>
```

## Programmatic API

`window.NitPik` is available after the script loads.

| Call | Description |
|---|---|
| `NitPik.init(options)` | Start NitPik. Auto-started by the script tag; call manually only if you need custom options. Options use the same names as the data attributes, in camelCase (for example `{ mode: 'collect', maxElements: 300 }`). |
| `NitPik.destroy()` | Remove the UI and stop watching the DOM. |
| `NitPik.getComments()` | Return an array of comments collected so far. |
| `NitPik.exportMarkdown()` | Return all comments as a Markdown string. |
| `NitPik.exportJSON()` | Return all comments as a JSON string. |
| `NitPik.download(format)` | Download comments as a file. `format` is `'md'` (or `'markdown'`) or `'json'`. |
| `NitPik.on(event, fn)` | Subscribe to an event. The emitted event is `'comment'`, with the comment as its argument. |
| `NitPik.off(event, fn)` | Unsubscribe a listener previously added with `on`. |

Example:

```js
NitPik.on('comment', (c) => console.log('New comment', c))
NitPik.download('md')
```

## MCP server (`nitpik-mcp`)

The package ships an MCP server binary, `nitpik-mcp`. It exposes these tools:

- `nitpik_inject` takes `file` and optional `mode`, `color`, `reviewer`. It inserts the script tag before `</body>` and copies `nitpik.js` next to the file. It does nothing if NitPik is already present.
- `nitpik_strip` takes `file`. It removes the NitPik script tag.
- `nitpik_read` takes `file`. It returns the comments saved in the page's `script[data-nitpik-comments]`.
- `nitpik_status` takes `file`. It reports whether NitPik is present and its configuration.

Prefer `nitpik_inject` when the tool is available. Otherwise, insert the script tag by hand as shown above.

## Workflow for adding NitPik to a project

1. Find candidate pages: `find . -name "*.html" -not -path "*/node_modules/*"`.
2. List them for the user and ask which pages to instrument.
3. For each chosen page, run `nitpik_inject` (or insert the tag by hand) and make sure `nitpik.js` sits beside it.
4. Run `nitpik_status` on each page to confirm, then report what changed.
