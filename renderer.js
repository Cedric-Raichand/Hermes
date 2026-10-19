const $ = (id) => document.getElementById(id);

let saved = [];

// ---- Helpers ----
function parseHeaders(text) {
  const headers = {};
  text.split('\n').forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return headers;
}

function setStatus(text, level) {
  const el = $('status-line');
  el.textContent = text;
  el.className = level || '';
}

function statusLevel(code) {
  if (code >= 200 && code < 300) return 'ok';
  if (code >= 300 && code < 400) return 'warn';
  return 'err';
}

// ---- Response tabs ----
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const showHeaders = tab.dataset.tab === 'headers';
    $('response').classList.toggle('hidden', showHeaders);
    $('response-headers').classList.toggle('hidden', !showHeaders);
  });
});

// ---- Sending ----
async function sendRequest() {
  const url = $('url').value.trim();
  if (!url) return;

  $('response').textContent = 'Sending...';
  $('response-headers').textContent = '';
  setStatus('');

  const result = await window.hermes.sendRequest({
    method: $('method').value,
    url,
    headers: parseHeaders($('headers').value),
    body: $('body').value,
  });

  if (!result.ok) {
    setStatus(`Failed after ${result.time} ms`, 'err');
    $('response').textContent = result.error;
    return;
  }

  setStatus(
    `${result.status} ${result.statusText}  ·  ${result.time} ms  ·  ${result.size} B`,
    statusLevel(result.status)
  );

  $('response-headers').textContent = Object.entries(result.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  try {
    $('response').textContent = JSON.stringify(JSON.parse(result.body), null, 2);
  } catch {
    $('response').textContent = result.body;
  }
}

$('send').addEventListener('click', sendRequest);

// Ctrl+Enter (or Cmd+Enter) sends from anywhere
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendRequest();
});

// ---- Saved requests ----
function renderSaved() {
  const list = $('saved-list');
  list.innerHTML = '';

  if (saved.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nothing saved yet.';
    list.appendChild(empty);
    return;
  }

  saved.forEach((req) => {
    const item = document.createElement('div');
    item.className = 'saved-item';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = req.method;

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = req.name;

    const del = document.createElement('button');
    del.className = 'delete';
    del.textContent = '×';
    del.title = 'Delete';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      saved = saved.filter((r) => r.id !== req.id);
      await window.hermes.saveSaved(saved);
      renderSaved();
    });

    item.addEventListener('click', () => loadRequest(req));
    item.append(badge, label, del);
    list.appendChild(item);
  });
}

function loadRequest(req) {
  $('method').value = req.method;
  $('url').value = req.url;
  $('headers').value = req.headers;
  $('body').value = req.body;
  $('name').value = req.name;
}

$('save').addEventListener('click', async () => {
  const name = $('name').value.trim();
  const url = $('url').value.trim();
  if (!name || !url) return;

  const entry = {
    id: Date.now(),
    name,
    method: $('method').value,
    url,
    headers: $('headers').value,
    body: $('body').value,
  };

  // Saving with an existing name overwrites it
  const existing = saved.findIndex((r) => r.name === name);
  if (existing >= 0) {
    entry.id = saved[existing].id;
    saved[existing] = entry;
  } else {
    saved.push(entry);
  }

  await window.hermes.saveSaved(saved);
  renderSaved();
});

// ---- Startup ----
(async () => {
  saved = await window.hermes.loadSaved();
  renderSaved();
})();