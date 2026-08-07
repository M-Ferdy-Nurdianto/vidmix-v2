# Arsitektur Sistem Vidmix v2

Vidmix v2 dibangun dengan pemisahan *concern* yang jelas antara antarmuka pengguna dan mesin pemroses media, memastikan performa yang ringan dan andal. Proyek ini mengoptimalkan ekosistem **Node.js** dan menghindari framework lain seperti PHP Laravel untuk memastikan integrasi *backend-frontend* yang *seamless* di desktop.

## Komponen Utama

1. **Frontend (React + Vite)**
   - Menangani UI interaktif dengan gaya desain *Neo-Brutalism* (batas tegas, warna mencolok).
   - Mengelola *state* pengguna (durasi, nama file, input folder).
2. **Backend / Main Process (Electron + Node.js)**
   - `main.js`: *Entry point* aplikasi desktop. Menangani akses *file system* native Windows dan pemanggilan proses `fluent-ffmpeg`.
   - `preload.js`: *Bridge* IPC (Inter-Process Communication) yang aman, mengekspos API sistem operasi dari Node.js ke React tanpa membuka celah keamanan web.
3. **Engine (FFmpeg)**
   - Dieksekusi melalui *spawn process* secara asinkron.
   - Menjalankan *Complex Filter* untuk menggabungkan banyak *stream* audio secara berurutan dan me-looping video sesuai target durasi.
