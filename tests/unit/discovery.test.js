import { describe, it, expect, afterEach, vi } from 'vitest'
import { discoverElements, observeDOM, createVisibilityObserver } from '../../src/discovery.js'

describe('discoverElements', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('finds all h1-h6 elements', () => {
    document.body.innerHTML = '<h1>Title</h1><h2>Sub</h2><p>text</p>'
    const tags = discoverElements(document.body, {}).map(r => r.tagName)
    expect(tags).toContain('H1')
    expect(tags).toContain('H2')
  })

  it('finds elements with card/hero/cta class', () => {
    document.body.innerHTML = '<div class="pricing-card">Content here that is long enough</div>'
    const results = discoverElements(document.body, {})
    expect(results.some(r => r.element.classList.contains('pricing-card'))).toBe(true)
  })

  it('respects data-nitpik-ignore', () => {
    document.body.innerHTML = '<h1 data-nitpik-ignore>Skip</h1><h2>Keep</h2>'
    const results = discoverElements(document.body, {})
    expect(results.some(r => r.tagName === 'H1')).toBe(false)
    expect(results.some(r => r.tagName === 'H2')).toBe(true)
  })

  it('excludes children of data-nitpik-ignore', () => {
    document.body.innerHTML = '<div data-nitpik-ignore><h2>Inner</h2></div><h3>Keep</h3>'
    const results = discoverElements(document.body, {})
    expect(results.map(r => r.tagName)).toEqual(['H3'])
  })

  it('includes data-nitpik elements', () => {
    document.body.innerHTML = '<span data-nitpik>Custom</span>'
    const results = discoverElements(document.body, {})
    expect(results.some(r => r.element.hasAttribute('data-nitpik'))).toBe(true)
  })

  it('respects exclude option', () => {
    document.body.innerHTML = '<nav><h3>Nav</h3></nav><h3>Main</h3>'
    const results = discoverElements(document.body, { exclude: 'nav' })
    expect(results.length).toBe(1)
    expect(results[0].textPreview).toContain('Main')
  })

  it('caps at maxElements', () => {
    document.body.innerHTML = Array.from({ length: 300 }, (_, i) => `<h3>H${i}</h3>`).join('')
    expect(discoverElements(document.body, { maxElements: 200 }).length).toBeLessThanOrEqual(200)
    expect(discoverElements(document.body, {}).length).toBe(200)
    expect(discoverElements(document.body, { maxElements: 5 }).length).toBe(5)
  })

  it('returns correct ElementInfo shape', () => {
    document.body.innerHTML = '<h1>Hello World</h1>'
    const [info] = discoverElements(document.body, {})
    expect(info).toHaveProperty('element')
    expect(info).toHaveProperty('path')
    expect(info).toHaveProperty('selector')
    expect(info).toHaveProperty('textPreview')
    expect(info).toHaveProperty('tagName', 'H1')
  })

  it('keeps only the innermost element when nested', () => {
    document.body.innerHTML = '<div class="hero"><h1>Title</h1></div>'
    const results = discoverElements(document.body, {})
    expect(results.map(r => r.tagName)).toEqual(['H1'])
  })

  it('filters noisy item-class elements without substantial content', () => {
    document.body.innerHTML = '<li class="menu-item">Home</li>'
    expect(discoverElements(document.body, {})).toHaveLength(0)
    document.body.innerHTML = `<li class="menu-item">${'x'.repeat(60)}</li>`
    expect(discoverElements(document.body, {})).toHaveLength(1)
  })

  it('finds buttons and links with text, skips empty links', () => {
    document.body.innerHTML = '<button>Go</button><a href="#">Link</a><a href="#"></a>'
    expect(discoverElements(document.body, {}).map(r => r.tagName)).toEqual(['BUTTON', 'A'])
  })

  it('finds images', () => {
    document.body.innerHTML = '<img src="a.png"><iframe></iframe>'
    expect(discoverElements(document.body, {}).map(r => r.tagName)).toEqual(['IMG', 'IFRAME'])
  })

  it('supports include option as extra selector', () => {
    document.body.innerHTML = '<p class="x">para</p>'
    expect(discoverElements(document.body, { include: '.x' })).toHaveLength(1)
  })
})

describe('observeDOM', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('reports newly added matching elements and tears down', async () => {
    const cb = vi.fn()
    const stop = observeDOM(document.body, cb)
    const h = document.createElement('h2')
    h.textContent = 'New'
    document.body.appendChild(h)
    await new Promise(r => setTimeout(r, 20))
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0][0].element).toBe(h)
    stop()
    document.body.appendChild(document.createElement('h3'))
    await new Promise(r => setTimeout(r, 20))
    expect(cb).toHaveBeenCalledTimes(1)
  })
})

describe('createVisibilityObserver', () => {
  it('fires onVisible/onHidden from IntersectionObserver entries', () => {
    let handler
    const observe = vi.fn(), disconnect = vi.fn()
    const Original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class { constructor(cb) { handler = cb } observe = observe; disconnect = disconnect; unobserve() {} }
    const onVisible = vi.fn(), onHidden = vi.fn()
    const vo = createVisibilityObserver(onVisible, onHidden)
    const a = document.createElement('div'), b = document.createElement('div')
    vo.observe(a)
    expect(observe).toHaveBeenCalledWith(a)
    handler([{ target: a, isIntersecting: true }, { target: b, isIntersecting: false }])
    expect(onVisible).toHaveBeenCalledWith(a)
    expect(onHidden).toHaveBeenCalledWith(b)
    vo.disconnect()
    expect(disconnect).toHaveBeenCalled()
    globalThis.IntersectionObserver = Original
  })
})
