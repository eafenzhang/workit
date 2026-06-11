// ──────────────────────────────────────────────────────
// AionCore Process Manager
// Manages the AionCore backend subprocess lifecycle
// ──────────────────────────────────────────────────────

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { app } = require('electron');

// Use a global flag to log only once
let _diagnosticsLogged = false;

function log(msg) {
  console.log(`[aioncore] ${msg}`);
}

function warn(msg) {
  console.warn(`[aioncore] ${msg}`);
}

class AionCoreManager {
  constructor() {
    this.process = null;
    this.port = 13400;
    this.ready = false;
    this.dataDir = '';
    this.binaryPath = '';
  }

  /**
   * Resolve the AionCore binary path.
   * Tries multiple locations, logs all attempts.
   */
  resolveBinaryPath() {
    const isWin = process.platform === 'win32';
    const binName = isWin ? 'aioncore.exe' : 'aioncore';

    // 1. Environment variable override
    if (process.env.AIONCORE_PATH) {
      log(`Using AIONCORE_PATH env: ${process.env.AIONCORE_PATH}`);
      return process.env.AIONCORE_PATH;
    }

    // 2. All candidate paths in priority order
    const candidates = [];

    // a: process.resourcesPath (standard Electron resources dir)
    if (process.resourcesPath) {
      candidates.push(path.join(process.resourcesPath, 'aioncore', binName));
    }

    // b: Resources next to app (macOS .app bundle fallback)
    try {
      candidates.push(path.join(app.getAppPath(), '..', 'Resources', 'aioncore', binName));
    } catch (e) {}

    // c: App-adjacent (dev mode / portable)
    try {
      candidates.push(path.join(app.getAppPath(), 'aioncore', binName));
    } catch (e) {}

    // d: App executable dir
    try {
      const exeDir = path.dirname(app.getPath('exe'));
      candidates.push(path.join(exeDir, 'aioncore', binName));
      candidates.push(path.join(exeDir, 'resources', 'aioncore', binName));
    } catch (e) {}

    // e: CWD
    candidates.push(path.join(process.cwd(), 'aioncore', binName));

    // f: PATH fallback
    candidates.push(binName);

    // Log diagnostics once
    if (!_diagnosticsLogged) {
      _diagnosticsLogged = true;
      log(`Searching for ${binName}...`);
      log(`process.resourcesPath = ${process.resourcesPath || '(undefined)'}`);
      try { log(`app.getAppPath() = ${app.getAppPath()}`); } catch (e) {}
      try { log(`app.getPath('exe') = ${app.getPath('exe')}`); } catch (e) {}
      log(`app.getPath('userData') = ${app.getPath('userData')}`);
    }

    for (const candidate of candidates) {
      if (candidate === binName) {
        // PATH fallback — no file to check
        log(`Falling back to PATH: ${binName}`);
        return binName;
      }
      try {
        if (fs.existsSync(candidate)) {
          log(`Found binary at: ${candidate}`);
          return candidate;
        } else {
          warn(`Not found: ${candidate}`);
        }
      } catch (e) {
        warn(`Error checking path ${candidate}: ${e.message}`);
      }
    }

    // If nothing found, return PATH fallback
    warn('No aioncore binary found anywhere, using PATH fallback');
    return binName;
  }

  /**
   * Start the AionCore backend process.
   */
  async start(options = {}) {
    const port = options.port || 13400;
    const dataDir = options.dataDir || path.join(app.getPath('userData'), 'aioncore-data');
    const timeout = options.timeout || 60000; // 60s timeout

    this.port = port;
    this.dataDir = dataDir;
    this.binaryPath = this.resolveBinaryPath();

    log(`Starting on port ${port}`);
    log(`Data directory: ${dataDir}`);
    log(`Binary path: ${this.binaryPath}`);

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      log(`Created data directory: ${dataDir}`);
    }

    // Verify binary exists before spawning
    if (this.binaryPath !== 'aioncore' && this.binaryPath !== 'aioncore.exe') {
      if (!fs.existsSync(this.binaryPath)) {
        const errMsg = `Binary not found at resolved path: ${this.binaryPath}`;
        log(errMsg);
        throw new Error(errMsg);
      }
      log(`Binary exists at: ${this.binaryPath}`);
    }

    // Spawn the process
    log(`Spawning: ${this.binaryPath} --port ${port} --data-dir ${dataDir} --local`);

    this.process = spawn(this.binaryPath, [
      '--port', String(port),
      '--data-dir', dataDir,
      '--local',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
      windowsHide: true,
    });

    // Log stdout
    this.process.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) log(`[out] ${msg}`);
    });

    // Log stderr
    this.process.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) warn(`[err] ${msg}`);
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      log(`Process exited (code: ${code}, signal: ${signal})`);
      this.process = null;
      this.ready = false;
    });

    this.process.on('error', (err) => {
      warn(`Spawn error: ${err.message}`);
      this.process = null;
      this.ready = false;
    });

    // Wait for health check
    try {
      await this.waitForReady(timeout);
      this.ready = true;
      log(`Backend ready on port ${port}`);
    } catch (err) {
      // Clean up the process if health check fails
      if (this.process) {
        this.process.kill();
        this.process = null;
      }
      throw err;
    }
  }

  /**
   * Wait for the backend health endpoint to respond.
   */
  waitForReady(timeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const pollInterval = 1000;
      let lastError = '';

      const poll = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
          reject(new Error(`AionCore did not start within ${timeout}ms. ${lastError}`));
          return;
        }

        const req = http.get(`http://localhost:${this.port}/health`, (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (data.status === 'ok') {
                resolve(data);
              } else {
                lastError = `Health response: ${body.substring(0, 100)}`;
                setTimeout(poll, pollInterval);
              }
            } catch (e) {
              lastError = `Health parse error: ${e.message}`;
              setTimeout(poll, pollInterval);
            }
          });
        });

        req.on('error', (err) => {
          lastError = `Health error: ${err.message}`;
          setTimeout(poll, pollInterval);
        });

        req.setTimeout(3000, () => {
          req.destroy();
          lastError = `Health request timeout`;
          setTimeout(poll, pollInterval);
        });
      };

      poll();
    });
  }

  /**
   * Stop the AionCore process gracefully.
   */
  async stop() {
    if (!this.process) {
      log('No process to stop');
      return;
    }

    log('Stopping backend...');

    return new Promise((resolve) => {
      const forceKillTimer = setTimeout(() => {
        warn('Force killing backend');
        if (this.process) {
          try { this.process.kill('SIGKILL'); } catch (e) { warn(`Force kill failed: ${e.message}`); }
          this.process = null;
        }
        this.ready = false;
        resolve();
      }, 8000);

      this.process.once('exit', () => {
        clearTimeout(forceKillTimer);
        this.process = null;
        this.ready = false;
        log('Backend stopped');
        resolve();
      });

      try {
        if (process.platform === 'win32') {
          this.process.kill();
        } else {
          this.process.kill('SIGTERM');
        }
      } catch (e) {
        warn(`Kill failed: ${e.message}`);
        clearTimeout(forceKillTimer);
        this.process = null;
        resolve();
      }
    });
  }

  /** Check if the backend is currently running and healthy */
  async isHealthy() {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${this.port}/health`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(body).status === 'ok'); }
          catch { resolve(false); }
        });
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
  }

  getPort() { return this.port; }
  isReady() { return this.ready; }
}

module.exports = { AionCoreManager };
