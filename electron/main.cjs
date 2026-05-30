// Strip ELECTRON_RUN_AS_NODE to fix double-click launch in Explorer.
// Note: when spawned from WorkBuddy, this env var prevents Electron from
// bootstrapping — the fix is in the workit-build skill (clears it before launch).
if (process.env.ELECTRON_RUN_AS_NODE === '1' && !process.defaultApp) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDatabase, log } = require('./database.cjs');
const { setupIPC } = require('./ipc.cjs');
const { createWindow } = require('./window.cjs');
const { setupAutoUpdater } = require('./updater.cjs');

let mainWindow;
let db;

app.whenReady().then(async () => {
  const preloadPath = path.join(app.getAppPath(), 'electron', 'preload.cjs');
  log('App ready');
  try {
    db = await initDatabase();
    mainWindow = createWindow(preloadPath);
    setupIPC(mainWindow, db);
    setupAutoUpdater();
  } catch (e) { log('App ready handler failed', e); }
});

app.on('web-contents-created', (_, contents) => {
  // Skip webview guest WebContents — they manage their own navigation
  if (contents.getType() === 'webview') return;
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://') && !url.startsWith('http://localhost')) event.preventDefault();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
