const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
    invoke: (...args) => ipcRenderer.invoke(...args),
    on: (...args) => ipcRenderer.on(...args),
    removeAllListeners: (...args) => ipcRenderer.removeAllListeners(...args),
});

contextBridge.exposeInMainWorld('shell', shell);
