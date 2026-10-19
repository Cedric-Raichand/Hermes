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

// ---- JSON storage in the user data folder ----
const dataPath = (name) => path.join(app.getPath('userData'), name);

function readJson(name) {
  try {
    return JSON.parse(fs.readFileSync(dataPath(name), 'utf8'));
  } catch {
    return [];
  }
}

function writeJson(name, data) {
  fs.writeFileSync(dataPath(name), JSON.stringify(data, null, 2));
  return true;
}

ipcMain.handle('load-saved', () => readJson('saved-requests.json'));
ipcMain.handle('save-saved', (_event, list) => writeJson('saved-requests.json', list));
ipcMain.handle('load-history', () => readJson('history.json'));
ipcMain.handle('save-history', (_event, list) => writeJson('history.json', list));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});