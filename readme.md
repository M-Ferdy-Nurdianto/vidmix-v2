# 🎬 Vidmix v2

**Vidmix v2** is a Desktop-based automated video and audio processing software built with Node.js, React, and Electron. Powered by the industry-standard **FFmpeg** engine, it allows users to batch-process videos, randomize or sequence music, apply seamless looping, generate beat-reactive audio spectrums, and efficiently remove green-screen backgrounds using hardware acceleration.

It features a high-grade **Hardware-bound License System** (anti-leak) and a secret **Master Control Panel (Owner Bypass)** for administration.

---

## 🌟 Key Features
- **Video Mixer (Batch Processing):** Drop multiple videos/audios, configure settings, and batch-render everything automatically.
- **Smart Audio Engine:** Uses the *Fisher-Yates Shuffle* algorithm for intelligent music randomization, or manual ordering via Drag & Drop.
- **Custom Looping & Seamless Transitions:** Flexible duration presets (15m, 30m, 1h, custom) with automatic cross-fade transitions.
- **Spectrum Maker:** Generate dynamic, beat-reactive audio visualization spectrums.
- **Remove Background:** Strip green screen backgrounds using FFmpeg's chromakey filters.
- **Military-Grade Security System:**
  - Licenses permanently bound to the customer's **Device ID**.
  - Cloud-secured encrypted database (via GitHub Gist).
  - **Master Control Panel:** Secret owner room (press `10-`) to manage license keys and enable Owner Bypass.
- **Neo-Brutalism UI:** A bold, dynamic, and highly aesthetic user interface with precise real-time progress bars.

---

## 🚀 How to Run (Development)
Ensure you have **Node.js** (v18+) installed. *(FFmpeg is bundled automatically, no separate installation required!)*

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

## 📦 Build for Production
To package the application into standalone `.exe` and `.zip` files (ready for distribution):
```bash
npm run electron:build
```
The output files will be generated in the `dist-electron/` folder.

---

## ©️ Copyright & License

**Copyright © 2026 M. Ferdy Nurdianto. All rights reserved.**

This software and its underlying source code are proprietary and confidential. Unauthorized copying, distribution, modification, or sale of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder. 

*Designed and developed by M. Ferdy Nurdianto.*
