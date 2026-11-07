const HEADING_SELECTOR = 'h1,h2,h3,h4,h5,h6'
const SECTION_TAGS = ['SECTION', 'ARTICLE', 'HEADER']

export function getTextPreview(el, maxLen) {
  const limit = maxLen === undefined ? 40 : maxLen
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > limit ? text.slice(0, limit) + '...' : text
}

function findSectionHeading(el) {
  let node = el.parentElement
  while (node && node !== document.body) {
    if (SECTION_TAGS.indexOf(node.tagName) !== -1) {
      const heading = node.querySelector(HEADING_SELECTOR)
      if (heading && heading !== el && !heading.contains(el)) {
        return getTextPreview(heading)
      }
    }
    node = node.parentElement
  }
  return ''
}

export function generatePath(el) {
  const tag = el.tagName.toLowerCase()
  const preview = getTextPreview(el)
  const label = preview ? tag + ': ' + preview : tag
  const heading = findSectionHeading(el)
  return heading ? 'Section: ' + heading + ' > ' + label : label
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
