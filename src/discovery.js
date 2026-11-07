import { generateTreePath, generateSelector, getTextPreview } from './path.js'

const DEFAULT_MAX_ELEMENTS = 200
const ITEM_MIN_TEXT = 50
const SVG_MIN_WIDTH = 24

const SEMANTIC_SECTIONS = new Set([
  'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER', 'MAIN',
])
const HEADING_RE = /^H[1-6]$/
const MEDIA_TAGS = new Set(['IMG', 'VIDEO', 'IFRAME'])
const INLINE_TAGS = new Set([
  'SPAN', 'EM', 'STRONG', 'CODE', 'SMALL', 'SUB', 'SUP', 'MARK',
])
const CARD_PATTERN = /card|tile|feature|step|hero|cta/i

function textOf(el) {
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

function svgWidth(el) {
  const attr = parseFloat(el.getAttribute('width'))
  if (!isNaN(attr)) return attr
  return el.getBoundingClientRect ? el.getBoundingClientRect().width : 0
}

function matchesSelector(el, selector) {
  if (!selector) return false
  try { return el.matches(selector) } catch (e) { return false }
}

function isPassthroughDiv(el) {
  if (el.tagName !== 'DIV') return false
  if (el.id || el.className) return false
  const attrs = el.attributes
  for (let i = 0; i < attrs.length; i++) {
    if (attrs[i].name.startsWith('data-')) return false
  }
  const childElements = el.children
  return childElements.length === 1
}

export function isComponentBoundary(el, options) {
  if (!(el instanceof Element) || el.nodeType !== 1) return false
  if (el.hasAttribute('data-nitpik-host')) return false
  if (el.hasAttribute('data-nitpik')) return true
  if (matchesSelector(el, options && options.include)) return true

  const tag = el.tagName
  if (INLINE_TAGS.has(tag)) return false
  if (SEMANTIC_SECTIONS.has(tag)) return true
  if (HEADING_RE.test(tag)) return true
  if (MEDIA_TAGS.has(tag)) return true
  if (tag === 'SVG' || tag === 'svg') return svgWidth(el) > SVG_MIN_WIDTH
  if (tag === 'BUTTON') return true
  if (tag === 'A') return textOf(el).length > 0

  const cls = typeof el.className === 'string' ? el.className : ''
  if (CARD_PATTERN.test(cls) && textOf(el).length > ITEM_MIN_TEXT) return true

  if (tag === 'LI' && textOf(el).length > ITEM_MIN_TEXT) return true

  if (isPassthroughDiv(el)) return false

  return false
}

function toInfo(node) {
  const el = node.element
  return {
    element: el,
    path: generateTreePath(node),
    selector: generateSelector(el),
    textPreview: getTextPreview(el),
    tagName: el.tagName,
  }
}

export function buildTree(root, options) {
  const opts = options || {}
  const max = opts.maxElements === undefined ? DEFAULT_MAX_ELEMENTS : opts.maxElements
  const roots = []
  const nodeMap = new Map()
  const ancestorStack = []

  function walk(el) {
    if (nodeMap.size >= max) return
    if (el.hasAttribute && el.hasAttribute('data-nitpik-ignore')) return
    if (matchesSelector(el, opts.exclude)) return

    const isBoundary = isComponentBoundary(el, opts)
    let stackEntry = null

    if (isBoundary) {
      const parent = ancestorStack.length > 0 ? ancestorStack[ancestorStack.length - 1] : null
      const node = {
        element: el,
        parent,
        children: [],
        depth: parent ? parent.depth + 1 : 0,
        info: null,
      }
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
      nodeMap.set(el, node)
      ancestorStack.push(node)
      stackEntry = node
    }

    const children = el.children
    if (children) {
      for (let i = 0; i < children.length; i++) {
        if (nodeMap.size >= max) break
        walk(children[i])
      }
    }

    if (stackEntry) {
      ancestorStack.pop()
    }
  }

  const children = root.children
  for (let i = 0; i < children.length; i++) {
    walk(children[i])
  }

  for (const node of nodeMap.values()) {
    node.info = toInfo(node)
  }

  return { roots, nodeMap }
}

export function observeDOM(root, nodeMap, callback, options) {
  const opts = options || {}
  const max = opts.maxElements === undefined ? DEFAULT_MAX_ELEMENTS : opts.maxElements

  function removeNode(el) {
    const node = nodeMap.get(el)
    if (!node) return
    nodeMap.delete(el)
    if (node.parent) {
      const idx = node.parent.children.indexOf(node)
      if (idx >= 0) node.parent.children.splice(idx, 1)
    }
    node.children.slice().forEach((child) => removeNode(child.element))
  }

  const observer = new MutationObserver((mutations) => {
    let removed = false
    mutations.forEach((m) => m.removedNodes.forEach((n) => {
      if (n.nodeType !== 1) return
      walkRemoved(n)
      removed = true
    }))

    const newNodes = []
    mutations.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1 || !n.isConnected) return
      walkForNew(n, newNodes)
    }))

    if (!newNodes.length) return
    callback(newNodes)
  })

  function walkRemoved(el) {
    if (nodeMap.has(el)) removeNode(el)
    const children = el.children
    if (children) {
      for (let i = 0; i < children.length; i++) walkRemoved(children[i])
    }
  }

  function walkForNew(el, collected) {
    if (nodeMap.size >= max || collected.length + nodeMap.size >= max) return
    if (!el.isConnected) return
    if (el.hasAttribute && el.hasAttribute('data-nitpik-ignore')) return
    if (matchesSelector(el, opts.exclude)) return

    if (isComponentBoundary(el, opts) && !nodeMap.has(el)) {
      let parent = null
      let walk = el.parentElement
      while (walk && walk !== root) {
        if (nodeMap.has(walk)) {
          parent = nodeMap.get(walk)
          break
        }
        walk = walk.parentElement
      }

      const node = {
        element: el,
        parent,
        children: [],
        depth: parent ? parent.depth + 1 : 0,
        info: null,
      }
      if (parent) parent.children.push(node)
      nodeMap.set(el, node)
      node.info = toInfo(node)
      collected.push(node)
    }

    const children = el.children
    if (children) {
      for (let i = 0; i < children.length; i++) {
        walkForNew(children[i], collected)
      }
    }
  }

  observer.observe(root, { childList: true, subtree: true })
  return () => observer.disconnect()
}
