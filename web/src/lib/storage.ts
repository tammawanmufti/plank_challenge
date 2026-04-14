import { createStore, del, get, set } from 'idb-keyval'

import type { PersonalRecord, SessionRecord } from './types'

const store = createStore('plank-challenge-db', 'plank-app-store')

const SESSIONS_KEY = 'sessions'
const PR_KEY = 'personal-record'

async function readSessions(): Promise<SessionRecord[]> {
  const sessions = await get<SessionRecord[]>(SESSIONS_KEY, store)
  return sessions ?? []
}

function getBestSession(sessions: SessionRecord[]): SessionRecord | null {
  if (sessions.length === 0) {
    return null
  }

  let best = sessions[0]
  for (const session of sessions) {
    if (session.durationMs > best.durationMs) {
      best = session
    }
  }

  return best
}

async function refreshPR(sessions: SessionRecord[]): Promise<void> {
  const best = getBestSession(sessions)
  if (!best) {
    await del(PR_KEY, store)
    return
  }

  const pr: PersonalRecord = {
    durationMs: best.durationMs,
    mode: best.mode,
    sessionId: best.id,
    updatedAt: new Date().toISOString(),
  }

  await set(PR_KEY, pr, store)
}

export async function listSessions(): Promise<SessionRecord[]> {
  const sessions = await readSessions()
  return sessions.sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const sessions = await readSessions()
  const nextSessions = [record, ...sessions].slice(0, 200)

  await set(SESSIONS_KEY, nextSessions, store)
  await refreshPR(nextSessions)
}

export async function getPersonalRecord(): Promise<PersonalRecord | null> {
  const pr = await get<PersonalRecord>(PR_KEY, store)
  return pr ?? null
}

export async function clearTrainingData(): Promise<void> {
  await set(SESSIONS_KEY, [], store)
  await del(PR_KEY, store)
}
