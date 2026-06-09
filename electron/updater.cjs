// updater.js — Auto-updater: silent background download + periodic check + progress events
const { app, ipcMain } = require('electron');
const { log } = require('./database.cjs');
const { getMainWindow, getQCWindow } = require('./window.cjs');

const isDev = process.defaultApp || /electron/.test(process.argv[0]);

// Broadcast to all renderer windows
function broadcast(channel, payload) {
  [getMainWindow(), getQCWindow()].forEach(getWin => {
    try {
      const win = getWin();
      if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
    } catch {}
  });
}

let _updater = null;
let _checkTimer = null;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

function setupAutoUpdater() {
  // Register a fallback check-for-update handler for dev/local builds
  // This prevents "No handler registered" errors in the UI
  ipcMain.handle('check-for-update', async () => {
    if (isDev) return { available: false, current: app.getVersion(), note: '开发模式' };
    return { available: false, current: app.getVersion(), note: '更新服务未就绪' };
  });

  if (isDev) { log('AutoUpdater: dev mode, skipping'); return; }

  try {
    const { autoUpdater } = require('electron-updater');
    _updater = autoUpdater;

    // Verify update feed
    try {
      if (!autoUpdater.currentVersion) {
        log('AutoUpdater: no update feed (local build), skipping');
        return;
      }
    } catch {
      log('AutoUpdater: app-update.yml not found (local build), skipping');
      return;
    }

    // ── Config ──
    autoUpdater.autoDownload = false;       // We control download explicitly
    autoUpdater.autoInstallOnAppQuit = true; // If already downloaded, install on quit
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;

    // ── Logger ──
    autoUpdater.logger = {
      debug: () => {},
      info: (m) => log('Updater: ' + m),
      warn: (m) => log('Updater warn: ' + m),
      error: (m) => log('Updater error: ' + m),
    };

    // ── Events → broadcast to all renderer windows ──
    autoUpdater.on('checking-for-update', () => {
      log('Updater: checking...');
      broadcast('update:checking');
    });

    autoUpdater.on('update-available', (info) => {
      log('Updater: v' + info.version + ' available, auto-downloading');
      broadcast('update:available', {
        version: info.version,
        currentVersion: app.getVersion(),
        releaseNotes: (info.releaseNotes || info.releaseName || '').replace(/<[^>]+>/g, ''),
      });
      // Don't auto-download — wait for user to click "立即升级" in dialog
    });

    autoUpdater.on('update-not-available', () => {
      log('Updater: already latest');
      broadcast('update:not-available');
    });

    autoUpdater.on('download-progress', (p) => {
      broadcast('update:progress', { percent: Math.round(p.percent), transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond });
    });

    autoUpdater.on('update-downloaded', (info) => {
      log('Updater: v' + info.version + ' downloaded, ready to install');
      broadcast('update:downloaded', { version: info.version });
    });

    autoUpdater.on('error', (e) => {
      log('Updater error: ' + (e.message || e));
      broadcast('update:error', { message: e.message || 'Unknown error' });
    });

    // ── IPC handlers ──
    ipcMain.handle('check-for-update', async () => {
      // Retry up to 2 times for transient network errors (504, timeout, etc.)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const r = await autoUpdater.checkForUpdates();
          const current = app.getVersion();
          if (r?.updateInfo?.version) {
            const v = r.updateInfo.version;
            return { available: v !== current, version: v, current };
          }
          return { available: false, current };
        } catch (e) {
          const msg = e.message || '';
          const isTransient = msg.includes('504') || msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET');
          if (isTransient && attempt < 2) {
            log('Updater: transient error on attempt ' + attempt + ', retrying: ' + msg);
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }
          log('Updater check error: ' + msg);
          return { available: false, error: msg || 'Unknown error', current: app.getVersion() };
        }
      }
      return { available: false, error: '检查超时', current: app.getVersion() };
    });

    ipcMain.handle('download-update', async () => {
      try { await autoUpdater.downloadUpdate(); return { ok: true }; }
      catch (e) { return { ok: false, error: e.message }; }
    });

    ipcMain.handle('install-update', () => { autoUpdater.quitAndInstall(); return true; });

    // ── Retry helper for update checks ──
    const checkWithRetry = (label, maxRetries = 3) => {
      let attempts = 0;
      const tryCheck = () => {
        attempts++;
        log('Updater: ' + label + ' (attempt ' + attempts + '/' + maxRetries + ')');
        autoUpdater.checkForUpdates().catch(e => {
          log('Updater: ' + label + ' failed (attempt ' + attempts + '): ' + (e.message || e));
          if (attempts < maxRetries) {
            const delay = attempts * 30000; // 30s, 60s, 90s backoff
            log('Updater: retrying in ' + (delay/1000) + 's');
            setTimeout(tryCheck, delay);
          }
        });
      };
      tryCheck();
    };

    // ── Startup: delayed auto-check + download (with retry) ──
    setTimeout(() => checkWithRetry('startup check'), 15000);

    // ── Periodic check every 4 hours ──
    _checkTimer = setInterval(() => checkWithRetry('periodic check'), CHECK_INTERVAL_MS);

    log('AutoUpdater: initialized');
  } catch (e) { log('AutoUpdater init failed', e); }
}

// Cleanup on app quit
function teardownAutoUpdater() {
  if (_checkTimer) { clearInterval(_checkTimer); _checkTimer = null; }
}

module.exports = { setupAutoUpdater, teardownAutoUpdater };
