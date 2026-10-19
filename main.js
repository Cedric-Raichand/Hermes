const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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

// ---- Sending requests ----
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

// ---- Saved requests (persisted as JSON in the user data folder) ----
const storePath = () => path.join(app.getPath('userData'), 'saved-requests.json');

ipcMain.handle('load-saved', () => {
  try {
    return JSON.parse(fs.readFileSync(storePath(), 'utf8'));
  } catch {
    return [];
  }
});

ipcMain.handle('save-saved', (_event, list) => {
  fs.writeFileSync(storePath(), JSON.stringify(list, null, 2));
  return true;
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