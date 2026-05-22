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
  // Auto-update
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateProgress: (cb) => ipcRenderer.on('update-download-progress', (_, p) => cb(p)),
  onUpdateReady: (cb) => ipcRenderer.on('update-ready', () => cb()),
  // Server connection
  startLocalBackend: () => ipcRenderer.invoke('start-local-backend'),
  stopLocalBackend: () => ipcRenderer.invoke('stop-local-backend'),
  connectServer: (url) => ipcRenderer.invoke('connect-server', url),
  disconnectServer: () => ipcRenderer.invoke('disconnect-server'),
});
