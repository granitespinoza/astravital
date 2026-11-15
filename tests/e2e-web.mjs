// AI assistance: Anthropic Claude and OpenAI Codex. See docs/SI-USAGE.md.
// End-to-end check of the public web demo, driven like a judge would use it, in headless Chrome.
// Default target: a local copy of app/ served WITHOUT the API (web demo mode).
// Published site: E2E_URL=https://granitespinoza.github.io/astravital/ node tests/e2e-web.mjs
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const localApps = process.env.LOCALAPPDATA ?? '';
const programFiles = process.env.ProgramFiles ?? '';
const programFilesX86 = process.env['ProgramFiles(x86)'] ?? '';
const browserPath = process.env.BROWSER_PATH ?? [
  join(programFiles, 'Google/Chrome/Application/chrome.exe'),
  join(localApps, 'Google/Chrome/Application/chrome.exe'),
  join(programFilesX86, 'Microsoft/Edge/Application/msedge.exe'),
  join(programFiles, 'Microsoft/Edge/Application/msedge.exe'),
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].find(existsSync);
assert.ok(browserPath, 'Install Chrome or Edge, or set BROWSER_PATH to a Chromium executable.');

async function until(read, what, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const value = await read(); if (value) return value; await delay(100); }
  throw new Error('Timed out waiting for ' + what);
}

// Page checks: a document that is still loading can throw (element not parsed yet, context replaced),
// so keep polling and report the last page error only if the wait times out.
async function untilPage(read, what, ms = 15000) {
  let last;
  try {
    return await until(async () => { try { return await read(); } catch (error) { last = error; return false; } }, what, ms);
  } catch (error) { throw new Error(error.message + (last ? ` (last page error: ${last.message})` : '')); }
}

// Match the Pages project subpath and provide no API, so both views must use the web demo.
const projectPath = '/astravital/';
function staticServer() {
  const root = fileURLToPath(new URL('../app/', import.meta.url));
  const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png'};
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (!path.startsWith(projectPath)) throw new Error('outside');
      const relative = path.slice(projectPath.length);
      const file = resolve(root, relative.endsWith('/') || !relative ? relative + 'index.html' : relative);
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
  if (!url) { server = await staticServer(); url = `http://127.0.0.1:${server.address().port}${projectPath}`; }
  const origin = new URL(url).origin;
  // Screenshot runs use software WebGL so the anatomy renders; normal runs keep the GPU off.
  const graphics = process.env.GROUND_SCREENSHOT_PATH || process.env.BODY_SCREENSHOT_PATH ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-gpu'];
  browser = spawn(browserPath, ['--headless=new', ...graphics, '--disable-background-networking', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=1440,900',
    'about:blank'], {stdio: 'ignore', windowsHide: true});
  let startupError;
  browser.once('error', error => { startupError = error; });
  const [port, wsPath] = (await until(async () => {
    if (startupError) throw startupError;
    if (browser.exitCode !== null) throw new Error(`Chromium exited before starting (code ${browser.exitCode}).`);
    try { return await readFile(join(profile, 'DevToolsActivePort'), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }, 'Chromium debugging endpoint')).trim().split(/\r?\n/);
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
  // E2E_DATE=2027-01-26 runs every page with a shifted clock, to prove the demo does not expire.
  if (process.env.E2E_DATE) {
    const shift = Date.parse(process.env.E2E_DATE) - Date.now();
    assert.ok(Number.isFinite(shift), 'E2E_DATE must be a date such as 2027-01-26');
    await page('Page.addScriptToEvaluateOnNewDocument', {source:`(() => { const shift = ${shift}, RealDate = Date;
      class ShiftedDate extends RealDate { constructor(...args) { if (args.length) super(...args); else super(RealDate.now() + shift); } static now() { return RealDate.now() + shift; } }
      globalThis.Date = ShiftedDate; })();`});
    console.log('Clock shifted to ' + process.env.E2E_DATE);
  }
  const js = async expression => { const r = await page('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true}); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok' : 'FAIL'} - ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failures.push(name); };
  const astra = () => js(`document.querySelector('#conversation .bubble span')?.textContent ?? ''`);

  await page('Page.navigate', {url});
  await untilPage(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO')`), 'web demo status');
  check('page loads in web demo mode', true);
  if (process.env.E2E_DATE) check('page clock runs at ' + process.env.E2E_DATE, (await js('new Date().toISOString()')).startsWith(process.env.E2E_DATE));
  check('voice button explains it runs in the local app', await js(`document.getElementById('mic-button').disabled && document.getElementById('mic-button').textContent.includes('local app')`));
  check('intro is ready', await js(`document.querySelector('.visual').dataset.intro === 'ready'`));

  await js(`document.getElementById('enter-lenses').click()`);
  await untilPage(() => js(`document.querySelector('.visual').dataset.intro === 'done'`), 'lens transition', 8000);
  check('lens transition reaches the wearer view', true);

  await js(`document.getElementById('message').value='How is my pulse?'; document.getElementById('message-form').requestSubmit(); true`);
  await untilPage(async () => (await astra()).includes('heart reading'), 'pulse answer');
  check('typed "How is my pulse?" gets a heart answer', true, await astra());

  await js(`document.getElementById('next-action').click(); true`);
  await untilPage(async () => (await astra()).includes('Check repeated'), 'repeat answer');
  check('Check again repeats with the original reference', await js(`document.getElementById('state-copy').textContent.includes('original reference')`));
  await js(`document.getElementById('next-action').click(); true`);
  await untilPage(() => js(`!document.getElementById('confirmation').hidden`), 'confirmation');
  check('Prepare review asks for a separate confirmation', true);
  await js(`document.getElementById('confirm-review').click(); true`);
  await untilPage(async () => (await astra()).startsWith('Saved'), 'saved answer');
  check('Confirm save stores the review locally', await js(`document.getElementById('next-action').textContent === 'Review saved'`));

  await page('Page.reload');
  await untilPage(() => js(`document.getElementById('next-action')?.textContent === 'Review saved'`), 'persisted review after reload');
  check('saved review survives a reload', true);

  await js(`document.getElementById('show-body').click(); true`);
  check('body context view opens', await js(`document.getElementById('show-body').getAttribute('aria-pressed') === 'true'`));
  await untilPage(() => js(`(() => { const img = document.querySelector('#body-art .anatomy-body'); return Boolean(img?.complete && img.naturalWidth); })()`), 'body illustration');
  check('Body context shows the AI-generated anatomy with its label', await js(`document.getElementById('body-art').getClientRects().length > 0 &&
    document.querySelector('#body-label small').textContent.includes('AI-generated image')`));
  check('Body context markers take their status from the data, not the image', await js(`
    document.querySelector('#body-art .anatomy-marker[data-zone=heart]').dataset.level === document.getElementById('hud-heart').dataset.level &&
    document.querySelector('#body-art .anatomy-marker[data-zone=bone]').dataset.level === document.getElementById('hud-bone').dataset.level &&
    document.getElementById('hud-heart').dataset.level !== 'unknown'`));
  if (process.env.BODY_SCREENSHOT_PATH) {
    await js(`document.fonts.ready.then(() => true)`);
    await delay(1200);
    const {data} = await page('Page.captureScreenshot', {format:'png', fromSurface:true});
    await writeFile(process.env.BODY_SCREENSHOT_PATH, Buffer.from(data, 'base64'));
  }
  check('glasses never show the experimental forecast to the crew', !(await js(`document.body.innerText.toLowerCase().includes('forecast')`)));
  await js(`document.getElementById('message').value='Can you diagnose me?'; document.getElementById('message-form').requestSubmit(); true`);
  await untilPage(async () => (await astra()).includes('cannot diagnose'), 'diagnosis decline');
  check('asked for a diagnosis, Astra declines in the conversation', (await astra()).includes('onboard medical officer'));

  const externalRequests = () => [...requests].filter(request => {
    const target = new URL(request);
    return target.origin !== origin && !['data:', 'blob:'].includes(target.protocol);
  });
  const external = externalRequests();
  check('no requests to other domains', external.length === 0, external.join(', '));
  check('no JavaScript errors', errors.length === 0, errors.join(' | '));

  requests.clear();
  errors.length = 0;
  const groundLink = await js(`(() => {
    const link = document.getElementById('earth-doctor-link');
    return link?.getClientRects().length && link.textContent.includes('Earth doctor view') ? link.href : null;
  })()`);
  check('glasses page links visibly to Earth doctor view', Boolean(groundLink));
  assert.ok(groundLink, 'Expected a visible link to mission.html#ground');
  const wearerReading = await js(`Number(document.getElementById('reading-value').textContent)`);
  check('glasses link carries the repeated check',new URL(groundLink).searchParams.get('case') === 'repeat');
  await page('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await page('Page.navigate', {url:groundLink});
  await untilPage(() => js(`document.getElementById('connection')?.textContent.includes('WEB DEMO') &&
    document.querySelector('#ground-history svg')`), 'Ground web demo with seeded history');
  check('Ground displays WEB DEMO and SIMULATED DATA', await js(`!document.getElementById('ground-panel').hidden &&
    document.body.innerText.includes('SIMULATED DATA') && document.body.innerText.includes('WEB DEMO')`));
  check('Ground displays the resting heart-rate measurement and personal band', await js(`
    /\\d+\\s*bpm/i.test(document.getElementById('ground-heart').innerText) &&
    !!document.querySelector('#ground-history svg .chart-band')`));
  check('Ground opens the same repeated check for Alex Morgan',await js(`
    document.getElementById('ground-member').value === 'crew-03' &&
    document.getElementById('ground-shared-case').textContent.includes('Repeat resting check') &&
    parseFloat(document.querySelector('#ground-heart .mission-value').textContent) === ${wearerReading}`));
  check('Ground displays the prioritized inbox and crew timeline', await js(`
    /ALERT/i.test(document.getElementById('ground-inbox').innerText) &&
    document.getElementById('ground-timeline').children.length > 0`));
  const groundHeart = await js(`document.getElementById('ground-heart').innerText`);
  check('Ground shows the experimental forecast for the doctor only', groundHeart.includes('Trend forecast · experimental') &&
    /Sol \+1\s*[\d.]+ bpm \(80%/.test(groundHeart) && groundHeart.includes('flight surgeon only'));
  check('Ground forecast uses one value per sol', groundHeart.includes('14 sols of history'));
  check('Ground inbox marks OK rows as within reference', await js(`[...document.querySelectorAll('#ground-inbox .mission-status')]
    .some(status => status.dataset.level === 'stable' && status.textContent.startsWith('✓ OK'))`));
  await js(`document.getElementById('ground-note').value = 'Training note from E2E';
    document.getElementById('ground-action-form').requestSubmit(); true`);
  await untilPage(() => js(`document.getElementById('ground-timeline').innerText.includes('Training note from E2E')`), 'Ground note saved');
  await page('Page.reload');
  await untilPage(() => js(`document.getElementById('ground-timeline')?.innerText.includes('Training note from E2E')`), 'Ground note after reload');
  check('Ground note survives a reload', true);
  await untilPage(() => js(`(() => { const img = document.querySelector('#ground-scene .anatomy-body'); return Boolean(img?.complete && img.naturalWidth) && !document.getElementById('ground-scene').hasAttribute('aria-busy'); })()`), 'Ground illustration');
  check('Ground shows the AI-generated anatomy with visible labels', await js(`document.getElementById('ground-scene').dataset.view === 'body' &&
    document.querySelector('#ground-scene .ai-badge').textContent.includes('AI-generated image') &&
    document.querySelector('.ground-anatomy figcaption').textContent.includes('AI-generated image')`));
  check('Ground markers take their status from the report, not the image', await js(`
    document.querySelector('#ground-scene .anatomy-marker[data-zone=heart]').dataset.level === document.querySelector('#ground-heart .status-chip').dataset.level &&
    document.querySelector('#ground-scene .anatomy-marker[data-zone=bone]').dataset.level === document.querySelector('#ground-bone .status-chip').dataset.level &&
    document.querySelector('#ground-scene .anatomy-marker[data-zone=heart]').dataset.level === 'review'`));
  if (process.env.GROUND_SCREENSHOT_PATH) {
    await untilPage(() => js(`!document.getElementById('ground-scene')?.hasAttribute('aria-busy')`),
      'Ground anatomy');
    await js(`document.fonts.ready.then(() => true)`);
    await delay(1500);
    const {data} = await page('Page.captureScreenshot', {format:'png', fromSurface:true, captureBeyondViewport:true,
      clip:{x:0, y:0, width:1440, height:1260, scale:1}});
    await writeFile(process.env.GROUND_SCREENSHOT_PATH, Buffer.from(data, 'base64'));
  }

  await js(`document.getElementById('ground-bone-button').click()`);
  check('Ground displays the seeded bone scan', await js(`document.getElementById('ground-bone').getClientRects().length > 0 &&
    /g\\/cm[²2]/.test(document.getElementById('ground-bone').innerText) &&
    document.getElementById('ground-bone').innerText.includes('DXA')`));
  await untilPage(() => js(`!document.getElementById('ground-scene')?.hasAttribute('aria-busy')`),'Ground anatomy controls');
  await js(`document.getElementById('ground-heart-button').click();
    document.getElementById('ground-zoom-in').click(); true`);
  check('Ground zooms in on the heart close-up',await js(`
    document.getElementById('ground-scene').dataset.region === 'heart' &&
    document.getElementById('ground-scene').dataset.zoom === '4' && document.getElementById('ground-scene').dataset.view === 'heart' &&
    document.querySelector('.anatomy-closeup[data-layer=heart]').naturalWidth > 0`));
  await js(`document.getElementById('ground-bone-button').click(); true`);
  check('Ground follows the left hip close-up with the same magnification',await js(`
    document.getElementById('ground-scene').dataset.region === 'bone' &&
    document.getElementById('ground-scene').dataset.zoom === '4' && document.getElementById('ground-scene').dataset.view === 'bone' &&
    document.querySelector('.anatomy-closeup[data-layer=bone]').naturalWidth > 0`));
  await js(`document.getElementById('ground-zoom-reset').click(); true`);
  check('Full body restores the overview',await js(`document.getElementById('ground-scene').dataset.zoom === '1' &&
    document.getElementById('ground-scene').dataset.view === 'body'`));
  await js(`(() => {
    const select = document.getElementById('ground-member');
    select.value = 'crew-01';
    select.dispatchEvent(new Event('change', {bubbles:true}));
    document.getElementById('ground-bone-button').click();
  })()`);
  check('Ground discloses a missing scan for another crew member', await js(`
    document.getElementById('ground-bone').innerText.includes('No bone scan in this simulation')`));

  for (const [width, height] of [[768, 1024], [390, 844]]) {
    await page('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: true});
    check(`Ground fits a ${width} px viewport`, await js(`window.innerWidth === ${width} &&
      document.documentElement.scrollWidth <= window.innerWidth + 1`));
    check(`Ground anatomy fits its panel at ${width} px`, await js(`(() => {
      const stage = document.getElementById('ground-scene').getBoundingClientRect();
      const figure = document.querySelector('#ground-scene .anatomy-figure').getBoundingClientRect();
      return figure.height > 100 && figure.top >= stage.top - 1 && figure.bottom <= stage.bottom + 1 && figure.left >= stage.left - 1 && figure.right <= stage.right + 1;
    })()`));
  }
  const groundExternal = externalRequests();
  check('Ground makes no requests to other domains', groundExternal.length === 0, groundExternal.join(', '));
  check('Ground has no JavaScript errors', errors.length === 0, errors.join(' | '));

  // Judges may come back weeks later: Reset demo returns the web demo to its first state.
  await page('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await page('Page.navigate', {url});
  await untilPage(() => js(`document.getElementById('next-action')?.textContent === 'Review saved'`), 'saved state before reset');
  await js(`document.getElementById('reset-demo').click(); true`);
  await untilPage(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO') && document.getElementById('next-action')?.textContent === 'Check again'`), 'demo reset');
  check('Reset demo returns the web demo to its first state', await js(`(() => { try { return !localStorage.getItem('astravital-ground-actions-v1'); } catch { return false; } })()`));
  check('no JavaScript errors after reset', errors.length === 0, errors.join(' | '));
  for (const [width, height] of [[768, 1024], [390, 844]]) {
    await page('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: true});
    await page('Page.reload');
    await untilPage(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO')`), 'glasses page at ' + width);
    check(`Glasses page fits a ${width} px viewport`, await js(`window.innerWidth === ${width} &&
      document.documentElement.scrollWidth <= window.innerWidth + 1`), await js(`document.documentElement.scrollWidth + ' px wide'`));
  }
} finally {
  socket?.close(); browser?.kill(); server?.close();
  await rm(profile, {recursive: true, force: true}).catch(() => {});
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll end-to-end checks passed');
process.exit(failures.length ? 1 : 0);
