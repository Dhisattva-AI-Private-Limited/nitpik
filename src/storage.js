const SCHEMA_VERSION = '1'
const STORAGE_PREFIX = 'nitpik:'

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch (e) {
    return false
  }
}

function copyText(text) {
  const clip = typeof navigator !== 'undefined' && navigator.clipboard
  if (clip && typeof clip.writeText === 'function' && window.isSecureContext) {
    try {
      clip.writeText(text).catch(function () { fallbackCopy(text) })
      return
    } catch (e) { /* fall through */ }
  }
  fallbackCopy(text)
}

function formatMarkdown(comments) {
  return comments.map(function (c) {
    return '### ' + c.path + '\n\n' + c.comment + '\n\n— ' + c.reviewer + ', ' + c.timestamp + '\n\n---'
  }).join('\n\n')
}

function createClipboardAdapter(emitter) {
  let count = 0
  return {
    submit(data) {
      copyText('[' + data.path + ']: ' + data.comment)
      count++
      emitter.emit('comment', data)
    },
    get count() { return count },
  }
}

function loadStored(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key))
    return parsed && Array.isArray(parsed.comments) ? parsed.comments : []
  } catch (e) {
    return []
  }
}

function createCollectAdapter(emitter, options) {
  const key = STORAGE_PREFIX + (options.pageKey || 'default')
  let comments = loadStored(key)

  function persist() {
    try { localStorage.setItem(key, exportJSON()) } catch (e) { /* unavailable or full */ }
  }
  function exportJSON() {
    return JSON.stringify({ version: SCHEMA_VERSION, comments: comments }, null, 2)
  }
  function exportMarkdown() { return formatMarkdown(comments) }

  return {
    submit(data) {
      comments.push(data)
      persist()
      emitter.emit('comment', data)
    },
    getComments() { return comments.slice() },
    exportMarkdown: exportMarkdown,
    exportJSON: exportJSON,
    download(format) {
      const isMd = format === 'markdown' || format === 'md'
      const blob = new Blob([isMd ? exportMarkdown() : exportJSON()], {
        type: isMd ? 'text/markdown' : 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'nitpik-comments.' + (isMd ? 'md' : 'json')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(function () { URL.revokeObjectURL(url) }, 0)
    },
    clear() {
      comments = []
      try { localStorage.removeItem(key) } catch (e) { /* ignore */ }
    },
    get count() { return comments.length },
  }
}

function createCallbackAdapter(emitter) {
  let count = 0
  return {
    submit(data) {
      if (typeof window.nitpikOnComment === 'function') window.nitpikOnComment(data)
      else console.warn('NitPik: window.nitpikOnComment is not defined')
      count++
      emitter.emit('comment', data)
    },
    get count() { return count },
  }
}

function createApiAdapter(emitter, options) {
  let count = 0
  return {
    submit(data) {
      if (!options.endpoint) {
        console.warn('NitPik: api mode requires an endpoint option')
      } else {
        const headers = { 'Content-Type': 'application/json' }
        if (options.apiKey) headers['X-API-Key'] = options.apiKey
        fetch(options.endpoint, { method: 'POST', headers: headers, body: JSON.stringify(data) })
          .catch(function (err) { console.warn('NitPik: failed to POST comment', err) })
      }
      count++
      emitter.emit('comment', data)
    },
    get count() { return count },
  }
}

export function createStorage(mode, emitter, options) {
  const opts = options || {}
  switch (mode) {
    case 'clipboard': return createClipboardAdapter(emitter)
    case 'collect': return createCollectAdapter(emitter, opts)
    case 'callback': return createCallbackAdapter(emitter)
    case 'api': return createApiAdapter(emitter, opts)
    default: throw new Error('NitPik: unknown storage mode "' + mode + '"')
  }
}
