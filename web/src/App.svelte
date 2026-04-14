<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { useRegisterSW } from 'virtual:pwa-register/svelte'

  import { detectFaceSnapshot, getFaceDetector, getPerformanceProfile, stopMediaStream } from './lib/faceDetector'
  import { readOfflineReadyFlag, writeOfflineReadyFlag } from './lib/offlineReadiness'
  import { formatDate, formatDuration, modeLabel } from './lib/sessionView'
  import { clearTrainingData, getPersonalRecord, listSessions, saveSession } from './lib/storage'
  import { classifyStartupError, isCameraContextSecure, type StartupStage } from './lib/startupErrors'
  import { nextSessionState } from './lib/sessionMachine'
  import type { ChallengeType, SessionMode, SessionRecord, SessionState } from './lib/types'

  const DETECTION_STABLE_CONFIDENCE = 0.8
  const DETECTION_STABLE_FRAMES = 2
  const DETECTION_TIMEOUT_MS = 5000
  const DETECTION_LOSS_GUARD_MS = 500
  const START_COUNTDOWN_SECONDS = 3
  const LOSS_COUNTDOWN_SECONDS = 5

  const presetOptions = [30, 60, 90, 120]

  let mode: SessionMode = 'practice'
  let challengeType: ChallengeType = 'free'
  let presetSeconds = 60

  let sessionState: SessionState = 'idle'
  let statusText = 'Siap mulai plank challenge.'
  let warningText = ''
  let settingsMessage = ''
  let performanceMessage = ''
  let permissionModal: 'denied' | 'revoked' | 'insecure' | null = null

  let isOffline = !navigator.onLine
  let firstOpenOffline = false
  let offlineReadyPersisted = false
  let offlineCachePending = false
  let offlineReady = false
  let needRefresh = false

  let videoElement: HTMLVideoElement | null = null
  let previewCanvas: HTMLCanvasElement | null = null
  let cameraStream: MediaStream | null = null

  let timerMs = 0
  let elapsedBeforePause = 0
  let sessionStartedAtMs = 0
  let timerStartedEpochMs = 0
  let timerInterval: ReturnType<typeof setInterval> | null = null
  let countdownPhase: 'none' | 'start' | 'loss' = 'none'
  let countdownValue = 0
  let countdownInterval: ReturnType<typeof setInterval> | null = null

  let detectorInterval: ReturnType<typeof setInterval> | null = null
  let detectorBusy = false
  let detectorBootAt = 0
  let stableFrames = 0
  let lossStartedAt = 0
  let pendingPauseDeadlineMs = 0
  let hadQualityWarning = false

  let detectorIntervalMs = 100
  let detectorTier = 'high'

  let warningCount = 0
  let autoPauseCount = 0
  let falsePauseCount = 0
  let pauseLatencyMs: number | null = null
  let qualityWarnings = new Set<string>()

  let sessions: SessionRecord[] = []
  let personalRecordMs = 0
  let personalRecordMode: SessionMode | null = null

  const { offlineReady: offlineReadyStore, needRefresh: needRefreshStore, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true
    },
    onOfflineReady() {
      offlineReadyPersisted = true
      offlineCachePending = false
      writeOfflineReadyFlag()
    },
  })

  $: offlineReady = $offlineReadyStore || offlineReadyPersisted
  $: firstOpenOffline = isOffline && !offlineReady
  $: if (offlineReady) offlineCachePending = false
  $: needRefresh = $needRefreshStore

  $: canStart = sessionState === 'idle' || sessionState === 'done'
  $: canPause = sessionState === 'running'
  $: canResume = sessionState === 'paused' && countdownPhase !== 'loss'
  $: canStop = sessionState === 'running' || sessionState === 'paused' || sessionState === 'detecting'
  $: stateChip = sessionState.toUpperCase()
  $: formattedTimer = formatDuration(timerMs)
  $: targetDurationMs = mode === 'challenge' && challengeType === 'preset' ? presetSeconds * 1000 : null
  $: countdownLabel =
    countdownPhase === 'start' ? 'Timer mulai dalam' : countdownPhase === 'loss' ? 'Timer lanjut dalam' : ''

  function transition(event: Parameters<typeof nextSessionState>[1]): void {
    sessionState = nextSessionState(sessionState, event, { mode })
  }

  function stopDetectorLoop(): void {
    if (detectorInterval) {
      clearInterval(detectorInterval)
      detectorInterval = null
    }

    detectorBusy = false
  }

  function clearIntervals(): void {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }

    countdownPhase = 'none'
    countdownValue = 0

    stopDetectorLoop()
  }

  function resetRuntimeForNewSession(): void {
    clearIntervals()

    timerMs = 0
    elapsedBeforePause = 0
    sessionStartedAtMs = Date.now()
    timerStartedEpochMs = 0

    detectorBootAt = 0
    stableFrames = 0
    lossStartedAt = 0
    pendingPauseDeadlineMs = 0
    hadQualityWarning = false

    warningCount = 0
    autoPauseCount = 0
    falsePauseCount = 0
    pauseLatencyMs = null
    qualityWarnings = new Set<string>()

    warningText = ''
    settingsMessage = ''
    permissionModal = null
  }

  function closeCamera(): void {
    stopDetectorLoop()

    stopMediaStream(cameraStream)
    cameraStream = null

    if (videoElement) {
      videoElement.srcObject = null
    }
  }

  function clearCountdown(): void {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }

    countdownPhase = 'none'
    countdownValue = 0
  }

  function setCountdownStatus(phase: 'start' | 'loss'): void {
    if (phase === 'start') {
      statusText = `Wajah terdeteksi. Timer mulai dalam ${countdownValue}...`
      warningText = ''
      return
    }

    statusText = `Wajah tidak terdeteksi. Timer lanjut dalam ${countdownValue}...`
    warningText = 'Kembali ke frame kamera sebelum countdown habis agar timer lanjut otomatis.'
  }

  function startCountdown(phase: 'start' | 'loss'): void {
    clearCountdown()

    countdownPhase = phase
    countdownValue = phase === 'start' ? START_COUNTDOWN_SECONDS : LOSS_COUNTDOWN_SECONDS
    setCountdownStatus(phase)

    countdownInterval = setInterval(() => {
      if (countdownValue <= 1) {
        const completedPhase = countdownPhase
        clearCountdown()

        if (completedPhase === 'start') {
          beginRunning()
          statusText = 'Timer berjalan.'
        }

        if (completedPhase === 'loss') {
          statusText = 'Wajah belum kembali. Sesi tetap pause.'
        }

        return
      }

      countdownValue -= 1
      setCountdownStatus(phase)
    }, 1000)
  }

  async function ensureCamera(): Promise<void> {
    if (cameraStream) {
      return
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })

    for (const track of stream.getTracks()) {
      track.addEventListener('ended', handleCameraRevoked)
    }

    cameraStream = stream

    if (videoElement) {
      videoElement.srcObject = stream
      await videoElement.play()
    }
  }

  function beginRunning(): void {
    clearCountdown()

    if (sessionState === 'detecting') {
      transition('detected-stable')
    } else if (sessionState === 'paused') {
      transition('resume')
    } else if (sessionState === 'idle') {
      transition('start-manual')
    }

    lossStartedAt = 0
    pendingPauseDeadlineMs = 0
    timerStartedEpochMs = Date.now() - elapsedBeforePause

    if (timerInterval) {
      clearInterval(timerInterval)
    }

    timerInterval = setInterval(() => {
      timerMs = Date.now() - timerStartedEpochMs

      if (targetDurationMs !== null && timerMs >= targetDurationMs) {
        void finishSession('Target challenge selesai.')
      }
    }, 50)
  }

  function pauseSession(message: string, autoPause = false): void {
    if (sessionState !== 'running' && sessionState !== 'detecting') {
      return
    }

    clearCountdown()

    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    elapsedBeforePause = timerMs
    transition('pause')
    statusText = message

    if (autoPause) {
      autoPauseCount += 1
      if (pendingPauseDeadlineMs > 0) {
        const latency = Math.max(0, Date.now() - pendingPauseDeadlineMs)
        pauseLatencyMs = pauseLatencyMs === null ? latency : Math.round((pauseLatencyMs + latency) / 2)
      }
    }
  }

  async function startDetectionLoop(): Promise<void> {
    if (mode === 'manual' || !videoElement || !previewCanvas) {
      return
    }

    const detector = await getFaceDetector()

    if (detectorInterval) {
      clearInterval(detectorInterval)
    }

    detectorInterval = setInterval(async () => {
      if (detectorBusy || !videoElement || !previewCanvas || videoElement.readyState < 2) {
        return
      }

      detectorBusy = true

      try {
        const snapshot = await detectFaceSnapshot(detector, videoElement, previewCanvas)
        const now = Date.now()

        const qualityFlags: string[] = []
        if (snapshot.lowLight) {
          qualityFlags.push('pencahayaan rendah')
          qualityWarnings.add('low-light')
        }
        if (snapshot.blur) {
          qualityFlags.push('kamera blur')
          qualityWarnings.add('blur')
        }

        if (qualityFlags.length > 0) {
          warningText = `Kualitas kamera kurang ideal: ${qualityFlags.join(', ')}.`
          if (!hadQualityWarning) {
            warningCount += 1
          }
          hadQualityWarning = true

          if (sessionState === 'running') {
            transition('quality-warning')
          }
        } else {
          hadQualityWarning = false
          if (warningText.startsWith('Kualitas kamera')) {
            warningText = ''
          }
        }

        if (snapshot.detected && snapshot.confidence >= DETECTION_STABLE_CONFIDENCE) {
          stableFrames += 1
          lossStartedAt = 0

          if (
            sessionState === 'detecting' &&
            stableFrames >= DETECTION_STABLE_FRAMES &&
            countdownPhase !== 'start'
          ) {
            startCountdown('start')
          }

          if (sessionState === 'paused' && countdownPhase === 'loss') {
            clearCountdown()
            falsePauseCount += 1
            beginRunning()
            statusText = 'Wajah kembali terdeteksi. Timer dilanjutkan.'
            warningText = ''
          }

          if (warningText.startsWith('Wajah tidak terdeteksi')) {
            warningText = ''
          }
        } else {
          stableFrames = 0

          if (sessionState === 'detecting' && countdownPhase === 'start') {
            clearCountdown()
            statusText = 'Wajah belum stabil. Mencari ulang...'
          }

          if (sessionState === 'detecting' && now - detectorBootAt >= DETECTION_TIMEOUT_MS) {
            transition('detection-timeout')
            statusText = 'Wajah belum terdeteksi. Coba pencahayaan lebih terang atau gunakan mode manual.'
            clearIntervals()
            closeCamera()
            return
          }

          if (sessionState === 'running' && mode !== 'manual') {
            if (lossStartedAt === 0) {
              lossStartedAt = now
            }

            if (now - lossStartedAt >= DETECTION_LOSS_GUARD_MS && countdownPhase !== 'loss') {
              pendingPauseDeadlineMs = lossStartedAt + DETECTION_LOSS_GUARD_MS
              pauseSession('Wajah tidak terdeteksi. Timer di-pause sementara.', true)
              startCountdown('loss')
            }
          }

          if (sessionState === 'paused' && countdownPhase === 'loss') {
            setCountdownStatus('loss')
          }
        }
      } catch {
        warningText = 'Deteksi wajah gagal sementara. Anda bisa lanjut manual bila perlu.'
      } finally {
        detectorBusy = false
      }
    }, detectorIntervalMs)
  }

  function resetDetectionRuntime(): void {
    detectorBootAt = 0
    stableFrames = 0
    lossStartedAt = 0
    pendingPauseDeadlineMs = 0
    hadQualityWarning = false
  }

  function handleStartupFailure(error: unknown, stage: StartupStage): void {
    clearIntervals()
    closeCamera()
    resetDetectionRuntime()

    if (sessionState === 'detecting') {
      transition('detection-timeout')
    }

    const failureType = classifyStartupError(error, stage)

    if (failureType === 'insecure-context') {
      permissionModal = 'insecure'
      statusText = 'Kamera membutuhkan koneksi aman (HTTPS atau localhost).'
      warningText = 'Buka app lewat HTTPS atau lanjutkan dengan Manual mode.'
      return
    }

    if (failureType === 'permission') {
      permissionModal = 'denied'
      statusText = 'Izin kamera ditolak. Aktifkan izin kamera lalu coba lagi.'
      warningText = ''
      return
    }

    if (failureType === 'camera') {
      permissionModal = 'revoked'
      statusText = 'Kamera tidak tersedia saat ini. Periksa izin atau perangkat kamera.'
      warningText = 'Anda bisa lanjutkan sesi dengan Manual mode.'
      return
    }

    permissionModal = null

    if (failureType === 'detector') {
      statusText = 'Inisialisasi deteksi wajah gagal.'
      warningText = 'Coba lagi beberapa saat, atau lanjutkan dengan Manual mode.'
      return
    }

    statusText = 'Sesi gagal dimulai karena gangguan tak terduga.'
    warningText = 'Silakan coba lagi.'
  }

  function handleResumeFailure(error: unknown): void {
    clearCountdown()
    closeCamera()

    const failureType = classifyStartupError(error, 'resume')
    if (failureType === 'insecure-context') {
      permissionModal = 'insecure'
      statusText = 'Resume kamera butuh koneksi aman (HTTPS atau localhost).'
      warningText = 'Gunakan HTTPS atau lanjutkan Manual mode.'
      return
    }

    if (failureType === 'permission' || failureType === 'camera') {
      permissionModal = 'revoked'
      statusText = 'Akses kamera tidak tersedia. Lanjutkan manual atau akhiri sesi.'
      warningText = ''
      return
    }

    permissionModal = null
    statusText = 'Deteksi wajah belum bisa dilanjutkan saat ini.'
    warningText = 'Coba Resume lagi, atau gunakan Manual mode.'
  }

  async function startSession(): Promise<void> {
    if (firstOpenOffline) {
      statusText = 'Load awal butuh koneksi internet. Buka lagi saat online.'
      return
    }

    if (sessionState === 'done') {
      transition('reset')
    }

    resetRuntimeForNewSession()
    sessionStartedAtMs = Date.now()

    if (mode === 'manual') {
      transition('start-manual')
      beginRunning()
      statusText = 'Manual mode aktif. Timer berjalan tanpa kamera.'
      return
    }

    if (!isCameraContextSecure()) {
      permissionModal = 'insecure'
      statusText = 'Kamera membutuhkan koneksi aman (HTTPS atau localhost).'
      warningText = 'Buka app lewat HTTPS atau lanjutkan dengan Manual mode.'
      return
    }

    statusText = 'Meminta izin kamera...'

    try {
      await ensureCamera()
    } catch (error) {
      handleStartupFailure(error, 'camera')
      return
    }

    transition('start-camera')
    detectorBootAt = Date.now()
    stableFrames = 0
    statusText = 'Mencari wajah...'

    try {
      await startDetectionLoop()
    } catch (error) {
      handleStartupFailure(error, 'detector')
    }
  }

  async function resumeSession(): Promise<void> {
    if (sessionState !== 'paused') {
      return
    }

    if (mode !== 'manual' && !cameraStream) {
      if (!isCameraContextSecure()) {
        permissionModal = 'insecure'
        statusText = 'Resume kamera butuh koneksi aman (HTTPS atau localhost).'
        warningText = 'Gunakan HTTPS atau lanjutkan Manual mode.'
        return
      }

      try {
        await ensureCamera()
        await startDetectionLoop()
      } catch (error) {
        handleResumeFailure(error)
        return
      }
    }

    beginRunning()
    statusText = 'Sesi dilanjutkan.'
  }

  async function finishSession(reason = 'Sesi selesai.'): Promise<void> {
    if (sessionState === 'idle') {
      return
    }

    clearIntervals()
    closeCamera()

    if (sessionState !== 'done') {
      transition('stop')
    }

    statusText = reason

    if (timerMs > 0) {
      const record: SessionRecord = {
        id: crypto.randomUUID(),
        startedAt: new Date(sessionStartedAtMs || Date.now()).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: timerMs,
        mode,
        challengeType,
        targetDurationMs,
        warningCount,
        autoPauseCount,
        falsePauseCount,
        pauseLatencyMs,
        qualityWarnings: [...qualityWarnings],
      }

      await saveSession(record)
      await refreshHistory()
    }
  }

  function stopSession(): void {
    void finishSession('Sesi diakhiri oleh user.')
  }

  async function retryCameraFlow(): Promise<void> {
    permissionModal = null

    if (sessionState === 'paused') {
      await resumeSession()
      return
    }

    await startSession()
  }

  async function continueInManualMode(): Promise<void> {
    permissionModal = null
    mode = 'manual'
    closeCamera()

    if (sessionState === 'paused') {
      await resumeSession()
      return
    }

    await startSession()
  }

  function handleCameraRevoked(): void {
    if (mode === 'manual') {
      return
    }

    permissionModal = 'revoked'

    if (sessionState === 'running' || sessionState === 'detecting') {
      pauseSession('Akses kamera dicabut. Pilih lanjut manual atau akhiri sesi.', true)
    }

    closeCamera()
  }

  async function refreshHistory(): Promise<void> {
    sessions = await listSessions()
    const pr = await getPersonalRecord()
    personalRecordMs = pr?.durationMs ?? 0
    personalRecordMode = pr?.mode ?? null
  }

  async function clearHistory(): Promise<void> {
    const confirmed = window.confirm('Hapus semua session history dan PR? Tindakan ini tidak bisa dibatalkan.')
    if (!confirmed) {
      return
    }

    await clearTrainingData()
    sessions = []
    personalRecordMs = 0
    personalRecordMode = null
    settingsMessage = 'History dan PR berhasil dihapus.'
  }

  async function checkForUpdates(): Promise<void> {
    settingsMessage = 'Memeriksa update aplikasi...'

    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      if (!registration) {
        settingsMessage = 'Service worker belum aktif di device ini.'
        return
      }

      await registration.update()

      if (needRefresh) {
        settingsMessage = 'Update tersedia. Tekan Apply update.'
      } else {
        settingsMessage = 'Aplikasi sudah versi terbaru.'
      }
    } catch {
      settingsMessage = 'Gagal memeriksa update. Coba lagi.'
    }
  }

  function onVisibilityChange(): void {
    if (!document.hidden) {
      return
    }

    if (sessionState === 'running' || sessionState === 'detecting') {
      pauseSession('Aplikasi di-background. Tap Resume untuk lanjut.', false)
      if (mode !== 'manual') {
        closeCamera()
      }
    }
  }

  onMount(() => {
    const profile = getPerformanceProfile()
    detectorIntervalMs = profile.detectorIntervalMs
    detectorTier = profile.tier

    if (profile.tier !== 'high') {
      performanceMessage =
        profile.tier === 'mid'
          ? 'Perangkat terdeteksi mid-range. Detector dijalankan 150ms.'
          : 'Perangkat low-end terdeteksi. Detector dijalankan 200ms.'
    }

    offlineReadyPersisted = readOfflineReadyFlag()
    offlineCachePending = navigator.onLine && !offlineReadyPersisted

    const onOnline = (): void => {
      isOffline = false
      offlineCachePending = !offlineReady
    }

    const onOffline = (): void => {
      isOffline = true
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisibilityChange)

    void refreshHistory()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  onDestroy(() => {
    clearIntervals()
    closeCamera()
  })
</script>

<main class="app-shell">
  <section class="hero-card">
    <p class="eyebrow">Plank Challenge PWA</p>
    <h1>Latihan plank dengan timer yang adil dan jelas</h1>
    <p class="lead">Practice untuk latihan fleksibel, Challenge untuk mode ketat, Manual saat kamera tidak tersedia.</p>
  </section>

  {#if firstOpenOffline}
    <section class="banner error">
      <p>Load awal membutuhkan internet. Buka aplikasi sekali saat online agar mode offline aktif.</p>
    </section>
  {/if}

  {#if isOffline}
    <section class="banner info">
      <p>Offline mode aktif. Data sesi tetap disimpan lokal di device.</p>
    </section>
  {/if}

  {#if !isOffline && offlineCachePending && !offlineReady}
    <section class="banner info">
      <p>Online terdeteksi. Menyiapkan cache offline pertama kali...</p>
    </section>
  {/if}

  {#if offlineReady}
    <section class="banner success">
      <p>App sudah siap dipakai offline setelah cache pertama berhasil.</p>
    </section>
  {/if}

  {#if performanceMessage}
    <section class="banner info">
      <p>{performanceMessage}</p>
    </section>
  {/if}

  <section class="panel">
    <h2>Mode Sesi</h2>
    <div class="mode-grid">
      <button class:active={mode === 'practice'} disabled={!canStart} on:click={() => (mode = 'practice')}>Practice</button>
      <button class:active={mode === 'challenge'} disabled={!canStart} on:click={() => (mode = 'challenge')}>Challenge</button>
      <button class:active={mode === 'manual'} disabled={!canStart} on:click={() => (mode = 'manual')}>Manual</button>
    </div>

    {#if mode === 'challenge'}
      <div class="challenge-config">
        <div class="option-row">
          <button class:active={challengeType === 'free'} disabled={!canStart} on:click={() => (challengeType = 'free')}>Free timer</button>
          <button class:active={challengeType === 'preset'} disabled={!canStart} on:click={() => (challengeType = 'preset')}>Preset</button>
        </div>

        {#if challengeType === 'preset'}
          <label class="preset-select">
            Durasi target
            <select bind:value={presetSeconds} disabled={!canStart}>
              {#each presetOptions as option}
                <option value={option}>{option} detik</option>
              {/each}
            </select>
          </label>
        {/if}
      </div>
    {/if}
  </section>

  <section class="panel timer-panel">
    <div class="state-line">
      <span class="chip">{stateChip}</span>
      <span class="mode-badge">{modeLabel(mode)} mode</span>
      <span class="tier-badge">Detector {detectorTier}</span>
    </div>

    <p class="timer">{formattedTimer}</p>

    {#if targetDurationMs !== null}
      <p class="target-note">Target: {formatDuration(targetDurationMs)}</p>
    {/if}

    {#if countdownPhase !== 'none'}
      <p class="countdown-note">
        {countdownLabel} <strong>{countdownValue}</strong>
      </p>
    {/if}

    <p class="status-text">{statusText}</p>

    {#if warningText}
      <p class="warning-text">{warningText}</p>
    {/if}

    <div class="control-row">
      <button class="primary" disabled={!canStart || firstOpenOffline} on:click={startSession}>Start</button>
      <button disabled={!canPause} on:click={() => pauseSession('Sesi di-pause oleh user.')}>Pause</button>
      <button disabled={!canResume} on:click={resumeSession}>Resume</button>
      <button class="danger" disabled={!canStop} on:click={stopSession}>Stop</button>
    </div>
  </section>

  <section class="panel">
    <h2>Camera Preview</h2>
    {#if mode === 'manual'}
      <p>Manual mode aktif. Timer berjalan tanpa face detection.</p>
    {:else}
      <div class="camera-shell">
        <video bind:this={videoElement} autoplay playsinline muted></video>
        <canvas bind:this={previewCanvas} class="sampling-canvas" aria-hidden="true"></canvas>
      </div>
      <p class="helper">Default kamera depan digunakan untuk start cepat di mobile web.</p>
    {/if}
  </section>

  <section class="panel">
    <h2>Statistik Sesi</h2>
    <div class="metrics">
      <article>
        <h3>Auto pause</h3>
        <p>{autoPauseCount}</p>
      </article>
      <article>
        <h3>Warning kamera</h3>
        <p>{warningCount}</p>
      </article>
      <article>
        <h3>False pause</h3>
        <p>{falsePauseCount}</p>
      </article>
      <article>
        <h3>Latency pause</h3>
        <p>{pauseLatencyMs === null ? '-' : `${pauseLatencyMs} ms`}</p>
      </article>
    </div>
  </section>

  <section class="panel">
    <h2>History dan Personal Record</h2>
    {#if personalRecordMs > 0}
      <p class="pr">PR: {formatDuration(personalRecordMs)} <span>({personalRecordMode ? modeLabel(personalRecordMode) : 'N/A'})</span></p>
    {:else}
      <p class="pr">Belum ada personal record.</p>
    {/if}

    {#if sessions.length === 0}
      <p>Belum ada sesi tersimpan.</p>
    {:else}
      <ul class="history-list">
        {#each sessions.slice(0, 8) as session}
          <li>
            <div>
              <strong>{modeLabel(session.mode)}</strong>
              <span>{formatDate(session.endedAt)}</span>
            </div>
            <div class="history-stats">
              <span>{formatDuration(session.durationMs)}</span>
              <span>{session.challengeType === 'preset' ? 'Preset' : 'Free'}</span>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="panel settings-panel">
    <h2>Settings</h2>
    <p class="helper">Semua data latihan tersimpan lokal di device. Kamera diproses lokal dan tidak di-upload.</p>
    <div class="settings-actions">
      <button on:click={checkForUpdates}>Check app update</button>
      <button disabled={!needRefresh} on:click={() => updateServiceWorker(true)}>Apply update</button>
      <button class="danger" on:click={clearHistory}>Clear all history and PR</button>
    </div>
    {#if settingsMessage}
      <p class="settings-message">{settingsMessage}</p>
    {/if}
  </section>

  {#if permissionModal}
    <section class="modal-layer" role="dialog" aria-modal="true">
      <div class="modal">
        <h3>
          {permissionModal === 'denied'
            ? 'Izin kamera ditolak'
            : permissionModal === 'insecure'
              ? 'Kamera membutuhkan koneksi aman'
              : 'Akses kamera dicabut'}
        </h3>
        <p>
          {permissionModal === 'denied'
            ? 'Anda bisa coba lagi atau langsung lanjut Manual mode.'
            : permissionModal === 'insecure'
              ? 'Buka aplikasi dengan HTTPS atau localhost untuk memakai kamera. Anda tetap bisa lanjut dengan Manual mode.'
              : 'Sesi bisa dilanjutkan di Manual mode atau diakhiri sekarang.'}
        </p>
        <div class="modal-actions">
          <button on:click={retryCameraFlow}>Retry camera</button>
          <button on:click={continueInManualMode}>Use Manual mode</button>
          <button class="danger" on:click={stopSession}>End session</button>
        </div>
      </div>
    </section>
  {/if}
</main>
