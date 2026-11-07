import { describe, it, expect, afterEach } from 'vitest'
import { generateTreePath, generateSelector, getTextPreview } from '../../src/path.js'
import { buildTree } from '../../src/discovery.js'

describe('generateTreePath', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('returns tag + preview for a root node with no parent', () => {
    document.body.innerHTML = '<h1>Hello World</h1>'
    const { roots } = buildTree(document.body)
    expect(generateTreePath(roots[0])).toBe('h1: Hello World')
  })

  it('includes section heading prefix for section parent', () => {
    document.body.innerHTML = '<section><h2>Pricing</h2><h3>Pro Plan</h3></section>'
    const { roots } = buildTree(document.body)
    const h3 = roots[0].children.find(c => c.element.tagName === 'H3')
    const path = generateTreePath(h3)
    expect(path).toContain('Section: Pricing')
    expect(path).toContain('h3: Pro Plan')
  })

  it('builds full ancestor chain for deeply nested nodes', () => {
    document.body.innerHTML = `<section><h2>Features</h2><div class="card">${'x'.repeat(60)}<h3>Fast</h3></div></section>`
    const { roots } = buildTree(document.body)
    const card = roots[0].children.find(c => c.element.className === 'card')
    const h3 = card.children[0]
    const path = generateTreePath(h3)
    expect(path).toContain('Section: Features')
    expect(path).toContain('h3: Fast')
  })

  it('uses just the tag when node has no text', () => {
    document.body.innerHTML = '<img src="test.png">'
    const { roots } = buildTree(document.body)
    expect(generateTreePath(roots[0])).toBe('img')
  })

  it('truncates preview at 40 chars', () => {
    document.body.innerHTML = `<h1>${'A'.repeat(60)}</h1>`
    const { roots } = buildTree(document.body)
    const path = generateTreePath(roots[0])
    const preview = path.split(': ')[1]
    expect(preview.length).toBeLessThanOrEqual(43)
  })
})

describe('generateSelector', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('returns a selector that re-finds the element', () => {
    document.body.innerHTML = '<div><p>First</p><p>Second</p></div>'
    const second = document.querySelectorAll('p')[1]
    const sel = generateSelector(second)
    expect(document.querySelector(sel)).toBe(second)
  })
})

describe('getTextPreview', () => {
  it('truncates at maxLen', () => {
    const el = document.createElement('p')
    el.textContent = 'A'.repeat(100)
    expect(getTextPreview(el, 50).length).toBeLessThanOrEqual(53)
  })

  it('returns empty string for no text', () => {
    const el = document.createElement('img')
    expect(getTextPreview(el)).toBe('')
  })
})
