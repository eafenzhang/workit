const electron = require('electron');
console.log('require(electron) type:', typeof electron);
console.log('require(electron) value:', electron);
try {
  console.log('app:', typeof electron.app);
} catch (e) {
  console.log('no .app:', e.message);
}

// Try destructuring
try {
  const { app } = require('electron');
  console.log('destructured app:', typeof app);
} catch (e) {
  console.log('destructure failed:', e.message);
}
