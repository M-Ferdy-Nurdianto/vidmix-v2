const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectMediaFile: () => ipcRenderer.invoke('select-media-file'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  selectFolder: (type) => ipcRenderer.invoke('select-folder', type),
  startRender: (options) => ipcRenderer.invoke('start-render', options),
  onRenderProgress: (callback) => ipcRenderer.on('render-progress', (event, data) => callback(data)),
  removeRenderProgress: () => ipcRenderer.removeAllListeners('render-progress'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  selectOutputFile: () => ipcRenderer.invoke('select-output-file'),
  selectOutputWebm: () => ipcRenderer.invoke('select-output-webm'),
  renderEditor: (options) => ipcRenderer.invoke('render-editor', options),
  renderPhotoToVideo: (options) => ipcRenderer.invoke('render-photo-to-video', options),
  cancelRender: () => ipcRenderer.invoke('cancel-render'),
  onEditorRenderProgress: (callback) => ipcRenderer.on('editor-render-progress', (event, data) => callback(data)),
  removeEditorRenderProgress: () => ipcRenderer.removeAllListeners('editor-render-progress'),
  onPhotoRenderProgress: (callback) => ipcRenderer.on('photo-render-progress', (event, data) => callback(data)),
  removePhotoRenderProgress: () => ipcRenderer.removeAllListeners('photo-render-progress'),
  getGifs: () => ipcRenderer.invoke('get-gifs'),
  uploadGif: () => ipcRenderer.invoke('upload-gif'),
  openGifsFolder: () => ipcRenderer.invoke('open-gifs-folder'),
  exportSpectrumGif: (options) => ipcRenderer.invoke('export-spectrum-gif', options),
  onSpectrumExportProgress: (callback) => ipcRenderer.on('spectrum-export-progress', (event, data) => callback(data)),
  removeSpectrumExportProgress: () => ipcRenderer.removeAllListeners('spectrum-export-progress'),
  saveBufferToFile: (outputPath, buffer) => ipcRenderer.invoke('save-buffer-to-file', { outputPath, buffer }),
  selectOutputMov: () => ipcRenderer.invoke('select-output-mov'),
  encodeFramesToMov: (frames, fps, outputPath) => ipcRenderer.invoke('encode-frames-to-mov', { frames, fps, outputPath }),
  removeVideoBg: (options) => ipcRenderer.invoke('remove-video-bg', options),
  onRemoveVideoBgProgress: (callback) => ipcRenderer.on('remove-video-bg-progress', (event, data) => callback(data)),
  removeRemoveVideoBgProgress: () => ipcRenderer.removeAllListeners('remove-video-bg-progress'),
  // ─── License API ─────────────────────────────────────────────────────────────
  license: {
    check: () => ipcRenderer.invoke('license:check'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
    info: () => ipcRenderer.invoke('license:info'),
    deviceId: () => ipcRenderer.invoke('license:deviceId'),
  },
  // ─── Admin API ───────────────────────────────────────────────────────────────
  admin: {
    verifyToken: (token) => ipcRenderer.invoke('admin:verifyToken', token),
    listKeys: (token) => ipcRenderer.invoke('admin:listKeys', token),
    generateKey: (token, type, deviceId) => ipcRenderer.invoke('admin:generateKey', { token, type, deviceId }),
    revokeKey: (token, key) => ipcRenderer.invoke('admin:revokeKey', { token, key })
  },
});
