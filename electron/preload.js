const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
    invoke: (...args) => ipcRenderer.invoke(...args),
    on: (...args) => ipcRenderer.on(...args),
    removeAllListeners: (...args) => ipcRenderer.removeAllListeners(...args),
});

contextBridge.exposeInMainWorld('shell', shell);

// Expose electronAPI for ProxiedImage and other components
contextBridge.exposeInMainWorld('electronAPI', {
    fetchImage: (url) => ipcRenderer.invoke('fetch-image', url),
    readLocalFile: (filePath) => ipcRenderer.invoke('read-local-file', filePath),
    clearDatabaseAndCache: () => ipcRenderer.invoke('clear-database-and-cache'),
});
