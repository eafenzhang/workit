import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development mode check
const isDev = !app.isPackaged;

let mainWindow;
let bunProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Workit',
    icon: path.join(__dirname, 'public/favicon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
  });

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');

    // Start Bun backend if not running
    const checkBackend = () => {
      return new Promise((resolve) => {
        const http = require('http');
        const req = http.get('http://localhost:3001/api/health', () => resolve(true));
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => resolve(false));
      });
    };

    const startBackend = async () => {
      const backendRunning = await checkBackend();
      if (!backendRunning) {
        console.log('[Workit] Starting backend...');
        const backendPath = path.join(__dirname, 'backend', 'src', 'index.js');
        bunProcess = spawn('bun', ['run', backendPath], {
          cwd: path.join(__dirname, 'backend'),
          detached: true,
          stdio: 'inherit',
        });
      } else {
        console.log('[Workit] Backend already running');
      }
    };

    startBackend();

    // Open devtools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from asar root: dist/index.html
    // Use 'app.getAppPath()' to get the asar root path
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
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

// Security: Prevent new windows
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (bunProcess) {
      bunProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed (Windows)
app.on('quit', () => {
  if (bunProcess) {
    bunProcess.kill();
  }
});