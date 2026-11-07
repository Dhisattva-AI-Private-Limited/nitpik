import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createUI } from '../../src/ui.js'

const mk = (extra = {}) => createUI({ color: '#F59E0B', position: 'top-right', onSubmit: vi.fn(), ...extra })
const root = () => document.querySelector('[data-nitpik-host]').shadowRoot
const info = (el, path = 'h1: Title') => ({ element: el, path, selector: el.tagName.toLowerCase(), textPreview: 'Title', tagName: el.tagName })

describe('createUI', () => {
  let ui
  afterEach(() => {
    ui?.destroy()
    ui = null
    document.body.innerHTML = ''
  })

  it('mounts a shadow DOM container on body', () => {
    ui = mk(); ui.mount()
    const host = document.querySelector('[data-nitpik-host]')
    expect(host).not.toBeNull()
    expect(host.shadowRoot).not.toBeNull()
  })

  it('destroy removes all traces', () => {
    ui = mk(); ui.mount(); ui.destroy()
    expect(document.querySelector('[data-nitpik-host]')).toBeNull()
  })

  it('addTriggers creates focusable buttons for elements', () => {
    document.body.innerHTML = '<h1>Title</h1>'
    ui = mk(); ui.mount()
    ui.addTriggers([info(document.querySelector('h1'))])
    const buttons = root().querySelectorAll('button[data-nitpik-trigger]')
    expect(buttons.length).toBe(1)
    expect(buttons[0].getAttribute('tabindex')).toBe('0')
    expect(buttons[0].getAttribute('aria-label')).toBe('Comment on h1: Title')
  })

  it('removeTriggers clears triggers', () => {
    document.body.innerHTML = '<h1>Title</h1>'
    ui = mk(); ui.mount()
    ui.addTriggers([info(document.querySelector('h1'))])
    ui.removeTriggers()
    expect(root().querySelectorAll('[data-nitpik-trigger]').length).toBe(0)
  })

  it('shows counter badge with correct count', () => {
    ui = mk(); ui.mount(); ui.showCounter(3)
    expect(root().querySelector('[data-nitpik-counter]').textContent).toContain('3')
  })

  it('truncates long path labels in popover at ~80 chars', () => {
    const longPath = 'Section: ' + 'A'.repeat(200) + ' > h3: ' + 'B'.repeat(100)
    document.body.innerHTML = '<h3>Test</h3>'
    ui = mk(); ui.mount()
    ui.addTriggers([info(document.querySelector('h3'), longPath)])
    root().querySelector('button[data-nitpik-trigger]').click()
    const label = root().querySelector('[data-nitpik-path]')
    expect(label.textContent.length).toBeLessThanOrEqual(83)
    expect(label.textContent.endsWith('...')).toBe(true)
  })

  it('submit calls onSubmit with comment data and marks element commented', () => {
    document.body.innerHTML = '<h1>Title</h1>'
    const onSubmit = vi.fn()
    ui = mk({ onSubmit, reviewer: 'Sam' }); ui.mount()
    const h1 = document.querySelector('h1')
    ui.addTriggers([info(h1)])
    root().querySelector('[data-nitpik-trigger]').click()
    root().querySelector('textarea').value = 'Fix this'
    root().querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const d = onSubmit.mock.calls[0][0]
    expect(d).toMatchObject({ selector: 'h1', path: 'h1: Title', tagName: 'H1', textPreview: 'Title', comment: 'Fix this', reviewer: 'Sam' })
    expect(typeof d.timestamp).toBe('string')
    expect(d.element).toBeUndefined()
    expect(h1.hasAttribute('data-nitpik-commented')).toBe(true)
    expect(root().querySelector('[data-nitpik-popover]')).toBeNull()
  })

  it('empty comment is not submitted', () => {
    document.body.innerHTML = '<h1>Title</h1>'
    const onSubmit = vi.fn()
    ui = mk({ onSubmit }); ui.mount()
    ui.addTriggers([info(document.querySelector('h1'))])
    root().querySelector('[data-nitpik-trigger]').click()
    root().querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Escape closes popover and Cancel closes popover', () => {
    document.body.innerHTML = '<h1>Title</h1>'
    ui = mk(); ui.mount()
    ui.addTriggers([info(document.querySelector('h1'))])
    const trig = root().querySelector('[data-nitpik-trigger]')
    trig.click()
    expect(root().querySelector('[data-nitpik-popover]')).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(root().querySelector('[data-nitpik-popover]')).toBeNull()
    trig.click()
    root().querySelector('[data-nitpik-cancel]').click()
    expect(root().querySelector('[data-nitpik-popover]')).toBeNull()
  })

  it('setReviewMode toggles visible class on triggers', () => {
    document.body.innerHTML = '<h1>Title</h1>'
    ui = mk(); ui.mount()
    ui.addTriggers([info(document.querySelector('h1'))])
    ui.setReviewMode(true)
    expect(root().querySelector('[data-nitpik-trigger]').classList.contains('visible')).toBe(true)
    ui.setReviewMode(false)
    expect(root().querySelector('[data-nitpik-trigger]').classList.contains('visible')).toBe(false)
  })

  it('showToast adds toast that auto-dismisses after 2s', () => {
    vi.useFakeTimers()
    ui = mk(); ui.mount(); ui.showToast('Saved')
    expect(root().querySelector('[data-nitpik-toast]').textContent).toBe('Saved')
    vi.advanceTimersByTime(2100)
    expect(root().querySelector('[data-nitpik-toast]')).toBeNull()
    vi.useRealTimers()
  })

  it('counter click expands panel; export buttons call onExport', () => {
    ui = mk(); ui.mount()
    ui.onExport = vi.fn()
    ui.showCounter(1, [{ path: 'h1: Title', comment: 'x'.repeat(200), selector: 'h1' }])
    root().querySelector('[data-nitpik-counter]').click()
    const panel = root().querySelector('[data-nitpik-panel]')
    expect(panel).not.toBeNull()
    expect(panel.textContent).toContain('h1: Title')
    const btns = [...panel.querySelectorAll('button')]
    const by = (t) => btns.find((b) => b.textContent === t)
    by('Export MD').click(); by('Export JSON').click(); by('Clear').click()
    expect(ui.onExport.mock.calls.map((c) => c[0])).toEqual(['md', 'json', 'clear'])
  })

  it('destroy removes document listeners and observers safely', () => {
    ui = mk(); ui.mount(); ui.destroy()
    expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))).not.toThrow()
  })
})
