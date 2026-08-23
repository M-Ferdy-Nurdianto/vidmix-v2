# 🤖 AI Assistant Guidelines & Codebase Architecture

This document is specifically tailored for AI Assistants (Claude, Gemini, Copilot, ChatGPT, etc.) working on **Vidmix v2**. Read this carefully to avoid breaking fragile logic, specifically regarding FFmpeg and UI synchronization.

---

## 🛑 STRICT RULES FOR AI (CRITICAL)

1. **FRAGILE FFmpeg FILTER CHAINS**: 
   - Never alter the order of `filter_complex` chains (`filterParts.push(...)`) in `electron/main.js` unless absolutely certain. 
   - A single missing comma, wrong variable, or invalid input label will crash the render completely.
2. **WYSIWYG Synchronization (Canvas vs Render)**: 
   - Visual output in React (`LayerCanvas.jsx`) MUST perfectly match FFmpeg's rendered output.
   - **DO NOT TOUCH THE `scale2ref` LOGIC**: In `main.js`, overlays use `scale2ref=w='iw*0.25*${scale}':h='-1'` to scale stickers relative to the main video width (25%). React UI uses `width: '25%'`. DO NOT revert this to absolute pixels (`maxWidth: 300px`) or standard `scale=iw`.
3. **Photo Format & GPU Crashing**: 
   - Photos/PNGs with Alpha Channels (RGBA) will crash the `h264_nvenc` GPU encoder. 
   - **DO NOT REMOVE** the `format=yuv420p` filter for photo inputs in `main.js`.
4. **NVENC Presets**: 
   - Always use `-preset p4` for `h264_nvenc`. Do not use `fast` as it breaks on modern NVIDIA drivers.
5. **CPU Fallback Integrity**: 
   - Preserve the `libx264` fallback logic inside the `catch` blocks in case the GPU render fails.
6. **Do No Harm (IPC)**:
   - Do not break `ipcMain.handle` (Main process) and `contextBridge` (Preload) structures. Avoid synchronous blocking commands in the main thread.
7. **Neo-Brutalism UI Constraints**:
   - The UI uses Tailwind CSS with Neo-Brutalism styles (thick borders, solid bright colors like `#FFE500`, sharp shadows like `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`). 
   - Do NOT change this to generic "modern flat/soft" UI unless explicitly requested by the user.

---

## 🏗️ Architecture Overview

Vidmix v2 is a heavy-lifting media processing app using:
- **Electron (Main Process, Node.js):** Handles file system I/O and executes `fluent-ffmpeg` asynchronously.
- **React + Vite (Renderer Process):** Handles interactive UI, Neo-Brutalism styling, and real-time visual previews.

### 🐛 Common Pitfalls & Known Solutions

#### 1. Background Removal (Chroma Key)
- **Bug:** Magic Fill works in UI but output video still has a background (often black).
- **Fix/Rule:** The UI state `pickedColor` MUST correctly send the exact hex color to FFmpeg's `colorkey` filter. If the state is not updated, it defaults to black `rgb(0,0,0)`.
- **Transparency Export:** To retain alpha channels, FFmpeg uses `.mov` (`prores_ks`, `yuva444p10le`) or `.webm` (`libvpx-vp9`, `yuva420p`).

#### 2. Multiline Text Rendering
- **Bug:** Text doesn't wrap correctly in the Canvas preview.
- **Fix/Rule:** Ensure `whiteSpace: 'pre'` and `textAlign: 'center'` remain in `LayerCanvas.jsx` to respect newline characters (`\n`).

#### 3. Z-Index Management
- Standard layers use incremental z-index.
- **Rule:** *Watermarks* are hardcoded to `Z-Index: 9000+` to ensure they always stay on top. Do not change this behavior.

#### 4. Image Inputs (Photos)
- **Rule:** When injecting a static image (`.jpg`, `.png`) into video streams, you MUST loop it: `['-loop', '1', '-framerate', '30']`. Missing this causes missing PTS (Presentation Timestamp) errors, causing black screens or instant crashes during overlay filters.

---

**Summary:** Before modifying UI canvas files (`src/components/Editor/LayerCanvas.jsx`) or FFmpeg executors (`electron/main.js`), cross-reference these guidelines to ensure you do not break the 1:1 WYSIWYG sync and hardware encoding stability.
