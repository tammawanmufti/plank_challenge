---
title: feat: Face Countdown Gating for Timer
type: feat
status: completed
date: 2026-04-14
origin: docs/brainstorms/2026-04-14-svelte-pwa-plank-challenge-mobile-brainstorm.md
---

# feat: Face Countdown Gating for Timer

## Overview
Menambahkan mekanisme countdown berbasis deteksi wajah agar timer tidak langsung berjalan saat start, dan tidak langsung pause saat wajah hilang.

## Problem Statement / Motivation
Saat ini timer berjalan segera setelah wajah stabil terdeteksi, lalu mode challenge akan auto-pause segera setelah guard kehilangan wajah terpenuhi. Perilaku ini belum memenuhi flow UX yang diminta:
- Saat start dan wajah ditemukan, tampil countdown 3,2,1 lalu timer berjalan.
- Saat wajah hilang, tampil countdown 5,4,3,2,1 sambil timer berhenti sementara.
- Jika wajah muncul kembali di tengah countdown kehilangan wajah, timer lanjut tanpa menunggu countdown selesai.

## Proposed Solution
Menerapkan dua phase countdown pada sesi berbasis kamera (practice dan challenge):
1. `start-countdown` (3 detik): aktif ketika wajah stabil pertama kali terdeteksi dari state detecting.
2. `loss-countdown` (5 detik): aktif ketika wajah tidak terdeteksi saat timer sedang running.

### Behavioral Rules
- Timer hanya berjalan pada state `running` dan tidak bertambah saat countdown aktif.
- `start-countdown` batal jika wajah hilang sebelum selesai, lalu kembali menunggu deteksi stabil.
- `loss-countdown` dimulai saat wajah hilang, timer pause selama countdown.
- Jika wajah kembali sebelum `loss-countdown` selesai, countdown dibatalkan dan timer langsung lanjut.
- Jika `loss-countdown` selesai dan wajah masih hilang, sesi tetap paused menunggu wajah kembali (atau aksi user).

## Technical Approach
- Tambahkan state UI countdown di komponen utama untuk membedakan fase start/loss.
- Tambahkan interval countdown terpisah dari interval timer dan detector.
- Integrasikan countdown dengan event deteksi wajah:
  - detect stable -> mulai start countdown
  - face lost while running -> mulai loss countdown dan pause timer
  - face detected while loss countdown -> cancel loss countdown dan resume timer
- Perbarui status text agar user selalu tahu alasan timer berjalan/pause.

### Countdown Runtime Contract
- Field baru runtime:
  - `countdownPhase: 'none' | 'start' | 'loss'`
  - `countdownValue: number`
  - `countdownInterval: ReturnType<typeof setInterval> | null`
- Invariant:
  - Saat `countdownPhase !== 'none'`, timer interval harus tidak aktif.
  - Detector loop tetap aktif pada sesi kamera agar bisa menangkap wajah kembali.

### Event and Transition Matrix

| Kondisi | Event | Aksi | Hasil |
| --- | --- | --- | --- |
| `detecting`, wajah stabil | stable-detected | mulai `start-countdown(3)` | timer belum jalan |
| `start-countdown`, wajah hilang | face-lost | cancel countdown | kembali menunggu stable detection |
| `start-countdown` selesai | tick=0 | `beginRunning()` | timer berjalan |
| `running`, wajah hilang | face-lost | pause timer + mulai `loss-countdown(5)` | status pending resume |
| `loss-countdown`, wajah kembali | stable-detected | cancel countdown + `beginRunning()` | timer lanjut |
| `loss-countdown` selesai, wajah belum ada | tick=0 | tetap `paused` | menunggu wajah/user |

### Detailed Implementation Plan

#### Phase 1: Runtime state and helpers
- Tambah variabel countdown runtime di `App.svelte`.
- Buat helper:
  - `clearCountdown()` untuk stop interval countdown.
  - `startCountdown(phase, from)` untuk inisialisasi nilai dan interval.
  - `handleCountdownTick()` untuk decrement dan trigger aksi saat mencapai 0.

#### Phase 2: Detector loop integration
- Saat deteksi stabil pertama kali di `detecting`, jangan langsung `beginRunning`; panggil `startCountdown('start', 3)`.
- Saat wajah hilang ketika `running`, jalankan `pauseSession(...)` lalu `startCountdown('loss', 5)`.
- Saat wajah kembali ketika `countdownPhase === 'loss'`, batalkan countdown dan lanjutkan timer.
- Saat wajah hilang ketika `countdownPhase === 'start'`, batalkan countdown agar user harus stabil lagi.

#### Phase 3: UI and status messages
- Tampilkan angka countdown aktif di panel timer.
- Copy status yang wajib:
  - Start countdown: `"Wajah terdeteksi. Timer mulai dalam 3..2..1"`
  - Loss countdown: `"Wajah hilang. Timer lanjut lagi dalam 5..1 jika wajah kembali"`
  - Loss selesai tanpa wajah: `"Wajah belum kembali. Sesi tetap pause"`

#### Phase 4: Cleanup and lifecycle consistency
- `resetRuntimeForNewSession`, `finishSession`, `onDestroy`, dan `onVisibilityChange` wajib memanggil `clearCountdown()`.
- Pastikan tidak ada countdown interval bocor saat permission modal muncul.

### Edge Cases
- Wajah flicker di sekitar threshold:
  - Gunakan `stableFrames` existing agar countdown tidak sering restart.
- User tekan `Pause` saat countdown aktif:
  - Countdown dibatalkan dan sesi masuk paused biasa.
- User tekan `Stop` saat countdown aktif:
  - Countdown dibatalkan, sesi langsung selesai.
- App masuk background saat countdown aktif:
  - Countdown dibatalkan, status paused, kamera ditutup.
- Permission revoked saat loss countdown:
  - Countdown dibatalkan, tampil modal revoked.

## Acceptance Criteria
- [x] Start pada mode kamera menampilkan countdown 3,2,1 setelah wajah ditemukan, lalu timer mulai.
- [x] Saat wajah hilang ketika timer berjalan, tampil countdown 5,4,3,2,1 dan timer tidak bertambah.
- [x] Jika wajah kembali di tengah countdown 5..1, timer langsung lanjut dan countdown hilang.
- [x] Jika countdown 5..1 habis dan wajah belum kembali, sesi tetap paused sampai wajah terdeteksi kembali atau user memilih aksi lain.
- [x] Manual mode tetap bekerja seperti sebelumnya (tanpa countdown wajah).
- [x] UI menampilkan status countdown dengan copy yang jelas.

## Risks & Mitigations
- Risiko race condition antar interval detector, timer, dan countdown.
  - Mitigasi: buat helper tunggal untuk start/stop countdown dan reset state saat transisi.
- Risiko status UI membingungkan.
  - Mitigasi: copy status spesifik per fase countdown.

## Validation Plan (UI)
- Uji start session kamera: wajah terdeteksi -> countdown 3..1 -> timer running.
- Uji wajah hilang saat running: countdown 5..1 muncul dan timer freeze.
- Uji wajah kembali sebelum countdown loss selesai: timer lanjut tanpa reset durasi.
- Uji wajah tidak kembali sampai countdown loss selesai: sesi tetap paused.
- Uji manual mode: start langsung running tanpa countdown wajah.

## Manual QA Script
1. Buka mode Challenge, tekan Start, posisikan wajah di frame.
2. Verifikasi countdown 3,2,1 terlihat sebelum timer bertambah.
3. Saat timer sudah berjalan, keluar dari frame kamera.
4. Verifikasi countdown 5,4,3,2,1 terlihat dan nilai timer tidak bertambah.
5. Masuk kembali ke frame sebelum countdown habis.
6. Verifikasi countdown hilang dan timer lanjut dari nilai terakhir (tidak reset).
7. Ulangi langkah 3 lalu biarkan countdown habis tanpa wajah.
8. Verifikasi sesi tetap paused sampai wajah kembali atau user menekan aksi lain.

## Implementation Notes
- Implementasi countdown dilakukan di App runtime dengan phase `start` (3 detik) dan `loss` (5 detik).
- Browser test berhasil memverifikasi jalur UI utama, termasuk permission modal dan fallback ke manual mode.
- Verifikasi countdown berbasis kamera real-device perlu dilanjutkan pada perangkat dengan akses kamera aktif.
