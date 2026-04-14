import { describe, expect, it } from 'vitest'

import { classifyStartupError } from './startupErrors'

describe('classifyStartupError', () => {
  it('classifies permission errors from camera stage', () => {
    expect(classifyStartupError({ name: 'NotAllowedError' }, 'camera')).toBe('permission')
  })

  it('classifies camera hardware errors from camera stage', () => {
    expect(classifyStartupError({ name: 'NotReadableError' }, 'camera')).toBe('camera')
  })

  it('classifies detector stage failures as detector', () => {
    expect(classifyStartupError(new Error('model load failed'), 'detector')).toBe('detector')
  })

  it('classifies resume stage unknown errors as camera availability issues', () => {
    expect(classifyStartupError(new Error('transient resume error'), 'resume')).toBe('camera')
  })
})
