const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Hermes',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile('index.html');
}

ipcMain.handle('send-request', async (_event, { method, url, headers, body }) => {
  const start = Date.now();
  try {
    const options = { method, headers };
    if (body && !['GET', 'HEAD'].includes(method)) options.body = body;

    const res = await fetch(url, options);
    const text = await res.text();

    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      time: Date.now() - start,
      size: Buffer.byteLength(text),
      headers: Object.fromEntries(res.headers.entries()),
      body: text,
    };
  } catch (err) {
    return { ok: false, error: err.message, time: Date.now() - start };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});