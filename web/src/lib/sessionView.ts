import type { SessionMode } from './types'

export function formatDuration(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centiseconds = Math.floor((totalMs % 1000) / 10)

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function modeLabel(selectedMode: SessionMode): string {
  if (selectedMode === 'practice') {
    return 'Practice'
  }

  if (selectedMode === 'challenge') {
    return 'Challenge'
  }

  return 'Manual'
}
