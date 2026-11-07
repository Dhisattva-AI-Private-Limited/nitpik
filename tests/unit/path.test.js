import { describe, it, expect } from 'vitest'
import { generatePath, generateSelector, getTextPreview } from '../../src/path.js'

describe('generatePath', () => {
  it('returns tag + truncated text for simple element', () => {
    const el = document.createElement('h1')
    el.textContent = 'Learn French Like It Is Second Nature'
    document.body.appendChild(el)
    const path = generatePath(el)
    expect(path).toContain('h1')
    expect(path).toContain('Learn French')
    document.body.removeChild(el)
  })

  it('includes section heading as parent context', () => {
    document.body.innerHTML = '<section><h2>Pricing</h2><div class="card"><h3>Pro Plan</h3></div></section>'
    const h3 = document.querySelector('h3')
    const path = generatePath(h3)
    expect(path).toMatch(/Pricing/)
    expect(path).toMatch(/h3/)
    document.body.innerHTML = ''
  })
})

describe('generateSelector', () => {
  it('returns a selector that re-finds the element', () => {
    document.body.innerHTML = '<div><p>First</p><p>Second</p></div>'
    const second = document.querySelectorAll('p')[1]
    const sel = generateSelector(second)
    expect(document.querySelector(sel)).toBe(second)
    document.body.innerHTML = ''
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
