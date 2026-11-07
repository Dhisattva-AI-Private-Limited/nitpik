// tests/unit/storage.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStorage } from '../../src/storage.js'
import { createEmitter } from '../../src/events.js'

const makeComment = (overrides = {}) => ({
  selector: 'h1', path: 'Hero > h1: Title', tagName: 'H1',
  textPreview: 'Title', comment: 'Looks good', reviewer: 'Test',
  timestamp: '2026-11-07T10:00:00.000Z', ...overrides
})

describe('clipboard adapter', () => {
  it('copies formatted text to clipboard on submit', async () => {
    document.execCommand = vi.fn(() => true)
    const emitter = createEmitter()
    const storage = createStorage('clipboard', emitter, {})
    storage.submit(makeComment())
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    emitter.emit.length // emitter should have fired 'comment'
  })
})

describe('collect adapter', () => {
  beforeEach(() => { localStorage.clear() })

  it('accumulates comments', () => {
    const emitter = createEmitter()
    const storage = createStorage('collect', emitter, { pageKey: 'test-page' })
    storage.submit(makeComment({ comment: 'First' }))
    storage.submit(makeComment({ comment: 'Second' }))
    expect(storage.getComments()).toHaveLength(2)
    expect(storage.count).toBe(2)
  })

  it('exports valid markdown', () => {
    const emitter = createEmitter()
    const storage = createStorage('collect', emitter, { pageKey: 'test-page' })
    storage.submit(makeComment())
    const md = storage.exportMarkdown()
    expect(md).toContain('Hero > h1: Title')
    expect(md).toContain('Looks good')
  })

  it('exports valid JSON with version field', () => {
    const emitter = createEmitter()
    const storage = createStorage('collect', emitter, { pageKey: 'test-page' })
    storage.submit(makeComment())
    const json = JSON.parse(storage.exportJSON())
    expect(json.version).toBe('1')
    expect(json.comments).toHaveLength(1)
  })

  it('clears comments', () => {
    const emitter = createEmitter()
    const storage = createStorage('collect', emitter, { pageKey: 'test-page' })
    storage.submit(makeComment())
    storage.clear()
    expect(storage.getComments()).toHaveLength(0)
  })
})

describe('callback adapter', () => {
  it('calls window.nitpikOnComment', () => {
    window.nitpikOnComment = vi.fn()
    const emitter = createEmitter()
    const storage = createStorage('callback', emitter, {})
    const data = makeComment()
    storage.submit(data)
    expect(window.nitpikOnComment).toHaveBeenCalledWith(data)
    delete window.nitpikOnComment
  })
})

describe('api adapter', () => {
  it('POSTs to endpoint when configured', () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
    const emitter = createEmitter()
    const storage = createStorage('api', emitter, { endpoint: 'https://api.test/comments', apiKey: 'key123' })
    storage.submit(makeComment())
    expect(global.fetch).toHaveBeenCalledWith('https://api.test/comments', expect.objectContaining({ method: 'POST' }))
  })

  it('warns in console when no endpoint configured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const emitter = createEmitter()
    const storage = createStorage('api', emitter, {})
    storage.submit(makeComment())
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('emitter and factory', () => {
  it('emits comment event for every mode', () => {
    window.nitpikOnComment = vi.fn()
    document.execCommand = vi.fn(() => true)
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
    for (const mode of ['clipboard', 'collect', 'callback', 'api']) {
      const emitter = createEmitter()
      const spy = vi.fn()
      emitter.on('comment', spy)
      createStorage(mode, emitter, { endpoint: 'https://x.test', pageKey: 'emit-' + mode }).submit(makeComment())
      expect(spy).toHaveBeenCalledTimes(1)
    }
    delete window.nitpikOnComment
  })

  it('throws on unknown mode', () => {
    expect(() => createStorage('nope', createEmitter(), {})).toThrow()
  })

  it('sends X-API-Key header', () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
    createStorage('api', createEmitter(), { endpoint: 'https://x.test', apiKey: 'k' }).submit(makeComment())
    expect(global.fetch.mock.calls[0][1].headers['X-API-Key']).toBe('k')
  })
})
