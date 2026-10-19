const $ = (id) => document.getElementById(id);

let saved = [];
let params = []; // each: { enabled, key, value }

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

// ---- Request tabs (Params / Headers / Body) ----
document.querySelectorAll('.req-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.req-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.pane').forEach((p) => p.classList.add('hidden'));
    $(tab.dataset.pane).classList.remove('hidden');
  });
});

// ---- Response tabs (Body / Headers) ----
document.querySelectorAll('.resp-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.resp-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const showHeaders = tab.dataset.tab === 'headers';
    $('response').classList.toggle('hidden', showHeaders);
    $('response-headers').classList.toggle('hidden', !showHeaders);
  });
});

// ---- Query params <-> URL sync ----
function splitUrl(url) {
  const hashIdx = url.indexOf('#');
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
  const rest = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const qIdx = rest.indexOf('?');
  const base = qIdx >= 0 ? rest.slice(0, qIdx) : rest;
  const query = qIdx >= 0 ? rest.slice(qIdx + 1) : '';
  return { base, query, hash };
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

function parseQuery(query) {
  if (!query) return [];
  return query
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf('=');
      const key = i >= 0 ? pair.slice(0, i) : pair;
      const value = i >= 0 ? pair.slice(i + 1) : '';
      return { enabled: true, key: safeDecode(key), value: safeDecode(value) };
    });
}

// Table -> URL
function buildUrlFromParams() {
  const { base, hash } = splitUrl($('url').value);
  const query = params
    .filter((p) => p.enabled && p.key)
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
  $('url').value = base + (query ? '?' + query : '') + hash;
}

// URL -> table (disabled rows are kept, since they aren't in the URL)
function syncParamsFromUrl() {
  const { query } = splitUrl($('url').value);
  const disabled = params.filter((p) => !p.enabled);
  params = [...parseQuery(query), ...disabled];
  renderParams();
}

function renderParams() {
  const table = $('params-table');
  table.innerHTML = '';

  if (params.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No query params. Add one below, or type ?key=value in the URL.';
    table.appendChild(empty);
    return;
  }

  params.forEach((p, index) => {
    const row = document.createElement('div');
    row.className = 'param-row' + (p.enabled ? '' : ' disabled');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = p.enabled;
    check.addEventListener('change', () => {
      p.enabled = check.checked;
      row.classList.toggle('disabled', !p.enabled);
      buildUrlFromParams();
    });

    const key = document.createElement('input');
    key.type = 'text';
    key.placeholder = 'key';
    key.value = p.key;
    key.addEventListener('input', () => {
      p.key = key.value;
      buildUrlFromParams();
    });

    const value = document.createElement('input');
    value.type = 'text';
    value.placeholder = 'value';
    value.value = p.value;
    value.addEventListener('input', () => {
      p.value = value.value;
      buildUrlFromParams();
    });

    const del = document.createElement('button');
    del.className = 'delete-param';
    del.textContent = '×';
    del.title = 'Remove';
    del.addEventListener('click', () => {
      params.splice(index, 1);
      buildUrlFromParams();
      renderParams();
    });

    row.append(check, key, value, del);
    table.appendChild(row);
  });
}

$('url').addEventListener('input', syncParamsFromUrl);

$('add-param').addEventListener('click', () => {
  params.push({ enabled: true, key: '', value: '' });
  renderParams();
  const keys = document.querySelectorAll('.param-row input[placeholder="key"]');
  keys[keys.length - 1].focus();
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
  params = [];
  syncParamsFromUrl();
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
  renderParams();
})();