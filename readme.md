# Vidmix v2

Vidmix v2 is a high-performance desktop automation software built with Node.js, React, and Electron. Powered by the industry-standard FFmpeg engine, it allows users to batch-process videos, inject randomized or custom-ordered music, apply custom looping, and render everything efficiently using hardware acceleration.

This document serves as both a user guide and a comprehensive technical reference for developers and AI assistants.

## Table of Contents
1. [Features](#features)
2. [Prerequisites & Installation](#prerequisites--installation)
3. [System Architecture](#system-architecture)
4. [File Structure & Component Analysis](#file-structure--component-analysis)
5. [Code Level Implementation Details](#code-level-implementation-details)
6. [Technical Debt & Areas for Improvement](#technical-debt--areas-for-improvement)

---

## Features
- **Batch Processing:** Drop multiple videos and audio files, configure settings, and generate output efficiently.
- **Smart Audio Engine:** Utilizes Fisher-Yates Shuffle for randomizing music sequences or allows manual ordering via a Drag & Drop interface.
- **Custom Looping & Seamless Transitions:** Provides flexible preset durations (15m, 30m, 1h, custom) with automatic fade-in/fade-out transitions to ensure seamless audio joining.
- **State Persistence:** Automatically remembers previously used directories (videos, music, output) using a local JSON configuration.
- **Real-Time Progress & ETA:** Interactive full-screen overlay displaying a precise progress bar and ETA calculations during rendering.
- **Safety Checks:** Prevents accidental overwrites and provides warnings before closing the application during an active render process.

---

## Prerequisites & Installation

### Prerequisites
- Node.js (v18 or newer)
- FFmpeg installed and registered in your Windows environment `PATH`.

### How to Run
1. Clone the repository:
   ```bash
   git clone https://github.com/M-Ferdy-Nurdianto/vidmix-v2.git
   cd vidmix-v2
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application (Development Mode):
   ```bash
   npm run electron:dev
   ```

### Build for Production
To package the app into a standalone `.exe` for Windows:
```bash
npm run electron:build
```

---

## System Architecture

Vidmix v2 employs a hybrid architecture separating the frontend UI from the backend processing engine.

- **Frontend (Renderer Process):** Built with React and Vite. It handles the interactive Neo-Brutalism UI, user state management, and file Drag & Drop interactions.
- **Backend (Main Process):** Built with Electron (Node.js). It handles native file system operations, OS dialogs, and spawns the FFmpeg child processes.
- **IPC Bridge (Context Isolation):** Communication between the Frontend and Backend is secured via `preload.js` using `contextBridge`. The renderer has no direct access to Node.js APIs, preventing XSS vulnerabilities.

---

## File Structure & Component Analysis

### Root Directory
- `package.json`: Defines project dependencies (React, Electron, Tailwind, fluent-ffmpeg) and scripts (`react:dev`, `electron:dev`, `electron:build`).
- `vite.config.js`: Configuration for the Vite bundler used for building the React frontend.
- `tailwind.config.js`: Configuration for TailwindCSS styling.

### 1. `electron/main.js`
The entry point for the Electron application.
- **Window Management:** Initializes the `BrowserWindow`, loads the React development server or production build, and handles window close events (preventing closure during active renders).
- **Configuration Management:** Implements `loadConfig` and `saveConfig` to persist user directory preferences to `vidmix-config.json` in the user's AppData.
- **IPC Handlers:** Registers listeners for `ipcMain.handle` to trigger native dialogs (`showOpenDialog`, `showSaveDialog`), manage local GIF directories, and execute the FFmpeg render process.
- **FFmpeg Execution:** Constructs complex filter graphs for FFmpeg based on the user's payload (loop duration, audio ordering, watermarks) and spawns the process asynchronously.

### 2. `electron/preload.js`
The security bridge.
- Uses `contextBridge.exposeInMainWorld('api', {...})` to safely expose specific functions to the React frontend.
- Exposes methods like `selectMediaFile`, `startRender`, `getConfig`, and listeners for progress updates (`onRenderProgress`).

### 3. `src/App.jsx`
The primary monolith React component handling the application state and UI logic.
- **State Management:** Uses React Hooks (`useState`, `useEffect`) to track output directories, video/audio lists, custom names, looping presets, and render progress.
- **Drag & Drop Logic:** Contains functions (`handleDragStart`, `handleDrop`, `handleLayerDrop`) to manage rearranging audio files and canvas layers.
- **Render Trigger:** The `handleGenerate` function acts as the bridge to send the current state payload via IPC to `window.api.startRender`.

### 4. `src/components/Editor/`
Contains components responsible for the visual overlay editor.
- **`LayerCanvas.jsx`**: Renders the video preview and allows users to position and resize overlay layers (text, images, GIFs) using absolute positioning and drag events.
- **`LayerControlPanel.jsx`**: The sidebar interface for adding, deleting, and modifying the properties (Z-index, opacity, scale) of individual layers.

---

## Code Level Implementation Details

### IPC Communication Flow
1. User clicks "Generate" in `App.jsx`.
2. `App.jsx` calls `window.api.startRender(options)`.
3. `preload.js` forwards this via `ipcRenderer.invoke('start-render', options)`.
4. `main.js` catches `ipcMain.handle('start-render')`, extracts the configuration, and begins constructing the `fluent-ffmpeg` command.
5. During FFmpeg execution, `main.js` sends progress updates back via `mainWindow.webContents.send('render-progress', data)`.
6. `App.jsx` listens to this via `window.api.onRenderProgress` and updates the progress bar UI.

### Audio Shuffling Logic
If the user selects random audio ordering, the application uses the Fisher-Yates shuffle algorithm before passing the audio files to FFmpeg. If custom ordering is selected, it respects the index order defined by the user's drag-and-drop arrangement in `App.jsx`.

### FFmpeg Complex Filters
The application relies heavily on FFmpeg's `-filter_complex`. For example, looping a video to a specific duration involves:
- Using `stream_loop -1` on the video input.
- Using `concat` filter to join multiple audio streams.
- Applying `afade` (audio fade) to smooth transitions between concatenated audio files.
- Using `overlay` filter to apply watermarks or text layers on top of the video stream.

---

## Technical Debt & Areas for Improvement

While the current implementation is highly functional, there are architectural improvements that can be made:

### 1. Frontend Monolith (`App.jsx`)
- **Current State:** `App.jsx` is over 1000 lines long, handling everything from global state, drag-and-drop mechanics, file selection, to UI rendering.
- **Recommendation:** Refactor into smaller custom hooks (e.g., `useMediaManager`, `useRenderState`) and separate UI sections into independent components. Consider using a state management library like Zustand or Redux for scalability.

### 2. Hardcoded Limitations
- **Current State:** There are hardcoded limits in `App.jsx` restricting users to a maximum of 5 videos and 20 audio files. This validation only exists on the frontend.
- **Recommendation:** Move validation logic to a shared configuration file or validate at the backend level. Make these limits configurable via settings.

### 3. FFmpeg Execution (Blocking Pattern)
- **Current State:** While FFmpeg spawns asynchronously, there is no robust queue management system. Triggering multiple renders concurrently may cause UI freezing or resource exhaustion.
- **Recommendation:** Implement a background job queue manager in the main process to handle multiple rendering tasks sequentially.

### 4. Type Safety
- **Current State:** The codebase is written in pure JavaScript, which can lead to runtime errors, especially with complex IPC payloads.
- **Recommendation:** Migrate to TypeScript to ensure strict typings between the IPC bridge, making the communication between the frontend and backend robust.

### 5. Testing
- **Current State:** There is no automated testing setup (Unit or Integration tests).
- **Recommendation:** Implement Jest/Vitest for testing utility functions and React components, and consider Playwright for end-to-end testing of the Electron application.
