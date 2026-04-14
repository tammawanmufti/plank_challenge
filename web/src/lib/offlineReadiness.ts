export const OFFLINE_READY_STORAGE_KEY = 'plank:offline-ready'

export function readOfflineReadyFlag(): boolean {
  try {
    return localStorage.getItem(OFFLINE_READY_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeOfflineReadyFlag(): void {
  try {
    localStorage.setItem(OFFLINE_READY_STORAGE_KEY, '1')
  } catch {
    // Ignore storage write failures on restricted browser contexts.
  }
}
