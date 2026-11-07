import { describe, it, expect, afterEach, vi } from 'vitest'
import { buildTree, isComponentBoundary, observeDOM } from '../../src/discovery.js'

describe('isComponentBoundary', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('accepts semantic sections', () => {
    for (const tag of ['section', 'article', 'aside', 'nav', 'header', 'footer', 'main']) {
      const el = document.createElement(tag)
      expect(isComponentBoundary(el)).toBe(true)
    }
  })

  it('accepts headings h1-h6', () => {
    for (let i = 1; i <= 6; i++) {
      const el = document.createElement(`h${i}`)
      expect(isComponentBoundary(el)).toBe(true)
    }
  })

  it('accepts img, video, iframe', () => {
    for (const tag of ['img', 'video', 'iframe']) {
      expect(isComponentBoundary(document.createElement(tag))).toBe(true)
    }
  })

  it('accepts svg with width > 24, rejects small svg', () => {
    const big = document.createElement('svg')
    big.setAttribute('width', '48')
    expect(isComponentBoundary(big)).toBe(true)
    const small = document.createElement('svg')
    small.setAttribute('width', '16')
    expect(isComponentBoundary(small)).toBe(false)
  })

  it('accepts SVG created via createElementNS (real browser path)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '48')
    expect(isComponentBoundary(svg)).toBe(true)
  })

  it('accepts button', () => {
    expect(isComponentBoundary(document.createElement('button'))).toBe(true)
  })

  it('accepts anchor with text, rejects empty anchor', () => {
    const a = document.createElement('a')
    a.textContent = 'Link'
    expect(isComponentBoundary(a)).toBe(true)
    expect(isComponentBoundary(document.createElement('a'))).toBe(false)
  })

  it('accepts card-class div with substantial content', () => {
    const el = document.createElement('div')
    el.className = 'pricing-card'
    el.textContent = 'x'.repeat(60)
    expect(isComponentBoundary(el)).toBe(true)
  })

  it('rejects card-class div without substantial content', () => {
    const el = document.createElement('div')
    el.className = 'card'
    el.textContent = 'short'
    expect(isComponentBoundary(el)).toBe(false)
  })

  it('accepts li with substantial content inside ul', () => {
    document.body.innerHTML = `<ul><li>${'x'.repeat(60)}</li></ul>`
    const li = document.querySelector('li')
    expect(isComponentBoundary(li)).toBe(true)
  })

  it('rejects short li', () => {
    document.body.innerHTML = '<ul><li>Home</li></ul>'
    expect(isComponentBoundary(document.querySelector('li'))).toBe(false)
  })

  it('accepts data-nitpik elements', () => {
    const el = document.createElement('span')
    el.setAttribute('data-nitpik', '')
    expect(isComponentBoundary(el)).toBe(true)
  })

  it('accepts include-matched elements', () => {
    const el = document.createElement('p')
    el.className = 'special'
    expect(isComponentBoundary(el, { include: '.special' })).toBe(true)
  })

  it('rejects inline wrappers', () => {
    for (const tag of ['span', 'em', 'strong', 'code', 'small', 'sub', 'sup', 'mark']) {
      expect(isComponentBoundary(document.createElement(tag))).toBe(false)
    }
  })

  it('rejects pass-through div (no class/id/data, one child)', () => {
    const div = document.createElement('div')
    div.appendChild(document.createElement('p'))
    expect(isComponentBoundary(div)).toBe(false)
  })

  it('rejects data-nitpik-host', () => {
    const el = document.createElement('div')
    el.setAttribute('data-nitpik-host', '')
    expect(isComponentBoundary(el)).toBe(false)
  })
})

describe('buildTree', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('finds flat headings as root-level nodes', () => {
    document.body.innerHTML = '<h1>A</h1><h2>B</h2>'
    const { roots, nodeMap } = buildTree(document.body)
    expect(roots).toHaveLength(2)
    expect(roots[0].depth).toBe(0)
    expect(roots[1].depth).toBe(0)
    expect(roots[0].parent).toBeNull()
    expect(nodeMap.size).toBe(2)
  })

  it('builds parent-child for section with heading', () => {
    document.body.innerHTML = '<section><h2>S</h2></section>'
    const { roots } = buildTree(document.body)
    expect(roots).toHaveLength(1)
    expect(roots[0].element.tagName).toBe('SECTION')
    expect(roots[0].depth).toBe(0)
    expect(roots[0].children).toHaveLength(1)
    expect(roots[0].children[0].element.tagName).toBe('H2')
    expect(roots[0].children[0].depth).toBe(1)
    expect(roots[0].children[0].parent).toBe(roots[0])
  })

  it('nests card inside section', () => {
    document.body.innerHTML = `<section><div class="card">${'x'.repeat(60)}</div></section>`
    const { roots } = buildTree(document.body)
    const section = roots[0]
    expect(section.children).toHaveLength(1)
    expect(section.children[0].element.className).toBe('card')
    expect(section.children[0].parent).toBe(section)
  })

  it('skips non-boundary wrapper divs', () => {
    document.body.innerHTML = '<div><div><h1>X</h1></div></div>'
    const { roots } = buildTree(document.body)
    expect(roots).toHaveLength(1)
    expect(roots[0].element.tagName).toBe('H1')
    expect(roots[0].depth).toBe(0)
  })

  it('handles deeply nested with correct tree depth (Review Focus #1)', () => {
    document.body.innerHTML = '<section><div><div><article><div><h3>Deep</h3></div></article></div></div></section>'
    const { roots } = buildTree(document.body)
    const section = roots[0]
    expect(section.depth).toBe(0)
    const article = section.children[0]
    expect(article.element.tagName).toBe('ARTICLE')
    expect(article.depth).toBe(1)
    expect(article.parent).toBe(section)
    const h3 = article.children[0]
    expect(h3.element.tagName).toBe('H3')
    expect(h3.depth).toBe(2)
    expect(h3.parent).toBe(article)
  })

  it('skips data-nitpik-ignore and its subtree', () => {
    document.body.innerHTML = '<h1>Keep</h1><div data-nitpik-ignore><h2>Skip</h2></div>'
    const { roots, nodeMap } = buildTree(document.body)
    expect(roots).toHaveLength(1)
    expect(roots[0].element.tagName).toBe('H1')
    expect(nodeMap.size).toBe(1)
  })

  it('respects exclude option and skips subtree', () => {
    document.body.innerHTML = '<nav><h3>Nav</h3></nav><h3>Main</h3>'
    const { roots } = buildTree(document.body, { exclude: 'nav' })
    expect(roots).toHaveLength(1)
    expect(roots[0].info.textPreview).toContain('Main')
  })

  it('respects include option', () => {
    document.body.innerHTML = '<p class="special">para</p>'
    const { roots } = buildTree(document.body, { include: '.special' })
    expect(roots).toHaveLength(1)
  })

  it('caps at maxElements', () => {
    document.body.innerHTML = Array.from({ length: 300 }, (_, i) => `<h3>H${i}</h3>`).join('')
    const { nodeMap } = buildTree(document.body, { maxElements: 5 })
    expect(nodeMap.size).toBe(5)
  })

  it('returns correct ElementInfo shape', () => {
    document.body.innerHTML = '<h1>Hello World</h1>'
    const { roots } = buildTree(document.body)
    const info = roots[0].info
    expect(info).toHaveProperty('element')
    expect(info).toHaveProperty('path')
    expect(info).toHaveProperty('selector')
    expect(info).toHaveProperty('textPreview')
    expect(info).toHaveProperty('tagName', 'H1')
  })

  it('nodeMap keys are HTMLElements', () => {
    document.body.innerHTML = '<section><h2>A</h2></section>'
    const { nodeMap } = buildTree(document.body)
    for (const [key, val] of nodeMap) {
      expect(key).toBeInstanceOf(HTMLElement)
      expect(val.element).toBe(key)
    }
  })
})

describe('buildTree path generation', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('root-level heading gets simple path', () => {
    document.body.innerHTML = '<h1>Hello World</h1>'
    const { roots } = buildTree(document.body)
    expect(roots[0].info.path).toBe('h1: Hello World')
  })

  it('heading inside section gets section heading prefix', () => {
    document.body.innerHTML = '<section><h2>Pricing</h2><h3>Pro Plan</h3></section>'
    const { roots } = buildTree(document.body)
    const h3 = roots[0].children.find(c => c.element.tagName === 'H3')
    expect(h3.info.path).toMatch(/Section: Pricing/)
    expect(h3.info.path).toMatch(/h3: Pro Plan/)
  })

  it('deeply nested gets full ancestor chain', () => {
    document.body.innerHTML = `<section><h2>Features</h2><div class="card">${'x'.repeat(60)}<h3>Fast</h3></div></section>`
    const { roots } = buildTree(document.body)
    const section = roots[0]
    const card = section.children.find(c => c.element.className === 'card')
    const h3 = card.children[0]
    expect(h3.info.path).toContain('Section: Features')
    expect(h3.info.path).toContain('h3: Fast')
  })
})

describe('observeDOM', () => {
  afterEach(() => { document.body.innerHTML = '' })
  const tick = () => new Promise(r => setTimeout(r, 20))

  it('reports newly added boundary elements with correct tree position (Review Focus #3)', async () => {
    document.body.innerHTML = '<section><h2>S</h2></section>'
    const { nodeMap } = buildTree(document.body)
    const cb = vi.fn()
    const stop = observeDOM(document.body, nodeMap, cb)
    const h3 = document.createElement('h3')
    h3.textContent = 'New'
    document.querySelector('section').appendChild(h3)
    await tick()
    expect(cb).toHaveBeenCalledTimes(1)
    const newNodes = cb.mock.calls[0][0]
    expect(newNodes).toHaveLength(1)
    expect(newNodes[0].element).toBe(h3)
    const sectionNode = nodeMap.get(document.querySelector('section'))
    expect(newNodes[0].parent).toBe(sectionNode)
    stop()
  })

  it('skips detached nodes', async () => {
    const { nodeMap } = buildTree(document.body)
    const cb = vi.fn()
    const stop = observeDOM(document.body, nodeMap, cb)
    const h = document.createElement('h2')
    h.textContent = 'gone'
    document.body.appendChild(h)
    h.remove()
    await tick()
    expect(cb).not.toHaveBeenCalled()
    stop()
  })

  it('enforces maxElements', async () => {
    const { nodeMap } = buildTree(document.body)
    const cb = vi.fn()
    const stop = observeDOM(document.body, nodeMap, cb, { maxElements: 2 })
    document.body.innerHTML = '<h2>a</h2><h2>b</h2><h2>c</h2>'
    await tick()
    expect(cb.mock.calls[0][0].length).toBeLessThanOrEqual(2)
    stop()
  })

  it('cleans up nodeMap when elements are removed', async () => {
    document.body.innerHTML = '<section><h2>Keep</h2><h3>Remove</h3></section>'
    const { nodeMap } = buildTree(document.body)
    const h3 = document.querySelector('h3')
    expect(nodeMap.has(h3)).toBe(true)
    const section = document.querySelector('section')
    const sectionNode = nodeMap.get(section)
    expect(sectionNode.children).toHaveLength(2)
    const cb = vi.fn()
    const stop = observeDOM(document.body, nodeMap, cb)
    h3.remove()
    await tick()
    expect(nodeMap.has(h3)).toBe(false)
    expect(sectionNode.children).toHaveLength(1)
    stop()
  })

  it('tears down on stop', async () => {
    const { nodeMap } = buildTree(document.body)
    const cb = vi.fn()
    const stop = observeDOM(document.body, nodeMap, cb)
    stop()
    document.body.appendChild(document.createElement('h2'))
    await tick()
    expect(cb).not.toHaveBeenCalled()
  })
})
