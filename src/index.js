import { createEmitter } from './events.js'
import { buildTree, observeDOM } from './discovery.js'
import { createStorage } from './storage.js'
import { createUI } from './ui.js'

export { createEmitter } from './events.js'
export { generateTreePath as generatePath, generateSelector, getTextPreview } from './path.js'

const REVIEWER_KEY = 'nitpik:reviewer'
const TOASTS = { clipboard: 'Copied!', collect: 'Comment saved', callback: 'Comment sent', api: 'Comment sent' }
const ATTR_MAP = {
  mode: 'data-mode', color: 'data-color', position: 'data-position', exclude: 'data-exclude',
  include: 'data-include', reviewer: 'data-reviewer', endpoint: 'data-endpoint', apiKey: 'data-api-key',
}

export function parseScriptConfig(script) {
  const cfg = {}
  if (!script) return cfg
  Object.keys(ATTR_MAP).forEach((key) => {
    const v = script.getAttribute(ATTR_MAP[key])
    if (v !== null && v !== '') cfg[key] = v
  })
  const max = parseInt(script.getAttribute('data-max-elements'), 10)
  if (!isNaN(max)) cfg.maxElements = max
  return cfg
}

function findScript() {
  return document.currentScript || document.querySelector('script[src*="nitpik"]')
}

function readStoredReviewer() {
  try { return localStorage.getItem(REVIEWER_KEY) || '' } catch (e) { return '' }
}
function saveReviewer(name) {
  try { localStorage.setItem(REVIEWER_KEY, name) } catch (e) { /* unavailable */ }
}

const scriptEl = typeof document !== 'undefined' ? document.currentScript : null
const scriptConfig = parseScriptConfig(scriptEl || (typeof document !== 'undefined' ? document.querySelector('script[src*="nitpik"]') : null))

let state = null
const listeners = []

function init(options) {
  if (state) { console.warn('NitPik: already initialized'); return }
  const opts = Object.assign({ mode: 'clipboard' }, scriptConfig, options || {})
  const emitter = createEmitter()
  listeners.forEach((l) => emitter.on(l.event, l.fn))
  const storage = createStorage(opts.mode, emitter, {
    endpoint: opts.endpoint, apiKey: opts.apiKey, pageKey: opts.pageKey || (typeof location !== 'undefined' ? location.pathname : undefined),
  })
  const reviewer = opts.reviewer || readStoredReviewer()

  function handleSubmit(data) {
    storage.submit(data)
    if (data && data.reviewer) saveReviewer(data.reviewer)
    ui.showToast(TOASTS[opts.mode] || 'Comment saved')
    ui.showCounter(storage.count, storage.getComments ? storage.getComments() : [])
  }

  const ui = createUI({
    color: opts.color, reviewer,
    onSubmit: (data) => { handleSubmit(data) },
  })
  ui.onExport = (format) => {
    if (format === 'clear') {
      if (storage.clear) storage.clear()
      ui.showCounter(storage.count, storage.getComments ? storage.getComments() : [])
      return undefined
    }
    if (storage.download) storage.download(format)
    return undefined
  }
  ui.mount()

  const discoveryOpts = { include: opts.include, exclude: opts.exclude, maxElements: opts.maxElements }
  const { nodeMap } = buildTree(document.body, discoveryOpts)
  ui.setTree(nodeMap)

  const stopDOM = observeDOM(document.body, nodeMap, () => {
    ui.setTree(nodeMap)
  }, discoveryOpts)

  state = { emitter, storage, ui, stopDOM, handleSubmit, onExport: ui.onExport }
}

function destroy() {
  if (!state) return
  state.stopDOM()
  state.ui.destroy()
  state = null
}

const api = {
  init,
  destroy,
  getComments() { return state && state.storage.getComments ? state.storage.getComments() : [] },
  exportMarkdown() { return state && state.storage.exportMarkdown ? state.storage.exportMarkdown() : '' },
  exportJSON() { return state && state.storage.exportJSON ? state.storage.exportJSON() : JSON.stringify({ comments: [] }) },
  download(format) { if (state && state.storage.download) state.storage.download(format) },
  on(event, fn) {
    listeners.push({ event, fn })
    if (state) state.emitter.on(event, fn)
  },
  off(event, fn) {
    const i = listeners.findIndex((l) => l.event === event && l.fn === fn)
    if (i >= 0) listeners.splice(i, 1)
    if (state) state.emitter.off(event, fn)
  },
  get count() { return state ? state.storage.count : 0 },
}

export const __internals = {
  submit(data) { if (state) state.handleSubmit(data) },
  exportAction(fmt) { return state ? state.onExport(fmt) : undefined },
}

export default api
export { init, destroy }

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.NitPik = api
  if (scriptEl || findScript()) {
    const start = () => init()
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
    else start()
  }
}
