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
  // P1-05: onMaximizeChange returns unsubscribe function
  onMaximizeChange: (cb) => {
    const handler = (_, v) => cb(v);
    ipcRenderer.on('window-maximized-change', handler);
    return () => ipcRenderer.removeListener('window-maximized-change', handler);
  },
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  // Database operations
  dbQuery: (method, table, args) => ipcRenderer.invoke('db-query', method, table, args),
  dbUpload: (table, fileData) => ipcRenderer.invoke('db-upload', table, fileData),
  // Auto-update
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  // P1-06: Update event listeners return unsubscribe functions
  onUpdateAvailable: (cb) => {
    const handler = (_, v) => cb(v);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateProgress: (cb) => {
    const handler = (_, p) => cb(p);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  onUpdateDownloaded: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setMinimizeToTray: (enabled) => ipcRenderer.invoke('set-minimize-to-tray', enabled),
  setOpenAtLogin: (enabled) => ipcRenderer.invoke('set-open-at-login', enabled),
  toggleQCWindow: (enabled) => ipcRenderer.invoke('toggle-qc-window', enabled),
  openQCForm: () => ipcRenderer.invoke('open-qc-form'),
  closeQCForm: () => ipcRenderer.invoke('close-qc-form'),
  notifyRequirementsChanged: () => ipcRenderer.invoke('notify-requirements-changed'),
  testModelConnection: (modelId) => ipcRenderer.invoke('test-model-connection', modelId),
  resizeQC: (width, height) => ipcRenderer.invoke('resize-qc-window', width, height),
  // Clipboard operations
  readClipboardImages: () => ipcRenderer.invoke('read-clipboard-images'),
  readClipboardText: () => ipcRenderer.invoke('read-clipboard-text'),
  readClipboardHTML: () => ipcRenderer.invoke('read-clipboard-html'),
  readClipboardFiles: () => ipcRenderer.invoke('read-clipboard-files'),
  readLocalFile: (filePath) => ipcRenderer.invoke('read-local-file', filePath),
  openPathExternal: (filePath) => ipcRenderer.invoke('open-path-external', filePath),
  installExtension: (extId, dataUrl) => ipcRenderer.invoke('install-extension', extId, dataUrl),
  /** Send chat message to AI — returns { content: string } | { error: string } */
  chatSend: (payload) => ipcRenderer.invoke('chat:send', payload),
  // ── Agent Memory ──
  memoryGetAll: () => ipcRenderer.invoke('memory:getAll'),
  memoryUpsert: (key, value, source) => ipcRenderer.invoke('memory:upsert', { key, value, source }),
  memoryDelete: (key) => ipcRenderer.invoke('memory:delete', key),
  memoryClear: () => ipcRenderer.invoke('memory:clear'),
  memorySummary: () => ipcRenderer.invoke('memory:summary'),
  // ── CLI Tools ──
  cliCheckCommand: (command) => ipcRenderer.invoke('cli:check', command),
  cliInstall: (command) => ipcRenderer.invoke('cli:install', { command }),
  // P0-06: Forward requirements-changed event from main process (replaces executeJavaScript)
  onRequirementsChanged: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('requirements-changed', handler);
    return () => ipcRenderer.removeListener('requirements-changed', handler);
  },
  // ── MCP Runtime ──
  /** Subscribe to MCP server status updates. Returns unsubscribe function. */
  mcpSubscribeStatus: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('mcp:status-update', handler);
    return () => ipcRenderer.removeListener('mcp:status-update', handler);
  },
  /** Get MCP tools from all connected servers */
  mcpGetTools: () => ipcRenderer.invoke('mcp:get-tools'),
  /** Get MCP connection status snapshots */
  mcpGetStatus: () => ipcRenderer.invoke('mcp:get-status'),
  /** Get tools for a specific MCP server (detail panel) */
  mcpGetServerTools: (serverId) => ipcRenderer.invoke('mcp:get-server-tools', serverId),
  /** Execute a tool call on a connected MCP server */
  mcpExecuteTool: (serverId, toolName, args) => ipcRenderer.invoke('mcp:execute-tool', serverId, toolName, args),
  /** Connect to a specific MCP server */
  mcpConnect: (serverId) => ipcRenderer.invoke('mcp:connect', serverId),
  /** Disconnect from a specific MCP server */
  mcpDisconnect: (serverId) => ipcRenderer.invoke('mcp:disconnect', serverId),
});
