import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import updaterPkg from 'electron-updater';
const { autoUpdater } = updaterPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let logPath = '';

function log(msg, err) {
  try {
    if (!logPath) logPath = path.join(app.getPath('userData'), 'workit.log');
    const line = `[${new Date().toISOString()}] ${msg}${err ? ': ' + (err.message || err) : ''}\n`;
    fs.appendFileSync(logPath, line);
  } catch {}
}

process.on('uncaughtException', (err) => {
  log('UNCAUGHT', err);
  try { fs.appendFileSync(logPath, (err.stack || '') + '\n'); } catch {}
  app.exit(1);
});
process.on('unhandledRejection', (err) => {
  log('UNHANDLED REJECTION', err);
});

const BACKEND_PORT = process.env.PORT || 3001;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

let mainWindow;
let backendProcess = null;

async function startBackendInProcess() {
  log('Starting backend in-process...');
  try {
    const appPath = app.getAppPath();
    // Backend files are unpacked outside asar
    const unpackedPath = appPath.endsWith('.asar') ? appPath + '.unpacked' : appPath;
    const backendPath = path.join(unpackedPath, 'backend', 'src', 'index.js');
    process.env.PORT = String(BACKEND_PORT);
    log('Importing backend from: ' + backendPath);
    await import(pathToFileURL(backendPath).href);
    log('Backend module loaded');
    // Wait for server to be ready
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        await new Promise((resolve, reject) => {
          http.get(`${BACKEND_URL}/api/health`, () => resolve())
            .on('error', reject).setTimeout(500, reject);
        });
        log('Backend ready on port', BACKEND_PORT);
        return true;
      } catch {}
    }
    log('Backend start timeout');
    return false;
  } catch (e) {
    log('Backend start failed', e);
    return false;
  }
}

function setupWindowEvents(win) {
  win.on('maximize', () => win.webContents?.send('window-maximized-change', true));
  win.on('unmaximize', () => win.webContents?.send('window-maximized-change', false));
}

function setupIPC() {
  // Window controls
  ipcMain.handle('window-minimize', () => mainWindow?.minimize());
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize();
  });
  ipcMain.handle('window-close', () => mainWindow?.close());
  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() || false);

  ipcMain.handle('start-local-backend', async () => {
    if (backendProcess) return { success: true, message: 'Already running' };
    const appPath = app.getAppPath();
    const backendPath = path.join(appPath, 'backend', 'src', 'index.js');
    return new Promise((resolve) => {
      try {
        backendProcess = spawn('node', [backendPath], {
          cwd: path.join(appPath, 'backend'),
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, PORT: String(BACKEND_PORT) },
        });
        backendProcess.stderr?.on('data', (d) => { try { log('[backend] ' + d.toString().trim()); } catch {} });
        backendProcess.on('error', (e) => { backendProcess = null; resolve({ success: false, error: e.message }); });
        backendProcess.on('exit', () => { backendProcess = null; });

        let attempts = 0;
        const poll = () => {
          attempts++;
          if (attempts > 30) { resolve({ success: false, error: '启动超时' }); return; }
          http.get('http://localhost:3001/api/health', () => resolve({ success: true }))
            .on('error', () => setTimeout(poll, 500));
        };
        poll();
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  });

  ipcMain.handle('stop-local-backend', () => {
    if (backendProcess) { backendProcess.kill(); backendProcess = null; }
    return { success: true };
  });

  ipcMain.handle('connect-server', (_, url) => {
    const targetUrl = url || 'http://localhost:3001';
    if (mainWindow && mainWindow.webContents) mainWindow.loadURL(targetUrl);
    return { success: true };
  });

  ipcMain.handle('disconnect-server', () => {
    if (mainWindow && mainWindow.webContents) {
      const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
      mainWindow.loadFile(indexPath);
    }
    return { success: true };
  });
}

async function createWindow() {
  log('Creating window...');
  try {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Workit',
    icon: path.join(app.getAppPath(), 'public', 'icon.ico'),
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(app.getAppPath(), 'electron', 'preload.js'),
    },
  });

  setupWindowEvents(mainWindow);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const backendOk = await startBackendInProcess();
    if (backendOk) {
      log('Loading from backend: ' + BACKEND_URL);
      try { await mainWindow.loadURL(`${BACKEND_URL}/`); }
      catch (e) { log('loadURL failed, falling back to file', e); await mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html')); }
    } else {
      const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
      log('Loading file: ' + indexPath);
      try { await mainWindow.loadFile(indexPath); }
      catch (e) { log('loadFile failed', e); }
    }
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
  log('Window created successfully');
  } catch (e) { log('Window creation failed', e); }
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
    ipcMain.handle('download-update', async () => { await autoUpdater.downloadUpdate(); return true; });
    ipcMain.handle('install-update', () => { autoUpdater.quitAndInstall(); return true; });
    autoUpdater.on('download-progress', (p) => mainWindow?.webContents?.send('update-download-progress', Math.round(p.percent)));
    autoUpdater.on('update-downloaded', () => mainWindow?.webContents?.send('update-ready'));
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
  log('App ready');
  try {
    if (!isDev) setupAutoUpdater();
    setupIPC();
    return createWindow();
  } catch (e) { log('App ready handler failed', e); }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});