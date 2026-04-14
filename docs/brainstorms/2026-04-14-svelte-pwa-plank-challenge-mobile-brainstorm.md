---
date: 2026-04-14
topic: svelte-pwa-plank-challenge-mobile
---

# Svelte PWA Plank Challenge (iOS/Android Mobile Web)

## What We're Building
Kita akan membangun PWA mobile-first berbasis Svelte + Vite untuk plank challenge di browser iOS dan Android. Produk v1 fokus pada pengalaman yang cepat dimulai (target user bisa mulai sesi kurang dari 10 detik) dengan status yang jelas selama latihan. Aplikasi menyediakan dua mode: Practice (lebih fleksibel) dan Challenge (lebih ketat). Fitur inti tetap berguna saat offline setelah load awal: timer, status, sesi, riwayat, dan personal record (PR) berbasis penyimpanan lokal. Privasi jadi prinsip utama: pemrosesan kamera dan data latihan dilakukan lokal di device.

## Why This Approach
Kita mengevaluasi tiga arah: dual mode eksplisit, mode adaptif tunggal, dan manual-first dengan kamera opsional. Pilihan jatuh ke dual mode eksplisit karena paling seimbang untuk kebutuhan user saat ini: tetap nyaman dipakai (UX-first), tetapi tetap punya jalur challenge yang lebih fair. Mode adaptif tunggal terlihat sederhana, tetapi berisiko membingungkan karena perilaku sistem kurang dapat diprediksi. Pendekatan manual-first paling tahan terhadap masalah kamera, namun melemahkan value challenge berbasis deteksi. Pendekatan ini juga paling sesuai prinsip YAGNI karena fitur tidak melebar ke area yang belum dibutuhkan.

## Key Decisions
- Dual mode eksplisit (Practice + Challenge): memenuhi kebutuhan "keduanya" tanpa logika tersembunyi.
- Prioritas start cepat: alur awal harus sesingkat mungkin untuk mobile.
- Target pengguna campuran: pemula tetap nyaman, pengguna rutin tetap tertantang.
- Privasi lokal 100%: tidak ada upload video/foto ke server.
- Offline core wajib: fungsi latihan inti tetap berjalan offline.
- Fallback manual saat kamera ditolak: user tetap bisa latihan.
- PR gabungan lintas mode: satu best time tunggal untuk motivasi sederhana.
- Motivasi v1 seimbang antara PR dan konsistensi latihan.
- Bentuk challenge v1 kombinasi: free timer dan target durasi preset.
- Saat deteksi hilang, timer pause instan: menjaga aturan challenge tetap tegas.
- Saat kualitas kamera buruk, tampilkan peringatan saja: hindari interupsi otomatis berlebihan.
- Default kamera mobile: kamera depan (selfie) untuk start lebih cepat.
- Scope v1 local-first tanpa akun dan cloud sync: menjaga rilis cepat dan kompleksitas tetap rendah.

## Resolved Questions
- Goal v1 utama: UX latihan paling nyaman.
- Aturan sesi: mendukung mode ketat dan fleksibel.
- Definisi PR: personal record = best plank time.
- Sumber PR: gabungan semua mode.
- Target user: campuran.
- Fokus motivasi: PR dan konsistensi seimbang.
- Bentuk challenge: kombinasi free timer + preset.
- Toleransi deteksi hilang: pause instan.
- Kondisi kamera buruk: tampilkan peringatan saja.
- Default kamera: depan (selfie).

## Open Questions
- Tidak ada untuk fase brainstorming saat ini.

## Next Steps
-> `/ce-plan` for implementation details and execution breakdown.
