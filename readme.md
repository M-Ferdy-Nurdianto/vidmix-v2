# Vidmix v2 🎬🎧

![Vidmix v2 Logo](public/favicon-32x32.png)

**[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)**

---

<a name="english"></a>
## 🇬🇧 English

### 🚀 The Ultimate Media Automation Engine for Content Creators
Are you a content creator, video editor, or social media manager tired of manually mixing background music into dozens of videos? **Vidmix v2** is here to automate your entire workflow. 

**Vidmix v2** is a high-performance **Desktop Automation Software** built with Node.js, React, and Electron. Powered by the industry-standard **FFmpeg engine**, it allows you to batch-process videos, inject randomized or custom-ordered music, apply custom looping, and render everything at blazing speeds using Hardware Acceleration (GPU/CPU Smart-Detect).

All of this power is wrapped in a stunning, highly interactive **Neo-Brutalism** UI that makes batch rendering feel less like a chore and more like a premium experience.

### 💡 Why Choose Vidmix v2?
- **Massive Time Saver:** What usually takes hours in Premiere Pro or CapCut now takes minutes. Drop your videos, drop your music, and hit generate.
- **Perfect for YouTubers & TikTokers:** Create 15-minute, 30-minute, or 1-hour looped videos (perfect for compilations, ambient videos, or Lo-Fi streams) in just one click.
- **Zero Audio Jumps:** Professional *Fade-In* and *Fade-Out* transitions are automatically applied to the music, guaranteeing a smooth listener experience.
- **Built for Scale:** Processes multiple heavy video files concurrently without breaking a sweat.

### 🌟 Key Features
- **Smart Audio Engine:** Choose between the **Fisher-Yates Shuffle Algorithm** (automatically randomizes a unique music sequence for each video) or **Interactive Custom Ordering** (use a sleek Drag & Drop interface to set the exact playlist).
- **Custom Looping & Seamless Transitions:** Set loop presets effortlessly. Videos loop seamlessly, and audio transitions are smoothed automatically.
- **State Persistence:** Never lose your workflow. The app remembers your last used directories automatically.
- **Real-Time Progress & ETA:** A full-screen interactive overlay blocks UI spamming and displays a precise progress bar along with a live Estimated Time of Arrival (ETA).
- **Safety Pre-flight Checks:** Prevents accidental overwrites by warning you if an output file name already exists.

### 🛠️ Prerequisites
- **Node.js** (v18 or newer)
- **FFmpeg** installed and registered in your Windows environment `PATH`.

### 💻 How to Run

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

### 🚀 Mesin Automasi Media Terbaik untuk Content Creator
Apakah Anda seorang *content creator*, editor video, atau manajer media sosial yang lelah menggabungkan musik latar ke puluhan video secara manual? **Vidmix v2** hadir untuk mengotomatisasi seluruh alur kerja Anda.

**Vidmix v2** adalah **Perangkat Lunak Automasi Desktop** berperforma tinggi yang dibangun menggunakan Node.js, React, dan Electron. Ditenagai oleh **FFmpeg**, aplikasi ini memungkinkan Anda memproses video secara massal (*batch-process*), menyuntikkan musik yang diacak atau diurutkan sendiri, menerapkan *looping* durasi panjang, dan me-render semuanya dengan kecepatan tinggi menggunakan Akselerasi Perangkat Keras (Deteksi Pintar GPU/CPU).

Semua kecanggihan ini dibungkus dalam antarmuka **Neo-Brutalism** yang memukau dan interaktif, membuat proses *render* massal tidak lagi membosankan, melainkan terasa seperti pengalaman premium.

### 💡 Mengapa Memilih Vidmix v2?
- **Sangat Menghemat Waktu:** Apa yang biasanya memakan waktu berjam-jam di Premiere Pro atau CapCut kini bisa selesai dalam hitungan menit. Cukup *drop* video Anda, *drop* musiknya, dan klik *generate*.
- **Cocok untuk YouTuber & TikToker:** Buat video *looping* 15 menit, 30 menit, atau 1 jam (sangat cocok untuk kompilasi, video suasana/ambience, atau *stream* Lo-Fi) hanya dengan satu klik.
- **Transisi Audio Profesional:** Transisi *Fade-In* dan *Fade-Out* otomatis diterapkan pada musik, menjamin pendengar tidak akan merasakan potongan lagu yang kasar atau tiba-tiba.
- **Diciptakan untuk Skala Besar:** Memproses banyak file video berukuran besar secara bersamaan tanpa kendala.

### 🌟 Fitur Utama
- **Mesin Audio Pintar:** Pilih antara **Algoritma Shuffle Fisher-Yates** (mengacak urutan musik secara otomatis agar berbeda di setiap video) atau **Pengaturan Interaktif Manual** (gunakan antarmuka *Drag & Drop* yang mulus untuk menentukan urutan *playlist* secara pasti).
- **Looping Kustom & Transisi Mulus:** Preset durasi yang sangat fleksibel (15m, 30m, 1j, kustom). Video akan di-loop tanpa henti, dan audio digabungkan dengan halus.
- **Memori Cerdas (State Persistence):** Aplikasi akan secara otomatis mengingat folder video, musik, dan output terakhir yang Anda gunakan.
- **Progress Bar & Estimasi Waktu (ETA):** Pop-up layar penuh yang mencegah klik tak disengaja, lengkap dengan bar progres *real-time* dan kalkulasi sisa waktu *render*.
- **Pengecekan File Duplikat:** Mencegah penimpaan file (overwrite) secara tidak sengaja dengan sistem peringatan dini.

### 🛠️ Prasyarat
- **Node.js** (v18 atau lebih baru)
- **FFmpeg** terinstal dan terdaftar di `PATH` environment Windows Anda.

### 💻 Cara Menjalankan

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
Untuk menjadikan aplikasi ini sebagai file `.exe` mandiri yang siap diinstal di Windows:
*(Pastikan Anda telah mengonfigurasi electron-builder)*
```bash
npm run electron:build
```

---
*Created by [M-Ferdy-Nurdianto (IG: @ikifer)](https://github.com/M-Ferdy-Nurdianto)*
