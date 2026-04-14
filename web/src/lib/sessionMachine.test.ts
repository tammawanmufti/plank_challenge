import { describe, expect, it } from 'vitest'

import { nextSessionState } from './sessionMachine'

describe('nextSessionState', () => {
  it('starts camera flows from idle', () => {
    expect(nextSessionState('idle', 'start-camera', { mode: 'challenge' })).toBe('detecting')
  })

  it('starts manual flows from idle', () => {
    expect(nextSessionState('idle', 'start-manual', { mode: 'manual' })).toBe('running')
  })

  it('promotes detecting to running on stable detection', () => {
    expect(nextSessionState('detecting', 'detected-stable', { mode: 'challenge' })).toBe('running')
  })

  it('returns to idle on detection timeout', () => {
    expect(nextSessionState('detecting', 'detection-timeout', { mode: 'challenge' })).toBe('idle')
  })

  it('auto-pauses challenge mode when detection is lost', () => {
    expect(nextSessionState('running', 'detection-lost', { mode: 'challenge' })).toBe('paused')
  })

  it('keeps practice mode running on detection loss', () => {
    expect(nextSessionState('running', 'detection-lost', { mode: 'practice' })).toBe('running')
  })

  it('keeps running state on quality warning events', () => {
    expect(nextSessionState('running', 'quality-warning', { mode: 'challenge' })).toBe('running')
  })

  it('supports pause and resume lifecycle transitions', () => {
    const paused = nextSessionState('running', 'pause', { mode: 'challenge' })
    expect(paused).toBe('paused')
    expect(nextSessionState(paused, 'resume', { mode: 'challenge' })).toBe('running')
  })

  it('can reset from done to idle', () => {
    expect(nextSessionState('done', 'reset', { mode: 'manual' })).toBe('idle')
  })
})
