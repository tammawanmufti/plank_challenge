export type StartupStage = 'camera' | 'detector' | 'resume'
export type StartupErrorType = 'permission' | 'camera' | 'detector' | 'insecure-context' | 'unknown'

const PERMISSION_ERROR_NAMES = new Set(['NotAllowedError', 'PermissionDeniedError'])
const CAMERA_ERROR_NAMES = new Set(['NotFoundError', 'NotReadableError', 'OverconstrainedError', 'AbortError'])
const INSECURE_CONTEXT_ERROR_NAMES = new Set(['SecurityError'])
const INSECURE_CONTEXT_HINTS = [
  'secure context',
  'secure origin',
  'secure origins',
  'only secure',
  'insecure',
  'https',
  'localhost',
]
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

function readErrorName(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error && typeof error.name === 'string') {
    return error.name
  }

  return ''
}

function readErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message.toLowerCase()
  }

  return ''
}

function isInsecureContextError(name: string, message: string): boolean {
  if (INSECURE_CONTEXT_ERROR_NAMES.has(name)) {
    return true
  }

  return INSECURE_CONTEXT_HINTS.some((hint) => message.includes(hint))
}

export function isCameraContextSecure(context?: { isSecureContext?: boolean; hostname?: string }): boolean {
  if (context) {
    const hostname = context.hostname ?? ''
    if (context.isSecureContext || LOCAL_HOSTNAMES.has(hostname)) {
      return true
    }

    if (context.isSecureContext === false) {
      return false
    }
  }

  if (typeof window === 'undefined') {
    return true
  }

  return window.isSecureContext || LOCAL_HOSTNAMES.has(window.location.hostname)
}

export function classifyStartupError(error: unknown, stage: StartupStage): StartupErrorType {
  const name = readErrorName(error)
  const message = readErrorMessage(error)

  if (isInsecureContextError(name, message)) {
    return 'insecure-context'
  }

  if (PERMISSION_ERROR_NAMES.has(name)) {
    return 'permission'
  }

  if (CAMERA_ERROR_NAMES.has(name)) {
    return 'camera'
  }

  if (stage === 'detector') {
    return 'detector'
  }

  if (
    message.includes('mediapipe') ||
    message.includes('model') ||
    message.includes('vision') ||
    message.includes('wasm')
  ) {
    return 'detector'
  }

  if (stage === 'camera' || stage === 'resume') {
    return 'camera'
  }

  return 'unknown'
}
