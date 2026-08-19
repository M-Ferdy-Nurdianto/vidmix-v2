# 🎬 Vidmix v2

*(Scroll down for English version)*

**Vidmix v2** adalah perangkat lunak otomasi pengolahan video dan audio berbasis Desktop yang dibangun menggunakan Node.js, React, dan Electron. Ditenagai oleh *engine* standar industri **FFmpeg**, aplikasi ini memungkinkan pengguna untuk memproses video secara massal (*batch*), menyatukan musik acak atau berurutan, menerapkan pemutaran berulang (*looping*), membuat spektrum audio, hingga menghapus latar belakang video secara efisien menggunakan akselerasi perangkat keras (*hardware acceleration*).

Aplikasi ini juga dilengkapi dengan **Sistem Lisensi Berbasis Perangkat (Hardware-bound License System)** tingkat tinggi yang dirancang anti-bocor, serta **Panel Kontrol Master (Owner Bypass)** khusus untuk administrator.

---

## 🇮🇩 Bahasa Indonesia

### 🌟 Fitur Utama
- **Video Mixer (Batch Processing):** Masukkan banyak video dan audio sekaligus, atur konfigurasi, dan *render* semuanya secara otomatis.
- **Smart Audio Engine:** Menggunakan algoritma *Fisher-Yates Shuffle* untuk mengacak urutan musik secara cerdas, atau gunakan urutan manual (*Drag & Drop*).
- **Custom Looping & Seamless Transitions:** Pilihan preset durasi (15 menit, 30 menit, 1 jam, atau kustom) dengan transisi *fade-in/fade-out* otomatis agar pergantian audio terdengar sangat mulus.
- **Spectrum Maker:** Buat visualisasi audio (spektrum) yang reaktif terhadap ketukan lagu (*beat-reactive*).
- **Remove Background:** Hapus latar belakang hijau (*green screen*) pada video menggunakan filter warna FFmpeg (*chromakey*).
- **Sistem Keamanan Kelas Militer (Baru!):**
  - Lisensi dikunci secara permanen ke **Device ID** milik pelanggan (anti-bocor/anti-pembajakan).
  - *Database* terenkripsi yang diamankan di Cloud (GitHub Gist).
  - **Master Control Panel:** Ruang rahasia (tekan `10-`) bagi *Owner* untuk menghasilkan dan mencabut kunci lisensi, lengkap dengan fitur *Owner Bypass* (Otomatis masuk tanpa lisensi bagi pemilik aplikasi).
- **Real-Time Progress & Neo-Brutalism UI:** Tampilan antarmuka yang sangat tebal, berani, dinamis, dan estetik dengan bilah progres yang *real-time*.

### 🚀 Cara Menjalankan (Development)
Pastikan Anda sudah menginstal **Node.js** (v18+) di komputer Anda. (Aplikasi ini sudah membundel FFmpeg secara otomatis, sehingga Anda *tidak perlu* menginstal FFmpeg secara terpisah!)

1. *Clone* repositori ini:
   ```bash
   git clone https://github.com/M-Ferdy-Nurdianto/vidmix-v2.git
   cd vidmix-v2
   ```
2. Instal semua dependensi:
   ```bash
   npm install
   ```
3. Jalankan aplikasi:
   ```bash
   npm run electron:dev
   ```

### 📦 Cara Build (Produksi)
Untuk mem-paket aplikasi menjadi file `.exe` dan `.zip` (siap diedarkan ke pelanggan):
```bash
npm run electron:build
```
Hasil file akan muncul di dalam folder `dist-electron/`.

---
---

## 🇬🇧 English Version

### 🌟 Key Features
- **Video Mixer (Batch Processing):** Drop multiple videos and audio files, configure your settings, and batch-render everything automatically.
- **Smart Audio Engine:** Utilizes the *Fisher-Yates Shuffle* algorithm for intelligent music randomization, or manual ordering via a Drag & Drop interface.
- **Custom Looping & Seamless Transitions:** Flexible duration presets (15m, 30m, 1h, custom) with automatic fade-in/fade-out transitions ensuring seamless audio joining.
- **Spectrum Maker:** Generate beat-reactive audio visualization spectrums dynamically.
- **Remove Background:** Easily strip green screen backgrounds from videos utilizing FFmpeg's chromakey filters.
- **Military-Grade Security System (New!):**
  - Licenses are permanently bound to the customer's **Device ID** (leak-proof & anti-piracy).
  - Cloud-secured encrypted database (via GitHub Gist).
  - **Master Control Panel:** A secret room (press `10-`) for the Owner to generate and revoke license keys, featuring an *Owner Bypass* (Automatic login for the app owner without needing a license).
- **Real-Time Progress & Neo-Brutalism UI:** A bold, dynamic, and highly aesthetic user interface with precise real-time progress bars.

### 🚀 How to Run (Development)
Ensure you have **Node.js** (v18+) installed on your system. (This application automatically bundles FFmpeg, so you do *not* need to install it separately!)

1. Clone the repository:
   ```bash
   git clone https://github.com/M-Ferdy-Nurdianto/vidmix-v2.git
   cd vidmix-v2
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm run electron:dev
   ```

### 📦 Build for Production
To package the application into standalone `.exe` and `.zip` files (ready for distribution):
```bash
npm run electron:build
```
The output files will be generated in the `dist-electron/` folder.

---

## ©️ Copyright & License

**Copyright © 2026 M. Ferdy Nurdianto. All rights reserved.**

This software and its underlying source code are proprietary and confidential. Unauthorized copying, distribution, modification, or sale of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder. 

*VidMix is designed and developed by M. Ferdy Nurdianto.*
