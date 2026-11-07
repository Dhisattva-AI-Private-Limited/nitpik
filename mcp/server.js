#!/usr/bin/env node
import { readFileSync, writeFileSync, copyFileSync, existsSync, realpathSync } from 'fs'
import { dirname, resolve, join } from 'path'
import { fileURLToPath } from 'url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(HERE, '..', 'dist')
const DEFAULT_SRC = 'nitpik.js'

const NITPIK_SCRIPT_RE = /<script\b[^>]*\bdata-nitpik-injected\b[^>]*>\s*<\/script\s*>/gi
const COMMENTS_RE = /<script\b[^>]*\bdata-nitpik-comments\b[^>]*>([\s\S]*?)<\/script\s*>/i
const ATTRS = ['mode', 'color', 'reviewer']

const escapeAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const unescapeAttr = (v) => v.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
const findNitPikTag = (html) => (html.match(NITPIK_SCRIPT_RE) || [])[0] || null
const readAttr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))
  return m ? unescapeAttr(m[1] ?? m[2]) : null
}

// ---- Pure functions (string in, string out) ----

export function injectHtml(html, { src, mode, color, reviewer }) {
  if (findNitPikTag(html)) return { html, changed: false, attributes: {} }
  const values = { mode, color, reviewer }
  const attributes = {}
  let attrs = ''
  for (const k of ATTRS) {
    if (values[k]) { attributes[k] = values[k]; attrs += ` data-${k}="${escapeAttr(values[k])}"` }
  }
  const tag = `<script src="${escapeAttr(src)}" data-nitpik-injected${attrs}></script>`
  const at = (re) => { const i = html.search(re); return i }
  let out
  const body = at(/<\/body\s*>/i)
  const root = at(/<\/html\s*>/i)
  if (body !== -1) out = html.slice(0, body) + tag + html.slice(body)
  else if (root !== -1) out = html.slice(0, root) + tag + html.slice(root)
  else out = html + '\n' + tag
  return { html: out, changed: true, attributes }
}

export function stripHtml(html) {
  const removed = (html.match(NITPIK_SCRIPT_RE) || []).length
  return { html: removed ? html.replace(NITPIK_SCRIPT_RE, '') : html, removed }
}

export function extractComments(html) {
  const m = html.match(COMMENTS_RE)
  if (!m || !m[1].trim()) return null
  return JSON.parse(m[1])
}

export function getStatus(html) {
  const tag = findNitPikTag(html)
  if (!tag) return { installed: false }
  return { installed: true, src: readAttr(tag, 'src'), mode: readAttr(tag, 'data-mode'), color: readAttr(tag, 'data-color'), reviewer: readAttr(tag, 'data-reviewer') }
}

// ---- File handlers (fs wrappers returning message text) ----

export function injectFile(file, opts = {}, distDir = DIST_DIR) {
  const path = resolve(file)
  const html = readFileSync(path, 'utf-8')
  if (findNitPikTag(html)) return `NitPik is already present in ${path}; nothing changed.`
  const built = ['nitpik.min.js', 'nitpik.js'].map((f) => join(distDir, f)).find(existsSync)
  if (!built) throw new Error(`NitPik build not found in ${distDir}. Run \`npm run build\` first.`)
  const r = injectHtml(html, { ...opts, src: DEFAULT_SRC })
  copyFileSync(built, join(dirname(path), DEFAULT_SRC))
  writeFileSync(path, r.html)
  const desc = Object.entries(r.attributes).map(([k, v]) => `${k}=${v}`).join(', ') || 'defaults'
  return `Injected NitPik into ${path} (copied ${built} to ${DEFAULT_SRC}; ${desc}).`
}

export function stripFile(file) {
  const path = resolve(file)
  const r = stripHtml(readFileSync(path, 'utf-8'))
  if (!r.removed) return `no NitPik script found in ${path}`
  writeFileSync(path, r.html)
  return `Removed ${r.removed} NitPik script tag(s) from ${path}.`
}

export function readCommentsFile(file, commentsFile) {
  if (commentsFile) {
    const path = resolve(commentsFile)
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    return JSON.stringify(data, null, 2)
  }
  const c = extractComments(readFileSync(resolve(file), 'utf-8'))
  return c === null ? 'no comments found' : JSON.stringify(c, null, 2)
}

export function statusFile(file) {
  const path = resolve(file)
  const s = getStatus(readFileSync(path, 'utf-8'))
  if (!s.installed) return `NitPik script not present in ${path}.`
  const cfg = ['mode', 'color', 'reviewer'].filter((k) => s[k]).map((k) => `${k}=${s[k]}`).join(', ') || 'default config'
  return `NitPik script present in ${path} (src=${s.src}; ${cfg}).`
}

// ---- MCP wiring ----

const fileProp = { file: { type: 'string', description: 'Path to the HTML file' } }
export const TOOLS = [
  {
    name: 'nitpik_inject',
    description: 'Inject the NitPik script tag into an HTML file',
    inputSchema: {
      type: 'object',
      properties: {
        ...fileProp,
        mode: { type: 'string', description: 'NitPik mode, e.g. collect or clipboard' },
        color: { type: 'string', description: 'Accent colour' },
        reviewer: { type: 'string', description: 'Reviewer name' },
      },
      required: ['file'],
    },
    run: (a) => injectFile(a.file, a),
  },
  { name: 'nitpik_strip', description: 'Remove the NitPik script tag from an HTML file', inputSchema: { type: 'object', properties: fileProp, required: ['file'] }, run: (a) => stripFile(a.file) },
  {
    name: 'nitpik_read',
    description: 'Read NitPik review comments. Mode 1: pass commentsFile (path to a .json file, e.g. the one downloaded by collect mode) and its contents are returned. Mode 2: pass only file (HTML) to read comments embedded in script[data-nitpik-comments], if present.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'Path to the HTML file (used for the embedded-comments fallback)' },
        commentsFile: { type: 'string', description: 'Path to a .json comments file produced by collect mode download; takes precedence over file' },
      },
    },
    run: (a) => {
      if (!a.commentsFile && !a.file) throw new Error('Provide commentsFile (JSON) or file (HTML)')
      return readCommentsFile(a.file, a.commentsFile)
    },
  },
  { name: 'nitpik_status', description: 'Check whether NitPik is present in an HTML file and its config', inputSchema: { type: 'object', properties: fileProp, required: ['file'] }, run: (a) => statusFile(a.file) },
]

export async function main() {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js')
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js')
  const { ListToolsRequestSchema, CallToolRequestSchema } = await import('@modelcontextprotocol/sdk/types.js')

  const server = new Server({ name: 'nitpik-mcp', version: '0.1.0' }, { capabilities: { tools: {} } })
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }))
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = TOOLS.find((t) => t.name === req.params.name)
    if (!tool) return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${req.params.name}` }] }
    try {
      return { content: [{ type: 'text', text: tool.run(req.params.arguments || {}) }] }
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: `Error: ${e.message}` }] }
    }
  })
  await server.connect(new StdioServerTransport())
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) main().catch((e) => { console.error(e); process.exit(1) })
