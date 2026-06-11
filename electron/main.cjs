// Strip ELECTRON_RUN_AS_NODE to fix double-click launch in Explorer.
// Note: when spawned from WorkBuddy, this env var prevents Electron from
// bootstrapping — the fix is in the workit-build skill (clears it before launch).
if (process.env.ELECTRON_RUN_AS_NODE === '1' && !process.defaultApp) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initDatabase, log, query } = require('./database.cjs');
const { setupIPC } = require('./ipc.cjs');
const { createWindow } = require('./window.cjs');
const { setupAutoUpdater } = require('./updater.cjs');
const { McpClientManager, setStatusPushFn } = require('./mcp-manager.cjs');
const { AionCoreManager } = require('./aioncore-manager.cjs');

let mainWindow;
let db;
let mcpManager;
let aioncoreManager;

app.whenReady().then(async () => {
  const preloadPath = path.join(app.getAppPath(), 'electron', 'preload.cjs');
  log('App ready');

  try {
    // 1. Start AionCore backend
    aioncoreManager = new AionCoreManager();
    try {
      await aioncoreManager.start({
        port: 13400,
        dataDir: process.env.AIONCORE_DATA_DIR || undefined,
      });
      log('AionCore backend started on port ' + aioncoreManager.getPort());
    } catch (aionErr) {
      log('AionCore backend failed to start: ' + (aionErr.message || String(aionErr)));
      log('App will continue without backend — some features unavailable');
    }

    // 2. Initialize local database (for Electron-native features: window state, settings, etc.)
    db = await initDatabase();
    mcpManager = McpClientManager.getInstance();

    // Set up the IPC status push callback — broadcasts to all renderer windows
    setStatusPushFn((serverId, status, error, tools) => {
      const { getMainWindow: gw, getQCWindow: gq } = require('./window.cjs');
      const payload = { id: serverId, status, error, toolCount: tools ? tools.length : 0, tools };
      const mainWin = gw();
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('mcp:status-update', payload);
      }
      const qcWin = gq();
      if (qcWin && !qcWin.isDestroyed()) {
        qcWin.webContents.send('mcp:status-update', payload);
      }
    });

    // 3. Create the main window, passing AionCore port to preload
    mainWindow = createWindow(preloadPath);
    setupIPC(mainWindow, db);
    setupAutoUpdater();

    // Pass AionCore port to renderer
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('aioncore:port', aioncoreManager.getPort());
    });

    // 4. Auto-connect to all enabled MCP servers on startup
    const enabledServers = query(db, 'SELECT * FROM mcp_servers WHERE enabled = 1');
    for (const row of enabledServers) {
      const id = row[0];
      const name = row[1];
      const command = row[3];
      const args = (() => { try { return JSON.parse(row[4] || '[]'); } catch { return []; } })();
      const env = (() => { try { return JSON.parse(row[5] || '{}'); } catch { return {}; } })();
      log('Auto-connecting MCP server #' + id + ' (' + name + ')');
      mcpManager.connect(id, { command, args, env, name }).catch(e => {
        log('Auto-connect failed for server #' + id, e);
      });
    }
  } catch (e) { log('App ready handler failed', e); }
});

// Clean shutdown: stop MCP manager + AionCore
app.on('before-quit', (event) => {
  event.preventDefault();

  const cleanup = async () => {
    if (mcpManager) {
      try { await mcpManager.shutdown(); } catch (e) { log('McpManager shutdown error', e); }
    }
    if (aioncoreManager) {
      try { await aioncoreManager.stop(); } catch (e) { log('AionCore shutdown error', e); }
    }
    app.quit();
  };

  cleanup();
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
