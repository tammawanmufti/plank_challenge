export type SessionMode = 'practice' | 'challenge' | 'manual'

export type SessionState = 'idle' | 'detecting' | 'running' | 'paused' | 'done'

export type ChallengeType = 'free' | 'preset'

export interface SessionRecord {
  id: string
  startedAt: string
  endedAt: string
  durationMs: number
  mode: SessionMode
  challengeType: ChallengeType
  targetDurationMs: number | null
  warningCount: number
  autoPauseCount: number
  falsePauseCount: number
  pauseLatencyMs: number | null
  qualityWarnings: string[]
}

export interface PersonalRecord {
  durationMs: number
  sessionId: string
  mode: SessionMode
  updatedAt: string
}

export interface DetectorSnapshot {
  detected: boolean
  confidence: number
  lowLight: boolean
  blur: boolean
}
