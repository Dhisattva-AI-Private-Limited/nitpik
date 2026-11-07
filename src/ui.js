import { STYLES } from './styles.js'

const MAX_PATH = 80
const MAX_COMMENT_PREVIEW = 80
const TOAST_MS = 2000
// Lucide "message-square" outline (ISC), sourced via Animotion.
const ICON_PATH = 'M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.7.7 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z'
const SVG_NS = 'http://www.w3.org/2000/svg'
const POPOVER_GAP = 8
const POPOVER_EST_HEIGHT = 200

function truncate(text, max) {
  return text.length > max ? text.slice(0, max) + '...' : text
}

function h(tag, attrs = {}, text) {
  const el = document.createElement(tag)
  for (const k in attrs) el.setAttribute(k, attrs[k])
  if (text != null) el.textContent = text
  return el
}

function buildIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  const p = document.createElementNS(SVG_NS, 'path')
  p.setAttribute('d', ICON_PATH)
  svg.appendChild(p)
  return svg
}

export function createUI(options = {}) {
  const { color = '#F59E0B', onSubmit = () => {}, reviewer = '' } = options
  let host = null
  let root = null
  let triggers = [] // { info, button }
  let popover = null
  let activeTrigger = null
  let counter = null
  let panel = null
  let comments = []
  let reviewMode = false
  let resizeObserver = null
  const cleanups = []
  const commented = new Set()

  const ctl = {}

  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn, opts))
  }

  function positionTrigger({ info, button }) {
    const r = info.element.getBoundingClientRect()
    button.style.top = `${r.top + window.scrollY + 4}px`
    button.style.left = `${r.right + window.scrollX - 28}px`
  }
  function repositionAll() { triggers.forEach(positionTrigger) }

  function onHover(e) {
    const t = e.target
    for (const tr of triggers) {
      const hovered = tr.info.element === t || tr.info.element.contains(t)
      tr.button.classList.toggle('hovered', hovered)
      tr.button.style.opacity = hovered ? '1' : ''
    }
  }

  function closePopover() {
    if (popover) popover.remove()
    popover = null
    if (activeTrigger) activeTrigger.button.focus?.()
    activeTrigger = null
  }

  function placePopover(el, anchor) {
    const r = anchor.getBoundingClientRect()
    const vh = window.innerHeight || 768
    const vw = window.innerWidth || 1024
    const below = r.bottom + POPOVER_GAP
    const top = below + POPOVER_EST_HEIGHT > vh ? Math.max(POPOVER_GAP, r.top - POPOVER_EST_HEIGHT - POPOVER_GAP) : below
    const left = Math.max(POPOVER_GAP, Math.min(r.left, vw - 360 - POPOVER_GAP))
    el.style.top = `${top}px`
    el.style.left = `${left}px`
  }

  function openPopover(tr) {
    closePopover()
    activeTrigger = tr
    const { info } = tr
    popover = h('div', { 'data-nitpik-popover': '', role: 'dialog', 'aria-label': 'Add comment' })
    const form = h('form')
    const label = h('div', { 'data-nitpik-path': '' }, truncate(info.path, MAX_PATH))
    const ta = h('textarea', { 'aria-label': 'Comment', placeholder: 'Your feedback...' })
    const actions = h('div', { class: 'nitpik-actions' })
    const cancel = h('button', { type: 'button', class: 'nitpik-btn', 'data-nitpik-cancel': '' }, 'Cancel')
    const submit = h('button', { type: 'submit', class: 'nitpik-btn primary' }, 'Submit')
    actions.append(cancel, submit)
    form.append(label, ta, actions)
    popover.appendChild(form)
    root.appendChild(popover)
    placePopover(popover, info.element)

    cancel.addEventListener('click', closePopover)
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const comment = ta.value.trim()
      if (!comment) { ta.focus(); return }
      const { path, selector, tagName, textPreview } = info
      info.element.setAttribute('data-nitpik-commented', '')
      info.element.style.outline = `2px dashed ${color}`
      commented.add(info.element)
      closePopover()
      onSubmit({ selector, path, tagName, textPreview, comment, reviewer, timestamp: new Date().toISOString() })
    })
    ta.focus()
  }

  function onKeydown(e) {
    if (!popover) return
    if (e.key === 'Escape') { closePopover(); return }
    if (e.key !== 'Tab') return
    const f = [...popover.querySelectorAll('textarea, button')]
    const first = f[0]
    const last = f[f.length - 1]
    const active = root.activeElement
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
  }

  function renderPanel() {
    if (panel) panel.remove()
    panel = h('div', { 'data-nitpik-panel': '' })
    const ul = h('ul')
    comments.forEach((c) => {
      const li = h('li')
      li.append(h('b', {}, truncate(c.path || '', MAX_PATH)), h('span', {}, truncate(c.comment || '', MAX_COMMENT_PREVIEW)))
      ul.appendChild(li)
    })
    const actions = h('div', { class: 'nitpik-panel-actions' })
    ;[['Export MD', 'md'], ['Export JSON', 'json'], ['Clear', 'clear']].forEach(([text, fmt]) => {
      const b = h('button', { type: 'button', class: 'nitpik-btn' }, text)
      b.addEventListener('click', () => ctl.onExport && ctl.onExport(fmt))
      actions.appendChild(b)
    })
    panel.append(ul, actions)
    root.appendChild(panel)
  }

  ctl.mount = function mount() {
    if (host) return
    host = h('div', { 'data-nitpik-host': '' })
    root = host.attachShadow({ mode: 'open' })
    host.style.setProperty('--nitpik-color', color)
    root.appendChild(h('style', {}, STYLES))
    document.body.appendChild(host)
    listen(document, 'mouseover', onHover)
    listen(document, 'keydown', onKeydown)
    listen(window, 'resize', repositionAll)
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(repositionAll)
      resizeObserver.observe(document.body)
    }
  }

  ctl.addTriggers = function addTriggers(elements) {
    if (!root) return
    for (const info of elements) {
      const button = h('button', {
        type: 'button', tabindex: '0', 'data-nitpik-trigger': '', 'aria-label': `Comment on ${info.path}`,
      })
      button.appendChild(buildIcon())
      if (reviewMode) button.classList.add('visible')
      const tr = { info, button }
      button.addEventListener('click', () => openPopover(tr))
      root.appendChild(button)
      positionTrigger(tr)
      triggers.push(tr)
    }
  }

  ctl.removeTriggers = function removeTriggers() {
    closePopover()
    triggers.forEach((t) => t.button.remove())
    triggers = []
  }

  ctl.showToast = function showToast(message) {
    if (!root) return
    const toast = h('div', { 'data-nitpik-toast': '', role: 'status' }, message)
    root.appendChild(toast)
    const id = setTimeout(() => toast.remove(), TOAST_MS)
    cleanups.push(() => clearTimeout(id))
  }

  ctl.showCounter = function showCounter(count, list = []) {
    if (!root) return
    comments = list
    if (!counter) {
      counter = h('button', { type: 'button', 'data-nitpik-counter': '', 'aria-label': 'Show comments' })
      counter.addEventListener('click', () => {
        if (panel) { panel.remove(); panel = null } else renderPanel()
      })
      root.appendChild(counter)
    }
    counter.textContent = `${count} comment${count === 1 ? '' : 's'}`
    if (panel) renderPanel()
  }

  ctl.setReviewMode = function setReviewMode(on) {
    reviewMode = !!on
    triggers.forEach((t) => t.button.classList.toggle('visible', reviewMode))
  }

  ctl.destroy = function destroy() {
    cleanups.splice(0).forEach((fn) => fn())
    if (resizeObserver) resizeObserver.disconnect()
    resizeObserver = null
    commented.forEach((el) => { el.removeAttribute('data-nitpik-commented'); el.style.outline = '' })
    commented.clear()
    if (host) host.remove()
    host = root = popover = counter = panel = activeTrigger = null
    triggers = []
  }

  return ctl
}
