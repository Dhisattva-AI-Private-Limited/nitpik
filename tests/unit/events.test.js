import { describe, it, expect, vi } from 'vitest'
import { createEmitter } from '../../src/events.js'

describe('createEmitter', () => {
  it('calls listener on emit', () => {
    const emitter = createEmitter()
    const fn = vi.fn()
    emitter.on('comment', fn)
    emitter.emit('comment', { text: 'hello' })
    expect(fn).toHaveBeenCalledWith({ text: 'hello' })
  })

  it('removes listener with off', () => {
    const emitter = createEmitter()
    const fn = vi.fn()
    emitter.on('comment', fn)
    emitter.off('comment', fn)
    emitter.emit('comment', {})
    expect(fn).not.toHaveBeenCalled()
  })

  it('supports multiple listeners', () => {
    const emitter = createEmitter()
    const a = vi.fn(), b = vi.fn()
    emitter.on('x', a)
    emitter.on('x', b)
    emitter.emit('x', 1)
    expect(a).toHaveBeenCalledWith(1)
    expect(b).toHaveBeenCalledWith(1)
  })
})
