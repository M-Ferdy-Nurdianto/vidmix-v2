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
  renderEditor: (options) => ipcRenderer.invoke('render-editor', options),
  cancelRender: () => ipcRenderer.invoke('cancel-render'),
  onEditorRenderProgress: (callback) => ipcRenderer.on('editor-render-progress', (event, data) => callback(data)),
  removeEditorRenderProgress: () => ipcRenderer.removeAllListeners('editor-render-progress'),
  getGifs: () => ipcRenderer.invoke('get-gifs'),
  uploadGif: () => ipcRenderer.invoke('upload-gif'),
  openGifsFolder: () => ipcRenderer.invoke('open-gifs-folder')
});
