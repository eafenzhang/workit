// updater.js — Auto-updater setup and IPC handlers
const { app, ipcMain } = require('electron');
const { log } = require('./database.cjs');
const { getMainWindow } = require('./window.cjs');

const isDev = process.defaultApp || /electron/.test(process.argv[0]);

function setupAutoUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');
    // Verify update feed is available (app-update.yml exists)
    // currentVersion access triggers a file read — catch if missing (local build)
    try {
      const v = autoUpdater.currentVersion;
      if (!v) {
        log('AutoUpdater: no update feed (local build), skipping');
        return;
      }
    } catch {
      log('AutoUpdater: app-update.yml not found (local build), skipping');
      return;
    }
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Manual check: just report what's available, don't trigger download
    ipcMain.handle('check-for-update', async () => {
      try {
        const r = await autoUpdater.checkForUpdates();
        const current = app.getVersion();
        if (r?.updateInfo?.version) {
          const v = r.updateInfo.version;
          log('Updater check: found v' + v + ' current=' + current);
          return { available: v !== current, version: v, current };
        }
        return { available: false, current };
      } catch (e) {
        log('Updater check error: ' + (e.message || e));
        return { available: false, error: e.message || 'Unknown error', current: app.getVersion() };
      }
    });

    ipcMain.handle('download-update', async () => {
      try { await autoUpdater.downloadUpdate(); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    });

    ipcMain.handle('install-update', () => { autoUpdater.quitAndInstall(); return true; });

    autoUpdater.on('update-available', (info) => {
      log('Updater: v' + info.version + ' available');
      getMainWindow()?.webContents?.send('update-available', info.version);
    });
    autoUpdater.on('download-progress', (p) => {
      getMainWindow()?.webContents?.send('update-download-progress', Math.round(p.percent));
    });
    autoUpdater.on('update-downloaded', () => {
      log('Updater: downloaded, install on quit');
      getMainWindow()?.webContents?.send('update-downloaded');
    });
    autoUpdater.on('error', (e) => log('Updater error: ' + e.message));

    autoUpdater.logger = {
      debug: () => {}, info: (m) => log('Updater: ' + m),
      warn: (m) => log('Updater warn: ' + m), error: (m) => log('Updater error: ' + m)
    };

    // Startup: auto-check & download in background
    setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 10000);
  } catch (e) { log('AutoUpdater init failed', e); }
}

module.exports = { setupAutoUpdater };
