import type { SessionMode, SessionState } from './types'

export type SessionEvent =
  | 'start-camera'
  | 'start-manual'
  | 'detected-stable'
  | 'detection-timeout'
  | 'detection-lost'
  | 'quality-warning'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'reset'

interface TransitionContext {
  mode: SessionMode
}

export function nextSessionState(
  current: SessionState,
  event: SessionEvent,
  ctx: TransitionContext,
): SessionState {
  switch (current) {
    case 'idle':
      if (event === 'start-camera') {
        return 'detecting'
      }

      if (event === 'start-manual') {
        return 'running'
      }

      return current

    case 'detecting':
      if (event === 'detected-stable') {
        return 'running'
      }

      if (event === 'detection-timeout' || event === 'stop') {
        return 'idle'
      }

      if (event === 'pause') {
        return 'paused'
      }

      return current

    case 'running':
      if (event === 'pause') {
        return 'paused'
      }

      if (event === 'detection-lost' && ctx.mode === 'challenge') {
        return 'paused'
      }

      if (event === 'stop') {
        return 'done'
      }

      return current

    case 'paused':
      if (event === 'resume') {
        return 'running'
      }

      if (event === 'stop') {
        return 'done'
      }

      return current

    case 'done':
      if (event === 'reset') {
        return 'idle'
      }

      return current

    default:
      return current
  }
}
