# NitPik

**Nitpick any page. One script tag.**

[![npm version](https://img.shields.io/npm/v/nitpik)](https://www.npmjs.com/package/nitpik)
[![gzip size](https://img.shields.io/bundlephobia/minzip/nitpik)](https://bundlephobia.com/package/nitpik)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Demo](docs/demo.gif)

NitPik turns any HTML page into a reviewable document. Reviewers hover an element, leave a comment on that exact element, and you get the comments back as Markdown or JSON.

## Quick Start

```html
<script src="nitpik.js"></script>
```

Place it before `</body>`. Copy `nitpik.js` from `dist/` (or `node_modules/nitpik/dist/`) next to your page.

## How It Works

- **Hover** any heading, image, paragraph, or card to reveal a comment trigger.
- **Click** the trigger to open a comment box tied to that element's stable path.
- **Comment** and add your reviewer name.
- **Submit** to send the comment to the output mode you configured.

## Features

- **Shadow DOM isolation.** NitPik's UI lives in a Shadow DOM, so its styles stay separate from your page's.
- **Auto-discovery.** Commentable elements are found automatically and kept in sync as the DOM changes.
- **Four output modes.** Clipboard, collect (local storage with export), callback, and API.
- **Keyboard accessible.** Triggers are focusable, and `Escape` closes the comment box.
- **Offline by design.** No dependencies and no network calls unless you configure an API endpoint.

## Output Modes

```html
<!-- clipboard (default): copies each comment to the clipboard -->
<script src="nitpik.js"></script>

<!-- collect: keeps comments behind a counter; export as Markdown or JSON -->
<script src="nitpik.js" data-mode="collect"></script>

<!-- callback: calls your function for every comment -->
<script>
  window.nitpikOnComment = (comment) => console.log(comment)
</script>
<script src="nitpik.js" data-mode="callback"></script>

<!-- api: POSTs each comment as JSON -->
<script src="nitpik.js" data-mode="api" data-endpoint="https://example.com/comments"></script>
```

## Configuration

Set these as data attributes on the `<script>` tag.

| Attribute | Default | Description |
|---|---|---|
| `data-mode` | `clipboard` | Output mode: `clipboard`, `collect`, `callback`, or `api`. |
| `data-color` | `#F59E0B` | Accent colour for triggers and outlines. |
| `data-position` | | Reserved. Parsed but not yet applied by the UI. |
| `data-exclude` | | CSS selector for elements (and their descendants) that should not be commentable. |
| `data-include` | | CSS selector for extra elements to make commentable. |
| `data-reviewer` | | Reviewer name stored with each comment. Falls back to the last name entered. |
| `data-endpoint` | | Endpoint URL for `api` mode. |
| `data-api-key` | | Sent as the `X-API-Key` header in `api` mode. |
| `data-max-elements` | `200` | Maximum number of elements that get triggers. |

## Programmatic API

`window.NitPik` is available once the script loads.

| Method | Description |
|---|---|
| `NitPik.init(options)` | Start NitPik with options (camelCase versions of the data attributes). Runs automatically from the script tag. |
| `NitPik.destroy()` | Remove the UI and stop observing the DOM. |
| `NitPik.getComments()` | Return the comments collected so far. |
| `NitPik.exportMarkdown()` | Return the comments as a Markdown string. |
| `NitPik.exportJSON()` | Return the comments as a JSON string. |
| `NitPik.download(format)` | Download comments as `'md'` or `'json'`. |
| `NitPik.on(event, fn)` | Subscribe to an event. The event is `'comment'`. |
| `NitPik.off(event, fn)` | Remove a listener added with `on`. |

```js
NitPik.on('comment', (comment) => sendToTracker(comment))
NitPik.download('md')
```

## MCP Server

NitPik ships an MCP server, `nitpik-mcp`, so AI coding assistants can add NitPik to your pages and read the comments back.

Tools:

- `nitpik_inject`: add the script tag to an HTML file and copy `nitpik.js` beside it.
- `nitpik_strip`: remove the script tag.
- `nitpik_read`: read the comments saved in a page.
- `nitpik_status`: check whether NitPik is present and how it is configured.

Register the server with your assistant as a stdio command: `npx nitpik-mcp`.

For AI coding assistants, the repo includes a skill at `.claude/skills/nitpik.md` that walks through adding NitPik to a project.

## NitPik Cloud (Coming Soon)

NitPik Cloud will host review pages and collect comments from every reviewer in one place. The library stays open source.

## Development

```bash
npm install          # install dependencies
npm run build        # build dist/nitpik.js and dist/nitpik.min.js
npm test             # unit tests (vitest)
npm run test:e2e     # end-to-end tests (playwright)
```

## Contributing

Issues and pull requests are welcome. Run `npm test` and `npm run test:e2e` before opening a pull request.

## License

MIT. See [LICENSE](LICENSE). Copyright 2026 Dhisattva AI Pvt Ltd.
