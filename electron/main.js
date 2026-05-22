import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development mode check
const isDev = !app.isPackaged;

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
  const running = await checkBackend();
  if (running) {
    console.log('[Workit] Backend already running');
    return true;
  }

  console.log('[Workit] Starting backend...');
  const appPath = app.getAppPath();
  const backendPath = path.join(appPath, 'backend', 'src', 'index.js');

  bunProcess = spawn('node', [backendPath], {
    cwd: path.join(appPath, 'backend'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(BACKEND_PORT) },
  });

  bunProcess.stdout?.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  bunProcess.stderr?.on('data', (d) => process.stderr.write(`[backend] ${d}`));

  // Wait up to 15s for backend to be ready
  for (let i = 0; i < 30; i++) {
    if (await checkBackend()) {
      console.log('[Workit] Backend ready');
      return true;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.error('[Workit] Backend failed to start');
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
    // Prod: start backend, then load UI from backend HTTP server
    // (backend serves frontend static files + API on same origin, allowing external access)
    await startBackend();
    mainWindow.loadURL(`${BACKEND_URL}/`);
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

// Auto-updater (production only)
if (!isDev) {
  autoUpdater.autoDownload = false;
  autoUpdater.setFeedURL({ provider: 'github', repo: 'workit', owner: 'eafenzhang' });

  ipcMain.handle('check-for-update', async () => {
    const result = await autoUpdater.checkForUpdates();
    return { available: result?.updateInfo?.version !== app.getVersion(), version: result?.updateInfo?.version };
  });

  ipcMain.handle('download-update', async () => {
    autoUpdater.downloadUpdate();
    return true;
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
    return true;
  });

  autoUpdater.on('download-progress', (p) => {
    mainWindow?.webContents.send('update-download-progress', Math.round(p.percent));
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-ready');
  });
}

// Security: Prevent new windows
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith(BACKEND_URL)) {
      event.preventDefault();
    }
  });
});

app.whenReady().then(createWindow);

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