const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hermes', {
  sendRequest: (req) => ipcRenderer.invoke('send-request', req),
  loadSaved: () => ipcRenderer.invoke('load-saved'),
  saveSaved: (list) => ipcRenderer.invoke('save-saved', list),
  loadHistory: () => ipcRenderer.invoke('load-history'),
  saveHistory: (list) => ipcRenderer.invoke('save-history', list),
});