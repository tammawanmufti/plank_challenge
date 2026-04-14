---
title: fix: Mobile LAN Camera Access Misclassified as Revoked
type: fix
status: active
date: 2026-04-15
origin: docs/brainstorms/2026-04-14-svelte-pwa-plank-challenge-mobile-brainstorm.md
---

# fix: Mobile LAN Camera Access Misclassified as Revoked

## Overview
Saat aplikasi diakses dari perangkat mobile melalui URL LAN HTTP (`http://192.168.x.x:5173`), user tidak bisa memulai kamera dan UI menampilkan modal `Akses kamera dicabut`. Pesan ini membingungkan karena problem utamanya bukan revoke oleh user di tengah sesi, melainkan konteks origin yang tidak memenuhi syarat kamera.

## Problem Statement / Motivation
Flow saat ini mencampur beberapa kondisi berbeda menjadi pesan yang sama (`revoked`), sehingga user mendapat guidance yang salah.

Dampak ke UX:
- User merasa sudah mencabut izin, padahal belum tentu.
- User tidak mendapat instruksi paling penting: akses kamera di mobile browser membutuhkan context aman (HTTPS atau localhost).
- Retry berulang sering gagal dengan hasil sama karena root cause tidak berubah.

## Current Behavior
- `startSession()` memanggil `ensureCamera()` lalu menangani error startup via `handleStartupFailure`.
- Error startup kamera tertentu masuk kategori `permission`/`camera`, lalu UI menampilkan modal denied/revoked.
- Pada akses LAN HTTP non-secure, browser dapat mengembalikan error yang saat ini dipetakan ke alur permission/camera umum.

## Proposed Solution
Pisahkan kondisi insecure origin dari kondisi izin dicabut/revoked:

1. Tambahkan deteksi eksplisit insecure context sebelum alur kamera dijalankan.
2. Perluas klasifikasi startup error agar dapat mengidentifikasi `insecure-context`.
3. Tambahkan varian modal permission baru untuk kondisi insecure context dengan copy yang actionable.
4. Pertahankan fallback manual mode tanpa regresi.

## Deepened Technical Design

### Error Taxonomy Contract
- Existing:
  - `permission`: user/browser menolak izin kamera.
  - `camera`: perangkat kamera tidak tersedia atau tidak bisa dibaca.
  - `detector`: inisialisasi model/detector gagal.
  - `unknown`: fallback untuk kasus tidak terklasifikasi.
- New:
  - `insecure-context`: origin tidak memenuhi syarat akses kamera (HTTP non-localhost, atau browser mengindikasikan secure-context requirement).

### Runtime State and UI Contract Changes
- Tambah varian modal:
  - dari: `'denied' | 'revoked' | null`
  - menjadi: `'denied' | 'revoked' | 'insecure' | null`
- Headline modal per kondisi:
  - `denied`: `Izin kamera ditolak`
  - `revoked`: `Akses kamera dicabut`
  - `insecure`: `Kamera membutuhkan koneksi aman`
- Body copy `insecure` wajib actionable:
  - inform user untuk buka via `https://...` atau `localhost`
  - tetap tawarkan `Use Manual mode`

### Startup and Resume Handling Matrix

| Flow | Kondisi | Hasil UI | Aksi Runtime |
| --- | --- | --- | --- |
| Start | `!window.isSecureContext` | modal `insecure` | jangan panggil `getUserMedia`; kamera tetap `null` |
| Start | error terklasifikasi `insecure-context` | modal `insecure` | cleanup interval/camera, status spesifik |
| Start | error `permission` | modal `denied` | cleanup + guidance retry/manual |
| Start | error `camera` | modal `revoked` | cleanup + guidance manual |
| Resume | insecure context terdeteksi | modal `insecure` | jangan retry camera path |
| Resume | error `permission`/`camera` | modal `revoked` | tetap sama seperti perilaku existing |

### Classification Heuristics (Cross-Browser)
Untuk menurunkan false-classification, classifier `insecure-context` menggunakan kombinasi:
- Signal struktural: environment non-secure (`window.isSecureContext === false`) pada jalur kamera.
- Signal error payload:
  - `name` mengandung `SecurityError`, atau
  - `message` mengandung frasa seperti `secure context`, `only secure origins`, `insecure`, `https`.

Jika ada konflik sinyal:
- Prioritaskan `insecure-context` untuk jalur startup/resume kamera ketika environment non-secure.

### File-Level Implementation Plan
- `web/src/lib/startupErrors.ts`
  - tambah type `insecure-context`.
  - tambah helper deteksi message pattern insecure origin.
  - update `classifyStartupError` agar dapat memetakan insecure context.
- `web/src/App.svelte`
  - tambah modal state `insecure`.
  - tambah preflight check secure context sebelum `ensureCamera()`.
  - update `handleStartupFailure` dan `handleResumeFailure` untuk cabang insecure.
  - update copy di blok modal agar tiap state punya pesan tepat.
- `web/src/lib/startupErrors.test.ts`
  - tambah test untuk `SecurityError` + insecure message.
  - tambah test untuk `NotAllowedError` pada insecure message dipetakan ke `insecure-context` (bukan `permission`).

### Edge Cases
- User membuka via `localhost` di desktop:
  - tetap dianggap secure, flow kamera normal.
- User membuka via LAN IP dengan HTTPS valid:
  - `window.isSecureContext` true, flow kamera normal.
- User pindah mode ke manual setelah modal insecure muncul:
  - session harus tetap bisa start tanpa kamera.
- User menekan retry berulang saat origin masih non-secure:
  - tetap dapat pesan `insecure`, tanpa berpindah ke `revoked`.

### Verification Matrix (Manual + Automated)

| Case | Environment | Expected |
| --- | --- | --- |
| Camera start on localhost | desktop localhost | tidak muncul modal insecure |
| Camera start on LAN HTTP mobile | `http://192.168.x.x` | modal insecure + guidance HTTPS/localhost |
| Denied permission on secure context | HTTPS/localhost + deny dialog | modal denied |
| Track ended while running | secure context, revoke di OS/browser | modal revoked |
| Continue manual from insecure modal | LAN HTTP mobile | timer jalan pada manual mode |

### Rollout Notes
- Perubahan ini backward-compatible untuk flow normal pada secure context.
- Fokus utama QA: regresi copy modal dan transisi state `paused/running` saat fallback manual.

## Scope
- In scope:
  - Perbaikan klasifikasi error startup kamera untuk context non-aman.
  - Perubahan copy UI modal agar lebih presisi untuk kasus insecure context.
  - Penyesuaian status text agar user tahu langkah perbaikan.
  - Update unit test untuk klasifikasi startup error.
- Out of scope:
  - Setup HTTPS dev certificate otomatis.
  - Perubahan arsitektur besar di state machine.

## Acceptance Criteria
- [ ] Saat app dibuka dari origin non-secure pada mobile LAN HTTP, user **tidak** melihat pesan `Akses kamera dicabut` sebagai default.
- [ ] App menampilkan pesan khusus bahwa kamera membutuhkan context aman (HTTPS/localhost) dengan instruksi jelas.
- [ ] Retry dari modal insecure context tidak menampilkan error misleading yang sama tanpa context.
- [ ] Tombol `Use Manual mode` tetap berfungsi dan sesi bisa berjalan.
- [ ] Flow existing untuk permission denied dan camera revoked tetap bekerja seperti sebelumnya.
- [ ] Unit test klasifikasi startup error mencakup insecure-context case.

## Implementation Tasks
- [x] Tambah util pendeteksi secure-camera-context (berbasis `window.isSecureContext` dan hostname).
- [x] Update `startupErrors.ts` untuk mengeluarkan tipe error baru `insecure-context`.
- [x] Update `App.svelte`:
  - [x] Tambah tipe modal baru untuk insecure context.
  - [x] Ubah handling startup/resume agar menampilkan copy yang tepat.
  - [x] Pastikan fallback manual mode tetap mulus.
- [x] Tambah/ubah test pada `session` startup error path.
- [x] Build dan jalankan test untuk verifikasi.

## Validation Plan (UI)
1. Jalankan app di desktop localhost: camera flow normal tetap berjalan.
2. Jalankan app via URL LAN HTTP dari mobile: verifikasi muncul modal/pesan insecure context yang jelas.
3. Klik `Use Manual mode`: sesi harus bisa start.
4. Verifikasi alur `permission denied` normal (blok izin kamera dari browser) tetap menampilkan pesan denied, bukan insecure.
5. Verifikasi alur revoked (track ended) tetap menampilkan pesan revoked.

## Risks & Mitigations
- Risiko false-positive insecure detection pada lingkungan tertentu.
  - Mitigasi: gunakan `window.isSecureContext` sebagai sinyal utama; hostname hanya sebagai guard pendukung.
- Risiko regress pada modal state.
  - Mitigasi: tambah cabang state eksplisit dan unit tests untuk klasifikasi error.

## Sources
- Origin brainstorm: docs/brainstorms/2026-04-14-svelte-pwa-plank-challenge-mobile-brainstorm.md
- Relevant implementation:
  - web/src/App.svelte
  - web/src/lib/startupErrors.ts
  - web/src/lib/startupErrors.test.ts
