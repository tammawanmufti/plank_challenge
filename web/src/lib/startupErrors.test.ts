import { describe, expect, it } from 'vitest'

import { classifyStartupError, isCameraContextSecure } from './startupErrors'

describe('classifyStartupError', () => {
  it('classifies permission errors from camera stage', () => {
    expect(classifyStartupError({ name: 'NotAllowedError' }, 'camera')).toBe('permission')
  })

  it('classifies secure-context requirement errors as insecure-context', () => {
    expect(
      classifyStartupError(
        { name: 'NotAllowedError', message: 'getUserMedia() must be run from a secure context' },
        'camera',
      ),
    ).toBe('insecure-context')
  })

  it('classifies SecurityError as insecure-context', () => {
    expect(classifyStartupError({ name: 'SecurityError' }, 'camera')).toBe('insecure-context')
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

describe('isCameraContextSecure', () => {
  it('returns true for secure contexts', () => {
    expect(isCameraContextSecure({ isSecureContext: true, hostname: '192.168.18.101' })).toBe(true)
  })

  it('returns true for localhost over http', () => {
    expect(isCameraContextSecure({ isSecureContext: false, hostname: 'localhost' })).toBe(true)
  })

  it('returns false for insecure LAN contexts', () => {
    expect(isCameraContextSecure({ isSecureContext: false, hostname: '192.168.18.101' })).toBe(false)
  })
})
