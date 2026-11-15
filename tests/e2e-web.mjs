// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// End-to-end check of the public web demo, driven like a judge would use it, in headless Chrome.
// Default target: a local copy of app/ served WITHOUT the API (web demo mode).
// Published site: E2E_URL=https://granitespinoza.github.io/astravital/ node tests/e2e-web.mjs
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, realpath, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const browserPath = process.env.BROWSER_PATH ?? ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'].find(existsSync);
assert.ok(browserPath, 'Install Chrome or set BROWSER_PATH.');

async function until(read, what, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const value = await read(); if (value) return value; await delay(100); }
  throw new Error('Timed out waiting for ' + what);
}

// Static server for app/ with no API routes, so the page must fall back to the in-browser web demo.
function staticServer() {
  const root = fileURLToPath(new URL('../app/', import.meta.url));
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wav': 'audio/wav', '.woff2': 'font/woff2'};
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = resolve(root, '.' + (path.endsWith('/') ? path + 'index.html' : path));
    try {
      if (!file.startsWith(resolve(root) + sep)) throw new Error('outside');
      const body = await readFile(file);
      res.writeHead(200, {'Content-Type': types[extname(file)] ?? 'application/octet-stream'}).end(body);
    } catch { res.writeHead(404, {'Content-Type': 'text/html'}).end('<h1>Not found</h1>'); }
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

const profile = await mkdtemp(join(await realpath(tmpdir()), 'astravital-e2e-'));
let server, browser, socket;
const failures = [];
try {
  let url = process.env.E2E_URL;
  if (!url) { server = await staticServer(); url = `http://127.0.0.1:${server.address().port}/`; }
  const origin = new URL(url).origin;
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'], {stdio: 'ignore'});
  const [port, wsPath] = (await until(() => readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => null), 'Chrome')).trim().split(/\r?\n/);
  socket = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((ok, fail) => { socket.onopen = ok; socket.onerror = fail; });
  let seq = 0; const pending = new Map(); const errors = []; const requests = new Set(); let session;
  socket.onmessage = ({data}) => {
    const m = JSON.parse(data);
    if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); } return; }
    if (m.sessionId !== session) return;
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Network.requestWillBeSent') requests.add(m.params.request.url);
  };
  const call = (method, params = {}, sessionId) => new Promise((ok, fail) => { const id = ++seq; pending.set(id, {ok, fail}); socket.send(JSON.stringify({id, method, params, sessionId})); });
  const {targetId} = await call('Target.createTarget', {url: 'about:blank'});
  ({sessionId: session} = await call('Target.attachToTarget', {targetId, flatten: true}));
  const page = (method, params) => call(method, params, session);
  await page('Runtime.enable'); await page('Network.enable'); await page('Page.enable');
  const js = async expression => { const r = await page('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok' : 'FAIL'} - ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failures.push(name); };
  const astra = () => js(`document.querySelector('#conversation .bubble span')?.textContent ?? ''`);

  await page('Page.navigate', {url});
  await until(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO')`), 'web demo status');
  check('page loads in web demo mode', true);
  check('voice button explains it runs in the local app', await js(`document.getElementById('mic-button').disabled && document.getElementById('mic-button').textContent.includes('local app')`));
  check('intro is ready', await js(`document.querySelector('.visual').dataset.intro === 'ready'`));

  await js(`document.getElementById('enter-lenses').click()`);
  await until(() => js(`document.querySelector('.visual').dataset.intro === 'done'`), 'lens transition', 8000);
  check('lens transition reaches the wearer view', true);

  await js(`document.getElementById('message').value='How is my pulse?'; document.getElementById('message-form').requestSubmit(); true`);
  await until(async () => (await astra()).includes('heart reading'), 'pulse answer');
  check('typed "How is my pulse?" gets a heart answer', true, await astra());

  await js(`document.getElementById('next-action').click(); true`);
  await until(async () => (await astra()).includes('Check repeated'), 'repeat answer');
  check('Check again repeats with the original reference', true);
  await js(`document.getElementById('next-action').click(); true`);
  await until(() => js(`!document.getElementById('confirmation').hidden`), 'confirmation');
  check('Prepare review asks for a separate confirmation', true);
  await js(`document.getElementById('confirm-review').click(); true`);
  await until(async () => (await astra()).startsWith('Saved'), 'saved answer');
  check('Confirm save stores the review locally', await js(`document.getElementById('next-action').textContent === 'Review saved'`));

  await page('Page.reload');
  await until(() => js(`document.getElementById('next-action')?.textContent === 'Review saved'`), 'persisted review after reload');
  check('saved review survives a reload', true);

  await js(`document.getElementById('show-body').click(); true`);
  check('body context view opens', await js(`document.getElementById('show-body').getAttribute('aria-pressed') === 'true'`));

  const external = [...requests].filter(r => !r.startsWith(origin) && !r.startsWith('data:') && !r.startsWith('blob:'));
  check('no requests to other domains', external.length === 0, external.join(', '));
  check('no JavaScript errors', errors.length === 0, errors.join(' | '));
} finally {
  socket?.close(); browser?.kill(); server?.close();
  await rm(profile, {recursive: true, force: true}).catch(() => {});
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll end-to-end checks passed');
process.exit(failures.length ? 1 : 0);
