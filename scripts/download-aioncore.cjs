/**
 * Download AionCore binary for Windows x64
 * Used by `npm run download:aioncore` and electron-builder hooks
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VERSION = 'v0.1.26';
const PLATFORM = process.platform === 'win32' ? 'windows-msvc' : process.platform === 'darwin' ? 'apple-darwin' : 'unknown-linux-gnu';
const ARCH = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
const FILE_NAME = `aioncore-${VERSION}-${ARCH}-pc-${PLATFORM}.zip`;
const URL = `https://github.com/iOfficeAI/AionCore/releases/download/${VERSION}/${FILE_NAME}`;
const TARGET_DIR = path.join(__dirname, '..', 'electron', 'aioncore');
const ZIP_PATH = path.join(TARGET_DIR, 'aioncore.zip');
const BINARY_NAME = process.platform === 'win32' ? 'aioncore.exe' : 'aioncore';

async function main() {
  console.log(`[download-aioncore] Target: ${URL}`);

  // Check if binary already exists
  const binaryPath = path.join(TARGET_DIR, BINARY_NAME);
  if (fs.existsSync(binaryPath)) {
    console.log(`[download-aioncore] Binary already exists: ${binaryPath}`);
    return;
  }

  // Create target directory
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  // Download
  console.log(`[download-aioncore] Downloading from ${URL}...`);
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(ZIP_PATH);
    https.get(URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });

  // Extract
  console.log(`[download-aioncore] Extracting...`);
  try {
    execSync(`unzip -o "${ZIP_PATH}" -d "${TARGET_DIR}"`, { stdio: 'pipe' });
  } catch {
    // Try 7z as fallback
    execSync(`7z x "${ZIP_PATH}" -o"${TARGET_DIR}" -y`, { stdio: 'pipe' });
  }

  // Cleanup
  fs.unlinkSync(ZIP_PATH);
  console.log(`[download-aioncore] Done: ${path.join(TARGET_DIR, BINARY_NAME)}`);
}

main().catch(err => {
  console.error(`[download-aioncore] Failed: ${err.message}`);
  process.exit(1);
});
