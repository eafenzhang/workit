import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

// Log errors to file instead of crashing silently
import fs from 'fs';

process.on('uncaughtException', (err) => {
  try { fs.appendFileSync(path.join(__dirname, '..', 'crash.log'), `[${new Date().toISOString()}] ${err.message}\n${err.stack}\n`); } catch {}
});
process.on('unhandledRejection', (err) => {
  try { fs.appendFileSync(path.join(__dirname, '..', 'crash.log'), `[${new Date().toISOString()}] Rejection: ${err?.message || err}\n`); } catch {}
});

const BACKEND_PORT = process.env.PORT || 3001;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

let mainWindow;
let bunProcess;

function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/health`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function startBackend() {
  if (await checkBackend()) {
    console.log('[Workit] Backend already running');
    return true;
  }

  console.log('[Workit] Starting backend in-process...');
  try {
    // Import and run the Express server directly in Electron's main process
    const backendPath = path.join(app.getAppPath(), 'backend', 'src', 'index.js');
    // Set PORT before importing so the backend listens on the right port
    process.env.PORT = String(BACKEND_PORT);
    await import(backendPath);
    console.log('[Workit] Backend module loaded');

    // Wait up to 10s for the server to be ready
    for (let i = 0; i < 20; i++) {
      if (await checkBackend()) {
        console.log('[Workit] Backend ready on port', BACKEND_PORT);
        return true;
      }
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (e) {
    console.error('[Workit] Backend failed to start:', e.message);
  }
  return false;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Workit',
    icon: path.join(app.getAppPath(), 'public', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(app.getAppPath(), 'electron', 'preload.js'),
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Start backend in-process, then load UI from backend HTTP server
    // (backend serves frontend static files + API on same origin)
    const backendOk = await startBackend();
    if (backendOk) {
      mainWindow.loadURL(`${BACKEND_URL}/`);
    } else {
      // Fallback: load static files directly (no API access)
      const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
      mainWindow.loadFile(indexPath);
    }
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Auto-updater (production only, configured after app ready)
function setupAutoUpdater() {
  try {
    autoUpdater.autoDownload = false;
    autoUpdater.setFeedURL({ provider: 'github', repo: 'workit', owner: 'eafenzhang' });

    ipcMain.handle('check-for-update', async () => {
      const result = await autoUpdater.checkForUpdates();
      return { available: result?.updateInfo?.version !== app.getVersion(), version: result?.updateInfo?.version };
    });
    ipcMain.handle('download-update', async () => { autoUpdater.downloadUpdate(); return true; });
    ipcMain.handle('install-update', () => { autoUpdater.quitAndInstall(); return true; });
    autoUpdater.on('download-progress', (p) => mainWindow?.webContents.send('update-download-progress', Math.round(p.percent)));
    autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('update-ready'));
  } catch (e) {
    console.error('[Workit] AutoUpdater init failed:', e.message);
  }
}

// Security: Prevent new windows
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://') && !url.startsWith(BACKEND_URL)) {
      event.preventDefault();
    }
  });
});

app.whenReady().then(() => {
  if (!isDev) setupAutoUpdater();
  return createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    bunProcess?.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('quit', () => {
  bunProcess?.kill();
});