export type StartupStage = 'camera' | 'detector' | 'resume'
export type StartupErrorType = 'permission' | 'camera' | 'detector' | 'unknown'

const PERMISSION_ERROR_NAMES = new Set(['NotAllowedError', 'SecurityError', 'PermissionDeniedError'])
const CAMERA_ERROR_NAMES = new Set(['NotFoundError', 'NotReadableError', 'OverconstrainedError', 'AbortError'])

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

export function classifyStartupError(error: unknown, stage: StartupStage): StartupErrorType {
  const name = readErrorName(error)
  const message = readErrorMessage(error)

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
