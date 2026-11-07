import { generatePath, generateSelector, getTextPreview } from './path.js'

const DEFAULT_MAX_ELEMENTS = 200
const ITEM_MIN_TEXT = 50
const ITEM_MIN_HEIGHT = 80
const SVG_MIN_WIDTH = 24

const BASE_SELECTORS = [
  'h1,h2,h3,h4,h5,h6',
  'img,video,svg,iframe',
  '[class*="card"],[class*="tile"],[class*="item"],[class*="feature"],[class*="tier"],[class*="step"],[class*="hero"],[class*="cta"]',
  'button',
  'a',
  '[data-nitpik]',
]

function buildSelector(include) {
  return BASE_SELECTORS.concat(include ? [include] : []).join(',')
}

function textOf(el) {
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

function svgWidth(el) {
  const attr = parseFloat(el.getAttribute('width'))
  if (!isNaN(attr)) return attr
  return el.getBoundingClientRect().width
}

function hasSubstantialContent(el) {
  return textOf(el).length > ITEM_MIN_TEXT || el.getBoundingClientRect().height > ITEM_MIN_HEIGHT
}

function isExcluded(el, exclude) {
  if (el.closest('[data-nitpik-ignore]')) return true
  if (exclude) {
    try { if (el.closest(exclude)) return true } catch (e) { /* invalid selector: ignore */ }
  }
  return false
}

function matchesInclude(el, include) {
  if (!include) return false
  try { return el.matches(include) } catch (e) { return false }
}

// Content-quality filters for a candidate that already matched the selector.
function passesContentFilters(el, include) {
  if (el.hasAttribute('data-nitpik') || matchesInclude(el, include)) return true
  const tag = el.tagName.toLowerCase()
  if (tag === 'svg') return svgWidth(el) > SVG_MIN_WIDTH
  if (tag === 'a') return textOf(el).length > 0
  if (/^(h[1-6]|img|video|iframe|button)$/.test(tag)) return true
  // Only class-pattern matches remain; "item" alone is noisy.
  const cls = typeof el.className === 'string' ? el.className : ''
  const otherPattern = /card|tile|feature|tier|step|hero|cta/.test(cls)
  if (!otherPattern && cls.indexOf('item') !== -1) return hasSubstantialContent(el)
  return true
}

function toInfo(el) {
  return {
    element: el,
    path: generatePath(el),
    selector: generateSelector(el),
    textPreview: getTextPreview(el),
    tagName: el.tagName,
  }
}

function collectCandidates(nodes, options, limit) {
  const include = options.include
  const selector = buildSelector(include)
  const seen = new Set()
  const candidates = []
  const consider = (el) => {
    if (seen.has(el)) return
    seen.add(el)
    if (isExcluded(el, options.exclude)) return
    if (!passesContentFilters(el, include)) return
    candidates.push(el)
  }
  nodes.forEach((node) => {
    if (node.nodeType !== 1) return
    if (node.matches(selector)) consider(node)
    node.querySelectorAll(selector).forEach(consider)
  })
  // Document order is not guaranteed across separate roots; sort so ancestors precede descendants.
  if (nodes.length > 1) {
    candidates.sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1))
  }
  // Innermost wins: a candidate followed by its own descendant is an ancestor, so skip it.
  const result = []
  for (let i = 0; i < candidates.length && result.length < limit; i++) {
    const next = candidates[i + 1]
    if (next && candidates[i].contains(next)) continue
    result.push(candidates[i])
  }
  return result
}

export function discoverElements(root, options) {
  const opts = options || {}
  const max = opts.maxElements === undefined ? DEFAULT_MAX_ELEMENTS : opts.maxElements
  const els = collectCandidates([root], opts, max)
  return els.map(toInfo)
}

export function observeDOM(root, callback) {
  const observer = new MutationObserver((mutations) => {
    const added = []
    mutations.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) added.push(n) }))
    if (!added.length) return
    const infos = collectCandidates(added, {}, Infinity).map(toInfo)
    if (infos.length) callback(infos)
  })
  observer.observe(root, { childList: true, subtree: true })
  return () => observer.disconnect()
}

export function createVisibilityObserver(onVisible, onHidden) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) onVisible(entry.target)
      else onHidden(entry.target)
    })
  })
  return {
    observe(el) { io.observe(el) },
    disconnect() { io.disconnect() },
  }
}
