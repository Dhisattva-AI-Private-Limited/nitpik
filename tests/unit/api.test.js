import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import api, { parseScriptConfig, __internals } from '../../src/index.js'

const root = () => document.querySelector('[data-nitpik-host]').shadowRoot

describe('NitPik public API', () => {
  beforeEach(() => {
    document.body.innerHTML = '<h1>Test Page</h1><p>Some content here</p>'
    try { localStorage.clear() } catch (e) { /* ignore */ }
  })
  afterEach(() => {
    api.destroy()
    document.body.innerHTML = ''
  })

  it('does not expose test hooks on the public object', () => {
    expect(Object.keys(api).filter((k) => k.startsWith('_'))).toEqual([])
  })

  it('exposes the public methods', () => {
    for (const k of ['init', 'destroy', 'getComments', 'exportMarkdown', 'exportJSON', 'download', 'on', 'off']) {
      expect(typeof api[k]).toBe('function')
    }
  })

  it('init mounts host and destroy removes it', () => {
    api.init({ mode: 'collect' })
    expect(document.querySelector('[data-nitpik-host]')).not.toBeNull()
    api.destroy()
    expect(document.querySelector('[data-nitpik-host]')).toBeNull()
  })

  it('warns on double init', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    api.init({ mode: 'collect' })
    api.init({ mode: 'collect' })
    expect(warn).toHaveBeenCalled()
    expect(document.querySelectorAll('[data-nitpik-host]').length).toBe(1)
    warn.mockRestore()
  })

  it('getComments is empty before init and after init', () => {
    expect(api.getComments()).toEqual([])
    api.init({ mode: 'collect' })
    expect(api.getComments()).toEqual([])
    expect(api.count).toBe(0)
  })

  it('submitting a comment stores it, toasts, updates counter, emits event', () => {
    api.init({ mode: 'collect', reviewer: 'Asha' })
    const fn = vi.fn()
    api.on('comment', fn)
    __internals.submit({ selector: 'h1', path: 'h1: Test', tagName: 'H1', textPreview: 'Test', comment: 'fix', reviewer: 'Asha', timestamp: 't' })
    expect(api.getComments().length).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(root().querySelector('[data-nitpik-toast]').textContent).toBe('Comment saved')
    expect(root().querySelector('[data-nitpik-counter]').textContent).toContain('1')
    expect(localStorage.getItem('nitpik:reviewer')).toBe('Asha')
    expect(JSON.parse(api.exportJSON()).comments.length).toBe(1)
    expect(api.exportMarkdown()).toContain('fix')
  })

  it('off removes a listener', () => {
    api.init({ mode: 'collect' })
    const fn = vi.fn()
    api.on('comment', fn)
    api.off('comment', fn)
    __internals.submit({ comment: 'x' })
    expect(fn).not.toHaveBeenCalled()
  })

  it('export wiring: clear empties collected comments', () => {
    api.init({ mode: 'collect' })
    __internals.submit({ comment: 'x' })
    __internals.exportAction('clear')
    expect(api.getComments()).toEqual([])
  })
})

describe('parseScriptConfig', () => {
  it('reads data-* attributes', () => {
    const s = document.createElement('script')
    s.setAttribute('data-mode', 'collect')
    s.setAttribute('data-color', '#111')
    s.setAttribute('data-position', 'top-left')
    s.setAttribute('data-exclude', '.x')
    s.setAttribute('data-include', 'main')
    s.setAttribute('data-reviewer', 'Bo')
    s.setAttribute('data-endpoint', '/e')
    s.setAttribute('data-api-key', 'k')
    s.setAttribute('data-max-elements', '50')
    expect(parseScriptConfig(s)).toEqual({
      mode: 'collect', color: '#111', position: 'top-left', exclude: '.x', include: 'main',
      reviewer: 'Bo', endpoint: '/e', apiKey: 'k', maxElements: 50,
    })
  })
  it('returns {} for no script', () => {
    expect(parseScriptConfig(null)).toEqual({})
  })
})

describe('export wiring', () => {
  it('md/json call storage download', () => {
    document.body.innerHTML = '<h1>x</h1>'
    api.init({ mode: 'collect' })
    URL.createObjectURL = URL.createObjectURL || (() => 'blob:x')
    URL.revokeObjectURL = URL.revokeObjectURL || (() => {})
    const clicks = []
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () { clicks.push(this.download) }
    __internals.exportAction('md'); __internals.exportAction('json')
    HTMLAnchorElement.prototype.click = orig
    api.destroy()
    expect(clicks).toEqual(['nitpik-comments.md', 'nitpik-comments.json'])
  })
})
