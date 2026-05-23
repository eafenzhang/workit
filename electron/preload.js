const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

function getVersion() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: { node: process.versions.node, chrome: process.versions.chrome, electron: process.versions.electron },
  getVersion,
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  onMaximizeChange: (cb) => ipcRenderer.on('window-maximized-change', (_, v) => cb(v)),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  // Database operations
  dbQuery: (method, table, args) => ipcRenderer.invoke('db-query', method, table, args),
  dbUpload: (table, fileData) => ipcRenderer.invoke('db-upload', table, fileData),
  // Auto-update
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateProgress: (cb) => ipcRenderer.on('update-download-progress', (_, p) => cb(p)),
  onUpdateReady: (cb) => ipcRenderer.on('update-ready', () => cb()),
  // Server connection
  connectServer: (url) => ipcRenderer.invoke('connect-server', url),
  disconnectServer: () => ipcRenderer.invoke('disconnect-server'),
});
