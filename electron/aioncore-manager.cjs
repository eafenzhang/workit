// ──────────────────────────────────────────────────────
// AionCore Process Manager
// Manages the AionCore backend subprocess lifecycle
// ──────────────────────────────────────────────────────

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const { app } = require('electron');

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
   * Priority: env var → bundled resources → PATH
   */
  resolveBinaryPath() {
    // 1. Environment variable override (for development)
    if (process.env.AIONCORE_PATH) {
      const userPath = process.env.AIONCORE_PATH;
      console.log(`[aioncore] Using AIONCORE_PATH: ${userPath}`);
      return userPath;
    }

    // 2. Bundled with Electron (production)
    const resourcesPath = process.resourcesPath || path.join(app.getAppPath(), '..', 'Resources');
    const bundledPath = process.platform === 'win32'
      ? path.join(resourcesPath, 'aioncore', 'aioncore.exe')
      : path.join(resourcesPath, 'aioncore', 'aioncore');

    const fs = require('fs');
    if (fs.existsSync(bundledPath)) {
      console.log(`[aioncore] Using bundled binary: ${bundledPath}`);
      return bundledPath;
    }

    // 3. Check in app's own directory (dev mode)
    const appPath = path.join(app.getAppPath(), 'aioncore',
      process.platform === 'win32' ? 'aioncore.exe' : 'aioncore');
    if (fs.existsSync(appPath)) {
      console.log(`[aioncore] Using app-adjacent binary: ${appPath}`);
      return appPath;
    }

    // 4. Fallback to PATH
    console.warn('[aioncore] No bundled binary found, falling back to PATH');
    return 'aioncore';
  }

  /**
   * Start the AionCore backend process.
   * @param {Object} options
   * @param {number} [options.port=13400] - HTTP port
   * @param {string} [options.dataDir] - Data directory (defaults to app userData)
   * @param {number} [options.timeout=30000] - Startup timeout in ms
   */
  async start(options = {}) {
    const port = options.port || 13400;
    const dataDir = options.dataDir || path.join(app.getPath('userData'), 'aioncore-data');
    const timeout = options.timeout || 30000;

    this.port = port;
    this.dataDir = dataDir;
    this.binaryPath = this.resolveBinaryPath();

    console.log(`[aioncore] Starting backend on port ${port}`);
    console.log(`[aioncore] Data directory: ${dataDir}`);
    console.log(`[aioncore] Binary: ${this.binaryPath}`);

    // Ensure data directory exists
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Spawn the process
    this.process = spawn(this.binaryPath, [
      '--port', String(port),
      '--data-dir', dataDir,
      '--local',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    // Log stdout
    this.process.stdout.on('data', (data) => {
      console.log(`[aioncore:out] ${data.toString().trim()}`);
    });

    // Log stderr
    this.process.stderr.on('data', (data) => {
      console.error(`[aioncore:err] ${data.toString().trim()}`);
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log(`[aioncore] Process exited (code: ${code}, signal: ${signal})`);
      this.process = null;
      this.ready = false;
    });

    this.process.on('error', (err) => {
      console.error(`[aioncore] Process error: ${err.message}`);
      this.process = null;
      this.ready = false;
    });

    // Wait for health check
    await this.waitForReady(timeout);
    this.ready = true;
    console.log(`[aioncore] Backend ready on port ${port}`);
  }

  /**
   * Wait for the backend health endpoint to respond.
   */
  waitForReady(timeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const pollInterval = 500;

      const poll = () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`AionCore startup timeout after ${timeout}ms`));
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
                setTimeout(poll, pollInterval);
              }
            } catch {
              setTimeout(poll, pollInterval);
            }
          });
        });

        req.on('error', () => {
          setTimeout(poll, pollInterval);
        });

        req.setTimeout(2000, () => {
          req.destroy();
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
    if (!this.process) return;

    console.log('[aioncore] Stopping backend...');

    return new Promise((resolve) => {
      const killTimeout = setTimeout(() => {
        console.warn('[aioncore] Force killing backend');
        if (this.process) {
          this.process.kill('SIGKILL');
          this.process = null;
        }
        resolve();
      }, 5000);

      this.process.once('exit', () => {
        clearTimeout(killTimeout);
        this.process = null;
        this.ready = false;
        resolve();
      });

      // Send SIGTERM (or on Windows, use process.kill with no signal)
      if (process.platform === 'win32') {
        this.process.kill();  // Windows: spawn.kill() sends WM_CLOSE
      } else {
        this.process.kill('SIGTERM');
      }
    });
  }

  /**
   * Check if the backend is currently running and healthy.
   */
  async isHealthy() {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${this.port}/health`, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data.status === 'ok');
          } catch {
            resolve(false);
          }
        });
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
  }

  /** Get the backend port number */
  getPort() { return this.port; }
  /** Check if backend has been started and is ready */
  isReady() { return this.ready; }
}

module.exports = { AionCoreManager };
