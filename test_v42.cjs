// Electron 42: require('electron') returns path string
// Need to use require('electron/main') or the internal API

try {
  const { app } = require('electron/main');
  console.log('electron/main app:', typeof app);
  app.whenReady().then(() => {
    console.log('Electron version:', process.versions.electron);
    console.log('app.isPackaged:', app.isPackaged);
    app.quit();
  });
} catch (e) {
  console.log('electron/main failed:', e.message);
}
