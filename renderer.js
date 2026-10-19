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

// ---- Sending ----
$('send').addEventListener('click', async () => {
  const url = $('url').value.trim();
  if (!url) return;

  $('response').textContent = 'Sending...';
  $('status-line').textContent = '';

  const result = await window.hermes.sendRequest({
    method: $('method').value,
    url,
    headers: parseHeaders($('headers').value),
    body: $('body').value,
  });

  if (!result.ok) {
    $('status-line').textContent = `Failed after ${result.time} ms`;
    $('response').textContent = result.error;
    return;
  }

  $('status-line').textContent =
    `${result.status} ${result.statusText}  ·  ${result.time} ms  ·  ${result.size} B`;

  try {
    $('response').textContent = JSON.stringify(JSON.parse(result.body), null, 2);
  } catch {
    $('response').textContent = result.body;
  }
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