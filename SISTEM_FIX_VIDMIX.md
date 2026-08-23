# VIDMIX V2 - DOKUMENTASI SISTEM & STANDAR PENGEMBANGAN (FIXED)

Dokumen ini berisi arsitektur sistem, aturan render FFmpeg, standar komponen notifikasi (Toast), serta aturan agar fitur yang sudah **DONE / FIX** tidak berubah kembali.

---

## 1. Standar Notifikasi (Toast & Sound)

Semua notifikasi pop-up (toast) di aplikasi harus menggunakan modul terpusat di `src/utils/toast-helper.jsx` dengan gaya desain **Neo-Brutalism** (Border 4px hitam, shadow tebal, font tebal).

### File Lokasi
- [src/utils/toast-helper.jsx](file:///d:/Githab/vidmix%20v2/src/utils/toast-helper.jsx)

### Cara Memanggil:
```javascript
import { showToast, playLoudSuccessSound, playErrorSound } from '../../utils/toast-helper';

// 1. Notifikasi Sukses
showToast('Video berhasil dirender!', 'success');

// 2. Notifikasi Gagal / Error (otomatis memainkan suara error)
showToast('Gagal memproses file: ' + err.message, 'error');

// 3. Notifikasi Info
showToast('Silakan pilih folder terlebih dahulu', 'info');

// 4. Suara Sukses Keras (Bisa dipanggil saat render selesai)
playLoudSuccessSound();
```

---

## 2. Arsitektur Overlay & Rendering Video (FFmpeg)

### A. Transparansi Stiker / GIF / WebM (VP9 Alpha)
- **Masalah Sebelumnya**: Video transparan WebM (codec VP9) yang memiliki alpha channel sering menghasilkan background hitam pekat saat dirender FFmpeg.
- **Solusi Fix**: Menggunakan deteksi fungsi `getWebmDecoder()` di [electron/main.js](file:///d:/Githab/vidmix%20v2/electron/main.js):
  - Jika video WebM terdeteksi menggunakan VP9 alpha (`alpha_mode: 1`), ditambahkan opsi input `-vcodec libvpx-vp9`.
  - Format dikonversi ke `rgba` di complex filter (`[input:v]format=rgba`).

### B. Rasio Skala & Rotasi Watermark / Stiker
- **Masalah Sebelumnya**: Posisi dan bentuk watermark / stiker di canvas berbeda dengan hasil video (gepeng atau distorsi).
- **Solusi Fix**: 
  - Menggunakan `scale2ref=w='main_w*0.25*scale':h='-1':flags=lanczos` sehingga proporsi layer dihitung dinamis dari lebar frame video utama (25% dasar dikali scale).
  - Rotasi dihitung secara transparan dengan `rotate=rad:c=none:ow=rotw(rad):oh=roth(rad)`.

---

## 3. Modul yang Sudah Selesai (DONE / FIXED)

| Modul | Status | Deskripsi |
|---|---|---|
| **Video Editor** (`EditorView.jsx`, `VideoEditor.jsx`) | **DONE** | Multi-layer canvas, drag & drop, resize, watermark preset, render FFmpeg akurat 1:1. |
| **Video Mixer** (`Mixer.jsx`) | **DONE** | Acak audio/video, global watermark scale2ref, fast render & standard encode. |
| **Remove BG** (`RemoveBG.jsx`) | **DONE** | Chroma keying video/foto transparan WebM & PNG. |
| **Photo To Video** (`PhotoToVideo.jsx`) | **DONE** | Konversi foto diam ke video loop animasi MP4. |
| **Spectrum Generator** (`SpectrumGenerator.jsx`) | **DONE** | Linear / circular audio spectrum visualizer. |
| **Toast Helper** (`toast-helper.jsx`) | **DONE** | Notifikasi pop-up neo-brutalist & audio effect terpusat. |

---

## 4. Aturan Perubahan Kode (Code Stability Rules)
1. Jangan mengubah logika `buildImageOverlayFilter`, `getWebmDecoder`, atau `runFFmpegEditor` di `electron/main.js` tanpa alasan mendesak.
2. Gunakan selalu `npm run react:build` dan `node -c electron/main.js` untuk memvalidasi sintaks sebelum dijalankan.
3. Seluruh pop-up pesan harus memanggil `showToast()` agar tampilan selalu seragam dan konsisten.
