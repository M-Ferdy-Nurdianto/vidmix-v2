# Vidmix v2 🎬🎧

![Vidmix v2 Logo](public/favicon-32x32.png)

**[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)**

---

<a name="english"></a>
## 🇬🇧 English

Vidmix v2 is a **Desktop Automation Software** built with **Node.js, React, and Electron**, designed specifically with a striking **Neo-Brutalism** interface. This software leverages the power of **FFmpeg** to automatically mix video and audio with random shuffling, seamless looping, and crossfade transitions.

### 🌟 Key Features
- **Fisher-Yates Shuffle Algorithm:** Dynamically randomizes up to 20 songs for up to 5 videos. Each generated video will have a unique sequence of songs.
- **Interactive Custom Audio Ordering:** Choose between the classic automatic randomizer or manually set the precise order of your songs using an intuitive Drag & Drop list interface.
- **Custom Looping & Transitions:** Set loop presets (15 mins, 30 mins, 1 hr, or custom). Videos loop seamlessly, and audio transitions are smoothed with an automatic *Fade-In* and *Fade-Out* mechanism to prevent abrupt cuts.
- **State Persistence:** Automatically remembers the last used directories for videos, audios, and outputs.
- **Real-Time Progress & ETA:** A full-screen interactive overlay blocks UI spamming and displays a precise progress bar along with the Estimated Time of Arrival (ETA).
- **Safety Pre-flight Checks:** Prevents accidental overwrites by warning you if an output file name already exists before rendering begins.

### 🛠️ Prerequisites
- **Node.js** (v18 or newer)
- **FFmpeg** installed and registered in your Windows environment `PATH`.

### 🚀 How to Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/M-Ferdy-Nurdianto/vidmix-v2.git
   cd vidmix-v2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application (Development Mode):**
   ```bash
   npm run electron:dev
   ```

### 📦 Build for Production
To package the app into a standalone `.exe` for Windows:
*(Ensure you have electron-builder or equivalent configured)*
```bash
npm run electron:build
```

---

<a name="bahasa-indonesia"></a>
## 🇮🇩 Bahasa Indonesia

Vidmix v2 adalah perangkat lunak *desktop automation* berbasis **Node.js, React, dan Electron**, dirancang khusus dengan antarmuka **Neo-Brutalism** yang dinamis. Perangkat lunak ini memanfaatkan kekuatan **FFmpeg** untuk melakukan *mixing* video dan audio secara otomatis.

### 🌟 Fitur Utama
- **Algoritma Shuffle Fisher-Yates:** Mengacak hingga 20 lagu untuk maksimal 5 video secara dinamis. Setiap video yang di-render akan memiliki urutan lagu yang benar-benar berbeda.
- **Pengaturan Urutan Audio Interaktif:** Pilih antara pengacak otomatis (acak independen tiap video) atau atur urutan lagu secara persis sesuai keinginan Anda melalui fitur geser (*Drag & Drop*) yang mulus.
- **Looping Kustom & Transisi Mulus:** Preset 15 menit, 30 menit, 1 jam, atau durasi kustom. Video akan di-loop tanpa henti, dan audio digabungkan dengan efek *Fade-In* serta *Fade-Out* di ujung durasi agar suara tidak terpotong tiba-tiba ("patah banget").
- **State Persistence:** Menyimpan riwayat direktori folder (video, musik, output) terakhir yang Anda gunakan.
- **Progress Bar & Estimasi Waktu (ETA):** Pop-up layar penuh yang mencegah klik ganda tak disengaja, lengkap dengan bar progres *real-time* dan kalkulasi sisa waktu *render*.
- **Pengecekan File Duplikat:** Mencegah Anda menimpa file lama secara tidak sengaja dengan memunculkan peringatan jika nama file output sudah ada di folder.

### 🛠️ Prasyarat
- **Node.js** (v18 atau lebih baru)
- **FFmpeg** terinstal dan terdaftar di `PATH` environment Windows.

### 🚀 Cara Menjalankan

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/M-Ferdy-Nurdianto/vidmix-v2.git
   cd vidmix-v2
   ```

2. **Instal dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan aplikasi (Mode Development):**
   ```bash
   npm run electron:dev
   ```

### 📦 Build untuk Produksi
Untuk menjadikan aplikasi ini sebagai file `.exe` yang bisa dijalankan langsung di Windows:
*(Pastikan Anda telah mengonfigurasi electron-builder atau modul sejenis)*
```bash
npm run electron:build
```

---
*Developed by [M-Ferdy-Nurdianto](https://github.com/M-Ferdy-Nurdianto)*
