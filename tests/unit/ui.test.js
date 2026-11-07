import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createUI } from '../../src/ui.js'
import { buildTree } from '../../src/discovery.js'

function q(root, sel) { return root.querySelector(sel) }
function sr() { return document.querySelector('[data-nitpik-host]').shadowRoot }
function hover(el) { el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })) }

describe('createUI', () => {
  let ui
  afterEach(() => { ui?.destroy(); document.body.innerHTML = '' })

  it('mounts a shadow DOM container on body', () => {
    ui = createUI(); ui.mount()
    const host = document.querySelector('[data-nitpik-host]')
    expect(host).not.toBeNull()
    expect(host.shadowRoot).not.toBeNull()
  })

  it('destroy removes all traces including highlight', () => {
    ui = createUI(); ui.mount()
    document.body.innerHTML = '<h1>X</h1>'
    ui.setTree(buildTree(document.body).nodeMap)
    ui.destroy()
    expect(document.querySelector('[data-nitpik-host]')).toBeNull()
  })
})

describe('setTree and hover', () => {
  let ui, nodeMap
  beforeEach(() => {
    document.body.innerHTML = '<section><h2>Title</h2></section><h3>Other</h3>'
    nodeMap = buildTree(document.body).nodeMap
    ui = createUI({ color: '#F59E0B', onSubmit: vi.fn() })
    ui.mount()
    ui.setTree(nodeMap)
  })
  afterEach(() => { ui?.destroy(); document.body.innerHTML = '' })

  it('creates a shared trigger button and a highlight div', () => {
    expect(q(sr(), '[data-nitpik-trigger]')).toBeTruthy()
    expect(q(sr(), '[data-nitpik-highlight]')).toBeTruthy()
  })

  it('clearTree hides trigger and highlight', () => {
    ui.clearTree()
    expect(q(sr(), '[data-nitpik-trigger]').style.opacity).toBe('0')
    expect(q(sr(), '[data-nitpik-highlight]').style.display).toBe('none')
  })

  it('mousemove on element in nodeMap shows trigger', () => {
    hover(document.querySelector('section'))
    expect(q(sr(), '[data-nitpik-trigger]')).toBeTruthy()
  })

  it('mousemove on non-boundary child activates nearest ancestor (Review Focus #2)', () => {
    // Destroy and rebuild with different DOM
    ui.destroy()
    document.body.innerHTML = `<section><div class="card">${'x'.repeat(60)}<p>inner</p></div></section>`
    const nm = buildTree(document.body).nodeMap
    ui = createUI({ color: '#F59E0B', onSubmit: vi.fn() })
    ui.mount()
    ui.setTree(nm)
    hover(document.querySelector('p'))
    expect(q(sr(), '[data-nitpik-trigger]').style.opacity).toBe('1')
  })

  it('trigger has correct aria-label after hover', () => {
    hover(document.querySelector('section'))
    expect(q(sr(), '[data-nitpik-trigger]').getAttribute('aria-label')).toContain('Comment on')
  })
})

describe('highlight', () => {
  let ui
  afterEach(() => { ui?.destroy(); document.body.innerHTML = '' })

  it('highlight div exists after setTree', () => {
    document.body.innerHTML = '<h1>Test</h1>'
    ui = createUI(); ui.mount()
    ui.setTree(buildTree(document.body).nodeMap)
    expect(q(sr(), '[data-nitpik-highlight]')).toBeTruthy()
  })

  it('highlight removed on destroy', () => {
    document.body.innerHTML = '<h1>Test</h1>'
    ui = createUI(); ui.mount()
    ui.setTree(buildTree(document.body).nodeMap)
    ui.destroy()
    expect(document.querySelector('[data-nitpik-host]')).toBeNull()
  })
})

describe('popover', () => {
  let ui, submitFn
  beforeEach(() => {
    document.body.innerHTML = '<h1>Hello World</h1>'
    submitFn = vi.fn()
    ui = createUI({ color: '#F59E0B', onSubmit: submitFn, reviewer: 'Tester' })
    ui.mount()
    ui.setTree(buildTree(document.body).nodeMap)
  })
  afterEach(() => { ui?.destroy(); document.body.innerHTML = '' })

  it('clicking trigger opens popover', () => {
    hover(document.querySelector('h1'))
    q(sr(), '[data-nitpik-trigger]').click()
    expect(q(sr(), '[data-nitpik-popover]')).toBeTruthy()
  })

  it('submit calls onSubmit with comment data and marks element', () => {
    const h1 = document.querySelector('h1')
    hover(h1)
    q(sr(), '[data-nitpik-trigger]').click()
    q(sr(), 'textarea').value = 'Fix this'
    q(sr(), 'form').dispatchEvent(new Event('submit', { cancelable: true }))
    expect(submitFn).toHaveBeenCalledTimes(1)
    const d = submitFn.mock.calls[0][0]
    expect(d).toMatchObject({ comment: 'Fix this', reviewer: 'Tester' })
    expect(d).toHaveProperty('selector')
    expect(d).toHaveProperty('path')
    expect(d).toHaveProperty('tagName')
    expect(d).toHaveProperty('textPreview')
    expect(typeof d.timestamp).toBe('string')
    expect(h1.hasAttribute('data-nitpik-commented')).toBe(true)
    expect(q(sr(), '[data-nitpik-popover]')).toBeNull()
  })

  it('Escape closes popover', () => {
    hover(document.querySelector('h1'))
    q(sr(), '[data-nitpik-trigger]').click()
    expect(q(sr(), '[data-nitpik-popover]')).toBeTruthy()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(q(sr(), '[data-nitpik-popover]')).toBeNull()
  })

  it('Cancel button closes popover', () => {
    hover(document.querySelector('h1'))
    q(sr(), '[data-nitpik-trigger]').click()
    q(sr(), '[data-nitpik-cancel]').click()
    expect(q(sr(), '[data-nitpik-popover]')).toBeNull()
  })

  it('empty comment not submitted', () => {
    hover(document.querySelector('h1'))
    q(sr(), '[data-nitpik-trigger]').click()
    q(sr(), 'form').dispatchEvent(new Event('submit', { cancelable: true }))
    expect(submitFn).not.toHaveBeenCalled()
  })
})

describe('counter, panel, toast', () => {
  let ui
  afterEach(() => { ui?.destroy(); document.body.innerHTML = '' })

  it('showCounter creates counter button', () => {
    ui = createUI(); ui.mount()
    ui.showCounter(3, [])
    expect(q(sr(), '[data-nitpik-counter]').textContent).toContain('3')
  })

  it('counter click toggles panel with export buttons', () => {
    ui = createUI(); ui.mount()
    ui.onExport = vi.fn()
    ui.showCounter(1, [{ path: 'h1: Title', comment: 'test', selector: 'h1' }])
    q(sr(), '[data-nitpik-counter]').click()
    const panel = q(sr(), '[data-nitpik-panel]')
    expect(panel).toBeTruthy()
    const btns = [...panel.querySelectorAll('button')]
    const by = (t) => btns.find((b) => b.textContent === t)
    by('Export MD').click(); by('Export JSON').click(); by('Clear').click()
    expect(ui.onExport.mock.calls.map(c => c[0])).toEqual(['md', 'json', 'clear'])
  })

  it('showToast renders a toast', () => {
    ui = createUI(); ui.mount()
    ui.showToast('Saved!')
    expect(q(sr(), '[data-nitpik-toast]').textContent).toBe('Saved!')
  })

  it('toast auto-dismisses after 2s', () => {
    vi.useFakeTimers()
    ui = createUI(); ui.mount()
    ui.showToast('Saved')
    expect(q(sr(), '[data-nitpik-toast]')).toBeTruthy()
    vi.advanceTimersByTime(2100)
    expect(q(sr(), '[data-nitpik-toast]')).toBeNull()
    vi.useRealTimers()
  })
})

describe('setReviewMode', () => {
  let ui
  afterEach(() => { ui?.destroy(); document.body.innerHTML = '' })

  it('when true trigger has visible class', () => {
    document.body.innerHTML = '<h1>Test</h1>'
    ui = createUI(); ui.mount()
    ui.setTree(buildTree(document.body).nodeMap)
    ui.setReviewMode(true)
    expect(q(sr(), '[data-nitpik-trigger]').classList.contains('visible')).toBe(true)
  })

  it('when false trigger loses visible class', () => {
    document.body.innerHTML = '<h1>Test</h1>'
    ui = createUI(); ui.mount()
    ui.setTree(buildTree(document.body).nodeMap)
    ui.setReviewMode(true)
    ui.setReviewMode(false)
    expect(q(sr(), '[data-nitpik-trigger]').classList.contains('visible')).toBe(false)
  })
})
