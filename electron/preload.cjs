const { contextBridge, ipcRenderer } = require('electron');
const isQCPopup = process.argv.includes('--qc-popup');

contextBridge.exposeInMainWorld('electronAPI', {
  __isQCPopup: isQCPopup,
  platform: process.platform,
  versions: { node: process.versions.node, chrome: process.versions.chrome, electron: process.versions.electron },
  getVersion: () => ipcRenderer.invoke('get-version'),
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
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, v) => cb(v)),
  onUpdateProgress: (cb) => ipcRenderer.on('update-download-progress', (_, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke('set-minimize-to-tray', enabled),
  setOpenAtLogin: (enabled) => ipcRenderer.invoke('set-open-at-login', enabled),
  toggleQCWindow: (enabled) => ipcRenderer.invoke('toggle-qc-window', enabled),
  openQCForm: () => ipcRenderer.invoke('open-qc-form'),
  closeQCForm: () => ipcRenderer.invoke('close-qc-form'),
  notifyRequirementsChanged: () => ipcRenderer.invoke('notify-requirements-changed'),
  testModelConnection: (baseUrl, apiKey, modelId) => ipcRenderer.invoke('test-model-connection', baseUrl, apiKey, modelId),
  resizeQC: (width, height) => ipcRenderer.invoke('resize-qc-window', width, height),
});
