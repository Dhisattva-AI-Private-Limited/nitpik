export function createEmitter() {
  const listeners = new Map()

  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(fn)
    },
    off(event, fn) {
      const set = listeners.get(event)
      if (set) set.delete(fn)
    },
    emit(event, data) {
      const set = listeners.get(event)
      if (!set) return
      Array.from(set).forEach(function (fn) { fn(data) })
    },
  }
}
