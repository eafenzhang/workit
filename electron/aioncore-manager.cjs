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
   * Find or extract the AionCore binary.
   * 1. Search predefined paths first
   * 2. If not found, try to extract from asar resources
   * 3. Extract to a permanent location for future runs
   */
  resolveAndExtractBinary() {
    const isWin = process.platform === 'win32';
    const binName = isWin ? 'aioncore.exe' : 'aioncore';

    // 1. Check environment variable override
    if (process.env.AIONCORE_PATH) {
      const p = process.env.AIONCORE_PATH;
      log(`Using AIONCORE_PATH env: ${p}`);
      if (fs.existsSync(p)) return p;
      warn(`AIONCORE_PATH points to non-existent file: ${p}`);
    }

    // 2. Define the cache location (permanent, inside userData)
    const cachedPath = path.join(app.getPath('userData'), 'aioncore', binName);

    // 3. Check if cached version exists
    if (fs.existsSync(cachedPath)) {
      log(`Found cached binary at: ${cachedPath}`);
      return cachedPath;
    }

    // 4. Search all possible source locations
    const searchPaths = [];

    // extraResources → resources/aioncore/aioncore.exe
    if (process.resourcesPath) {
      searchPaths.push(path.join(process.resourcesPath, 'aioncore', binName));
    }

    // Resources alongside app
    try { searchPaths.push(path.join(app.getAppPath(), '..', 'Resources', 'aioncore', binName)); } catch (e) {}

    // App-adjacent directory (dev mode)
    try { searchPaths.push(path.join(app.getAppPath(), 'aioncore', binName)); } catch (e) {}

    // Electron executable directory
    try {
      const exeDir = path.dirname(app.getPath('exe'));
      searchPaths.push(path.join(exeDir, 'aioncore', binName));
      searchPaths.push(path.join(exeDir, 'resources', 'aioncore', binName));
    } catch (e) {}

    // inside app.asar (if bundled as a file entry)
    try {
      const asarPath = path.join(app.getAppPath(), 'aioncore', binName);
      searchPaths.push(asarPath);
    } catch (e) {}

    // Log search diagnostics
    log(`Searching for ${binName}...`);
    log(`process.resourcesPath = ${process.resourcesPath || '(undefined)'}`);
    try { log(`app.getAppPath() = ${app.getAppPath()}`); } catch (e) {}
    try { log(`app.getPath('exe') = ${app.getPath('exe')}`); } catch (e) {}
    log(`userData = ${app.getPath('userData')}`);
    log(`cachedPath = ${cachedPath}`);

    for (const src of searchPaths) {
      try {
        if (fs.existsSync(src)) {
          log(`Found source binary at: ${src}`);

          // Copy to cache for future runs
          try {
            const cacheDir = path.dirname(cachedPath);
            if (!fs.existsSync(cacheDir)) {
              fs.mkdirSync(cacheDir, { recursive: true });
            }
            fs.copyFileSync(src, cachedPath);
            fs.chmodSync(cachedPath, 0o755);
            log(`Cached binary to: ${cachedPath}`);
            return cachedPath;
          } catch (e) {
            warn(`Failed to cache binary: ${e.message}. Running from source.`);
            return src;
          }
        } else {
          warn(`Not found: ${src}`);
        }
      } catch (e) {
        warn(`Error checking path ${src}: ${e.message}`);
      }
    }

    // 5. Last resort: check if aioncore is in PATH
    log('No bundled binary found, checking PATH...');
    const which = isWin ? 'where' : 'which';
    try {
      const { execSync } = require('child_process');
      const pathResult = execSync(`${which} ${binName}`, { encoding: 'utf-8', timeout: 3000 }).trim().split('\n')[0];
      if (pathResult && fs.existsSync(pathResult)) {
        log(`Found in PATH: ${pathResult}`);
        return pathResult;
      }
    } catch (e) {
      warn(`Not in PATH: ${e.message}`);
    }

    const err = new Error(`AionCore binary not found. Please ensure ${binName} is in PATH`);
    log(err.message);
    throw err;
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
    this.binaryPath = this.resolveAndExtractBinary();

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
