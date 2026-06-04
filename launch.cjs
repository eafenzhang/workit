// Launch script that unsets ELECTRON_RUN_AS_NODE before starting Electron
const { spawn } = require('child_process');
const path = require('path');

const electronPath = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.'], {
  cwd: __dirname,
  env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => process.exit(code || 0));
child.on('error', (err) => {
  console.error('Failed to launch:', err);
  process.exit(1);
});
