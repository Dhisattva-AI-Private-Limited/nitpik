const SECTION_TAGS = new Set([
  'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER', 'MAIN',
])
const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6'

export function getTextPreview(el, maxLen) {
  const limit = maxLen === undefined ? 40 : maxLen
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > limit ? text.slice(0, limit) + '...' : text
}

function segmentLabel(node) {
  const el = node.element
  const tag = el.tagName.toLowerCase()
  if (SECTION_TAGS.has(el.tagName)) {
    const heading = el.querySelector(HEADING_SELECTOR)
    if (heading) {
      const text = getTextPreview(heading)
      if (text) return 'Section: ' + text
    }
  }
  const preview = getTextPreview(el)
  return preview ? tag + ': ' + preview : tag
}

export function generateTreePath(node) {
  const segments = []
  let current = node
  while (current) {
    segments.unshift(segmentLabel(current))
    current = current.parent
  }
  return segments.join(' > ')
}

function segmentFor(el) {
  const tag = el.tagName.toLowerCase()
  const parent = el.parentElement
  if (!parent) return tag
  const index = Array.prototype.indexOf.call(parent.children, el) + 1
  return tag + ':nth-child(' + index + ')'
}

function buildSelector(el, depth) {
  const parts = []
  let node = el
  while (node && node.nodeType === 1 && node !== document.documentElement && parts.length < depth) {
    if (node.id && /^[A-Za-z][\w-]*$/.test(node.id)) {
      parts.unshift('#' + node.id)
      return parts.join(' > ')
    }
    parts.unshift(segmentFor(node))
    node = node.parentElement
  }
  return parts.join(' > ')
}

export function generateSelector(el) {
  for (let depth = 1; depth <= 64; depth++) {
    const sel = buildSelector(el, depth)
    try {
      if (document.querySelectorAll(sel).length === 1 && document.querySelector(sel) === el) return sel
    } catch (e) { /* invalid selector, try longer */ }
  }
  return buildSelector(el, 64)
}
