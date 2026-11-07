import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import {
  injectHtml, stripHtml, extractComments, getStatus,
  injectFile, stripFile, readCommentsFile, statusFile,
} from './server.js'

describe('injectHtml', () => {
  it('inserts before </body> with attributes', () => {
    const r = injectHtml('<html><body><h1>Hi</h1></body></html>', { src: '../dist/nitpik.js', mode: 'collect', color: '#f00', reviewer: 'Sam' })
    expect(r.changed).toBe(true)
    expect(r.html).toContain('<script src="../dist/nitpik.js" data-mode="collect" data-color="#f00" data-reviewer="Sam"></script></body>')
    expect(r.attributes).toEqual({ mode: 'collect', color: '#f00', reviewer: 'Sam' })
  })
  it('falls back to </html> then append', () => {
    expect(injectHtml('<html><p>x</p></html>', { src: 'n.js' }).html).toMatch(/<script src="n.js"><\/script><\/html>$/)
    expect(injectHtml('<p>x</p>', { src: 'n.js' }).html).toMatch(/<p>x<\/p>\n<script src="n.js"><\/script>$/)
  })
  it('does not double-inject', () => {
    const once = injectHtml('<body></body>', { src: 'nitpik.js' }).html
    const twice = injectHtml(once, { src: 'nitpik.js' })
    expect(twice.changed).toBe(false)
    expect(twice.html.match(/nitpik\.js/g)).toHaveLength(1)
  })
  it('escapes attribute values', () => {
    const r = injectHtml('<body></body>', { src: 'n.js', reviewer: 'a"b<c' })
    expect(r.html).toContain('data-reviewer="a&quot;b&lt;c"')
  })
})

describe('stripHtml', () => {
  it('removes nitpik script tags only', () => {
    const html = '<body><script src="x/nitpik.min.js" data-mode="collect"></script><script src="app.js"></script></body>'
    const r = stripHtml(html)
    expect(r.removed).toBe(1)
    expect(r.html).toBe('<body><script src="app.js"></script></body>')
  })
  it('reports none found', () => {
    expect(stripHtml('<body></body>').removed).toBe(0)
  })
})

describe('extractComments', () => {
  it('parses embedded JSON', () => {
    const html = '<body><script type="application/json" data-nitpik-comments>[{"comment":"fix"}]</script></body>'
    expect(extractComments(html)).toEqual([{ comment: 'fix' }])
  })
  it('returns null when missing', () => {
    expect(extractComments('<body></body>')).toBeNull()
  })
  it('throws on invalid JSON', () => {
    expect(() => extractComments('<script type="application/json" data-nitpik-comments>{bad</script>')).toThrow()
  })
})

describe('getStatus', () => {
  it('reports config', () => {
    const s = getStatus('<script src="nitpik.js" data-mode="clipboard" data-color="#abc"></script>')
    expect(s).toMatchObject({ installed: true, src: 'nitpik.js', mode: 'clipboard', color: '#abc' })
  })
  it('reports absent', () => {
    expect(getStatus('<body></body>').installed).toBe(false)
  })
})

describe('file handlers', () => {
  const TMP = join(import.meta.dirname, '.tmp-test')
  beforeEach(() => mkdirSync(TMP, { recursive: true }))
  afterEach(() => rmSync(TMP, { recursive: true, force: true }))

  it('inject -> status -> strip round trip with relative src', () => {
    const file = join(TMP, 'page.html')
    writeFileSync(file, '<html><body></body></html>')
    const msg = injectFile(file, { mode: 'collect' })
    expect(msg).toContain('mode=collect')
    expect(readFileSync(file, 'utf-8')).toContain('src="../../dist/nitpik.js"')
    expect(statusFile(file)).toContain('present')
    expect(stripFile(file)).toContain('Removed')
    expect(stripFile(file)).toContain('no NitPik script found')
  })
  it('reads comments as JSON or reports none', () => {
    const file = join(TMP, 'c.html')
    writeFileSync(file, '<script type="application/json" data-nitpik-comments>[1]</script>')
    expect(JSON.parse(readCommentsFile(file))).toEqual([1])
    writeFileSync(file, '<body></body>')
    expect(readCommentsFile(file)).toBe('no comments found')
  })
})
