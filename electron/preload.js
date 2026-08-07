const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  selectFolder: (type) => ipcRenderer.invoke('select-folder', type),
  startRender: (options) => ipcRenderer.invoke('start-render', options),
  onRenderProgress: (callback) => ipcRenderer.on('render-progress', (event, data) => callback(data)),
  removeRenderProgress: () => ipcRenderer.removeAllListeners('render-progress')
});
