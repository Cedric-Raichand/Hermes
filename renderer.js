const $ = (id) => document.getElementById(id);

function parseHeaders(text) {
  const headers = {};
  text.split('\n').forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return headers;
}

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