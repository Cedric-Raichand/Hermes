const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hermes', {
  sendRequest: (req) => ipcRenderer.invoke('send-request', req),
});