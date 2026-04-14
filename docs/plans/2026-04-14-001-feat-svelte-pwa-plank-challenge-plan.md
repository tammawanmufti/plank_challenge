---
title: feat: Mobile-First Svelte PWA Plank Challenge
type: feat
status: completed
date: 2026-04-14
origin: docs/brainstorms/2026-04-14-svelte-pwa-plank-challenge-mobile-brainstorm.md
---

# feat: Mobile-First Svelte PWA Plank Challenge

> Design basis: this plan elaborates the product decisions from the origin brainstorm.

## Overview
Membangun aplikasi plank challenge berbasis Svelte + Vite sebagai PWA mobile web di iOS dan Android, dengan fokus UX latihan cepat dan jelas. Produk v1 bersifat local-first: data latihan disimpan lokal, pemrosesan kamera terjadi lokal, dan fitur inti berjalan offline setelah load awal. Riwayat sesi dan personal record (PR) dipakai sebagai pendorong latihan berulang.

## Problem Statement / Motivation
User butuh pengalaman latihan plank yang cepat dimulai, mudah dipahami, dan tetap bisa dipakai pada kondisi real-world mobile (izin kamera ditolak, koneksi internet tidak stabil, kualitas kamera berubah-ubah). Scope v1 harus tetap sederhana agar rilis cepat dan stabil: tanpa akun dan tanpa cloud sync.

## Proposed Solution
Rilis v1 menghadirkan:
- Dua mode eksplisit: Practice mode (fleksibel) dan Challenge mode (ketat) agar perilaku aplikasi mudah diprediksi.
- Start flow cepat untuk mobile dengan default kamera depan.
- Manual mode fallback jika user menolak izin kamera sehingga sesi tetap bisa dijalankan.
- Session history dan PR lintas mode yang tetap sederhana namun transparan.
- Challenge setup dengan dua jalur: free timer dan preset durasi.

## Technical Considerations
- Architecture impacts:
  - Shell PWA (manifest + service worker) memprioritaskan startup cepat dan cache aset inti.
  - Session state harus deterministik dengan transisi eksplisit.
- Local-first architecture:
  - Semua session history dan PR disimpan lokal pada device.
  - Tidak ada akun dan cloud sync pada v1.
  - Fitur inti tetap usable offline setelah load awal berhasil.
- Security and privacy considerations:
  - Tidak ada upload frame kamera atau data latihan ke server.
  - Permission flow transparan dan selalu punya fallback ke manual mode.
- Performance implications:
  - Face detection tidak boleh mengganggu respons timer dan UI.
  - Kamera dan deteksi wajib dihentikan saat sesi berakhir atau aplikasi di-background.

## Session State Contract

### State Definitions

| State | Deskripsi | Berlaku di mode |
| --- | --- | --- |
| Idle | Aplikasi siap, sesi belum mulai. | Practice, Challenge, Manual |
| Detecting | Kamera aktif, menunggu deteksi wajah stabil. | Practice, Challenge |
| Running | Timer berjalan. | Practice, Challenge, Manual |
| Paused | Timer berhenti sementara. | Practice, Challenge, Manual |
| Done | Sesi selesai, hasil diproses dan disimpan. | Practice, Challenge, Manual |

### Transition Table

| From | Event | Guard | Action | Next |
| --- | --- | --- | --- | --- |
| Idle | start_session | mode = Practice or Challenge and camera granted | init camera + init detector | Detecting |
| Idle | start_session | mode = Practice or Challenge and camera denied | show manual fallback prompt | Running (Manual) |
| Idle | start_session | mode = Manual | skip camera + init timer | Running |
| Detecting | detection_stable | face confidence >= 0.8 for 2 frames | start timer | Running |
| Detecting | detection_timeout | no stable detection within 5s | show guidance + allow manual | Idle |
| Running | detection_lost | mode = Challenge and loss > 500ms | auto pause + show status | Paused |
| Running | quality_poor | low light or blur detected | show warning only | Running |
| Running | user_pause | any mode | pause timer | Paused |
| Running | user_stop or timer_complete | any mode | finalize result + persist | Done |
| Paused | user_resume | any mode | resume timer | Running |
| Paused | user_end | any mode | finalize result | Done |
| Done | start_new_session | any mode | reset runtime state | Idle |

### Entry and Exit Actions

| State | On Entry | On Exit |
| --- | --- | --- |
| Idle | clear transient session state, show mode selector | none |
| Detecting | start camera stream, start detector polling | stop detector polling |
| Running | start or resume timer | freeze timer tick |
| Paused | keep current elapsed value | none |
| Done | write history and PR to local storage | clear in-memory session |

### Sequence Examples

1. Challenge normal flow: Idle -> Detecting -> Running -> Done -> Idle.
2. Challenge loss flow: Idle -> Detecting -> Running -> Paused (loss) -> Running (resume) -> Done.
3. Camera denied flow: Idle -> start -> denied -> Running (Manual) -> Done.

## Camera Permission and Manual Fallback Flow

### Permission Decision Path

1. User pilih mode terlebih dahulu.
2. Saat user menekan Start pada Practice or Challenge, browser meminta izin kamera.
3. Jika granted: lanjut ke Detecting.
4. Jika denied atau dismissed: tampilkan modal dengan aksi Retry atau Use Manual Mode.
5. Jika permission revoked saat sesi berjalan: auto pause, lalu tawarkan Continue in Manual atau End Session.

### UX Rules

- Tidak ada permission prompt saat landing screen.
- Retry permission dipicu hanya oleh aksi user.
- Manual mode selalu menampilkan badge status agar user tahu sesi berjalan tanpa kamera.

## Mobile Lifecycle and Camera Cleanup Policy

### Lifecycle Rules

- On hide, tab switch, atau lock screen: timer pause, state menjadi Paused, dan camera tracks dihentikan.
- On return to app: timer tetap Paused; user harus tap Resume untuk lanjut.
- On session end: semua camera tracks wajib berhenti sebelum masuk Done.

### Cleanup Contract

- Camera stream wajib dilepas pada session end, app hide, dan permission revoked.
- Tidak boleh ada background camera processing setelah app hide.

### Interruption UI Status

| Trigger | UI Status | Timer |
| --- | --- | --- |
| app hidden or locked | Paused - tap resume to continue | paused |
| camera revoked | Camera unavailable - continue in manual? | paused |
| offline | Offline mode - data saved locally | running |

## Privacy and Local-Data Enforcement

### Data Boundaries

- Stored data: timestamp sesi, mode, durasi, status ringkas deteksi, dan PR.
- Not stored: frame kamera, video, atau data identitas pribadi.
- Data retention: disimpan sampai user menghapus secara eksplisit.

### User-Visible Privacy Messaging

- Onboarding copy wajib menyatakan data latihan tetap lokal dan kamera tidak direkam.
- Kamera permission rationale wajib menjelaskan pemrosesan lokal dan non-upload.

### User Data Controls

- Settings menyediakan aksi Clear All Session History and PR.
- Clear action memakai konfirmasi eksplisit dan feedback sukses.

## Mode Rules and PR Fairness

### Cross-Mode Behavior Matrix

| Scenario | Practice mode | Challenge mode | Manual mode |
| --- | --- | --- | --- |
| detection loss | warning only, timer continues | auto pause | not applicable |
| poor camera quality | warning only | warning only | not applicable |
| pause and resume | user-controlled | user-controlled after pause | user-controlled |
| scoring context | contributes to unified PR | contributes to unified PR | contributes to unified PR |

### Unified PR Rules

- Unified PR adalah durasi terbaik lintas mode.
- Session history selalu menampilkan mode badge agar konteks performa jelas.
- Session summary menampilkan durasi, mode, dan apakah sesi memecahkan PR.

## Offline Strategy (v1)

### First-Open Behavior

- First-open offline tanpa cache: tampilkan fallback screen yang meminta koneksi untuk load awal.
- Setelah load awal berhasil: core features tersedia offline.

### Offline-Ready Messaging

- Setelah service worker aktif: tampilkan indikator app ready for offline.
- Saat offline: tampilkan banner bahwa data tetap disimpan lokal.

### Update and Stale Policy

- v1 memakai manual check for updates dari Settings.
- Jika versi baru tersedia: user diminta reload untuk mengaktifkan aset terbaru.
- Jika update gagal: tetap jalankan versi cache yang sudah ada dengan warning ringan.

## Performance Budgets (v1)

### Core KPIs

- Challenge pause latency target: <= 300ms sejak detection loss tervalidasi.
- False pause budget: <= 1 false pause per 60 detik sesi challenge.
- Detector schedule default: 10 FPS (100ms interval), diturunkan adaptif pada device lemah.

### Runtime Degradation Policy

- Mid-range device: detector ke 150ms interval jika beban meningkat.
- Low-end device: detector ke 200ms interval dan tampilkan low-performance warning.
- Jika runtime tidak stabil, user diberi opsi berpindah ke manual mode tanpa kehilangan sesi.

## System-Wide Impact
- Interaction graph:
  - User pilih mode -> request permission (jika perlu) -> state machine berjalan -> sesi selesai -> session history dan PR diperbarui.
- Error propagation:
  - Kegagalan permission, detector init, stream interruption, dan local storage write harus dipetakan ke status UI yang terlihat.
- State lifecycle risks:
  - Risiko utama ada pada hide/show dan revoke permission; ditangani dengan pause eksplisit dan cleanup kamera.
- Integration test scenarios:
  - Kamera diizinkan vs ditolak.
  - Permission revoked saat sesi berjalan.
  - Online first load vs first-open offline vs offline setelah cache.
  - Deteksi stabil vs deteksi hilang sesaat.
  - Transisi foreground/background pada mobile browser.

## Acceptance Criteria
- [x] User dapat memulai sesi dari landing ke timer aktif dengan pengalaman cepat (target < 10 detik pada perangkat target).
- [x] User memilih mode sebelum permission prompt, dan flow deny or retry or manual fallback berjalan jelas.
- [x] Session state contract tersedia eksplisit (state definitions, transitions, guards, entry/exit actions).
- [x] Pada Challenge mode, detection loss > 500ms memicu pause instan dengan status UI jelas.
- [x] Pada Practice mode, detection loss hanya memunculkan warning tanpa auto-pause.
- [x] Manual mode dapat berjalan penuh saat kamera tidak tersedia, dengan mode badge yang terlihat.
- [x] Pada app hide or lock, timer pause dan kamera berhenti; on return user harus resume secara eksplisit.
- [x] Session end selalu menghentikan camera tracks.
- [x] Session history dan unified PR lintas mode tersimpan lokal dan terlihat di UI dengan mode context.
- [x] Privacy messaging tampil di onboarding dan permission rationale.
- [x] Settings menyediakan Clear All Session History and PR dengan konfirmasi.
- [x] Offline fallback untuk first-open tanpa cache tersedia.
- [x] Setelah cache aktif, core features tetap berjalan offline.
- [x] Settings menyediakan manual check for updates untuk cache baru.
- [x] KPI performa terdokumentasi: pause latency <= 300ms, false pause <= 1/60s challenge.
- [x] Tidak ada fitur akun atau cloud sync pada v1.

## Success Metrics
- Start experience: mayoritas user target berhasil masuk Running state dalam < 10 detik.
- Reliability: false pause pada Challenge <= 1 per 60 detik sesi.
- Responsiveness: pause latency pada Challenge <= 300ms setelah detection loss tervalidasi.
- Usability: jalur manual fallback dipakai sukses saat kamera ditolak atau revoked.
- Continuity: session history dan PR lokal terlihat konsisten lintas mode.

## Dependencies & Risks
- Dependensi:
  - Baseline app shell Svelte + Vite + PWA setup.
  - Face detection mechanism yang ringan untuk mobile web.
  - Local storage layer yang andal untuk session history dan PR.

| Risk | Mitigation |
| --- | --- |
| Perbedaan perilaku kamera dan autoplay policy antar browser mobile | Mode-first permission flow, explicit fallback, dan lifecycle cleanup contract |
| Beban deteksi tinggi pada low-end device | Detector interval degradation policy + manual mode option |
| False negative akibat posisi user atau pencahayaan | Warning states yang jelas + guard detection loss yang terukur |
| Ambiguitas scoring lintas mode | Unified PR rules + mode badges pada history dan summary |

## Sources & References
- Origin brainstorm: docs/brainstorms/2026-04-14-svelte-pwa-plank-challenge-mobile-brainstorm.md
- Local research:
  - Tidak ditemukan pola implementasi existing di repo (repo masih tahap awal).
  - Tidak ditemukan docs/solutions atau CLAUDE.md sebagai guidance tambahan.
