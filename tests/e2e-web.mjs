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
  const graphics = process.env.GROUND_SCREENSHOT_PATH || process.env.BODY_SCREENSHOT_PATH || process.env.FOCUS_SCREENSHOT_PATH ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--disable-gpu'];
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
  // A stand-in for the browser's speech recogniser: it "hears" one sentence, so the voice path can be tested.
  // First it hears a question WITHOUT the wake phrase (must be ignored), then "OK Astra, …" (must be answered).
  await page('Page.addScriptToEvaluateOnNewDocument', {source:`window.__heard = 0; window.SpeechRecognition = window.webkitSpeechRecognition = class {
    start() { if (window.__heard++) return; setTimeout(() => {
      this.onresult?.({resultIndex:0, results:[[{transcript:'How are my bones?'}]]});
      setTimeout(() => this.onresult?.({resultIndex:1, results:[[{transcript:'How are my bones?'}],[{transcript:'OK Astra, how is my heart?'}]]}), 120);
    }, 80); }
    stop() { this.onend?.(); } };`});
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
  // Readability audit: every visible piece of text must be at least 12 px and meet WCAG AA contrast (4.5:1)
  // against its effective background (solid backgrounds only; a close approximation, not a certification).
  const textAudit = () => js(`(() => {
    const parse = c => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return {r:p[0], g:p[1], b:p[2], a:p.length > 3 ? p[3] : 1}; };
    const over = (top, bot) => ({r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1});
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    const bgOf = el => { const stack = []; for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) stack.push(c); } let bg = {r:3, g:4, b:5, a:1}; for (const c of stack.reverse()) bg = over(c, bg); return bg; };
    const out = {small: [], low: [], n: 0};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t; (t = walker.nextNode());) {
      const text = t.textContent.trim(); if (!text) continue;
      const el = t.parentElement; if (!el || el.closest('script,style,noscript,option,.sr-only,pre,[aria-hidden=true]')) continue;
      let hidden = false; for (let n = el; n; n = n.parentElement) { const st = getComputedStyle(n); if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) { hidden = true; break; } }
      const rect = el.getBoundingClientRect(); if (hidden || !rect.width || !rect.height) continue;
      out.n++;
      const cs = getComputedStyle(el), size = parseFloat(cs.fontSize);
      const label = (el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : el.tagName.toLowerCase()) + ' "' + text.slice(0, 26) + '"';
      if (size < 11.95) out.small.push(label + ' ' + size.toFixed(1) + 'px');
      const fg = parse(cs.color); if (fg) { const bg = bgOf(el), f = over(fg, bg), a = lum(f), b = lum(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); if (ratio < 4.5) out.low.push(label + ' ' + ratio.toFixed(1) + ':1'); }
    }
    return out;
  })()`);
  const checkReadable = async where => {
    const audit = await textAudit();
    check(`${where}: no text smaller than 12 px`, audit.small.length === 0, audit.small.slice(0, 4).join(' | ') || `${audit.n} text blocks`);
    check(`${where}: text meets WCAG AA contrast (4.5:1)`, audit.low.length === 0, audit.low.slice(0, 4).join(' | ') || `${audit.n} text blocks`);
  };
  // Overlap audit: no visible text inside the lens may sit on top of other text (measured on the real text lines).
  const textOverlaps = scope => js(`(() => {
    const root = document.querySelector(${JSON.stringify(scope)});
    const shown = el => { for (let n = el; n && n !== document.body; n = n.parentElement) { const st = getComputedStyle(n); if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false; } return true; };
    const items = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t; (t = walker.nextNode());) {
      const text = t.textContent.trim(); if (!text) continue;
      const el = t.parentElement; if (!el || el.closest('script,style,[aria-hidden=true],.sr-only') || !shown(el)) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      for (const r of range.getClientRects()) if (r.width > 2 && r.height > 2) items.push({el, r, text: text.slice(0, 26)});
    }
    const hits = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 3 && h > 3) hits.push('"' + a.text + '" x "' + b.text + '"');
    }
    return hits;
  })()`);
  // Optional screenshots for design review: SHOT_DIR=/some/folder node tests/e2e-web.mjs
  const snap = async name => {
    if (!process.env.SHOT_DIR) return;
    await delay(1000);
    const {data} = await page('Page.captureScreenshot', {format:'png', fromSurface:true, captureBeyondViewport:true});
    await writeFile(join(process.env.SHOT_DIR, name + '.png'), Buffer.from(data, 'base64'));
  };

  await page('Page.navigate', {url});
  await untilPage(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO')`), 'web demo status');
  check('page loads in web demo mode', true);
  if (process.env.E2E_DATE) check('page clock runs at ' + process.env.E2E_DATE, (await js('new Date().toISOString()')).startsWith(process.env.E2E_DATE));
  check('voice button is ready when the browser offers speech recognition', await js(`!document.getElementById('mic-button').disabled && document.getElementById('mic-button').textContent.includes('Talk to Astra')`));
  check('typing box is open in the web demo', await js(`document.querySelector('.text-input').open === true`));
  check('the lens tells the wearer to say “OK Astra”', await js(`document.getElementById('lens-voice').textContent.includes('OK Astra')`));
  check('intro is ready', await js(`document.querySelector('.visual').dataset.intro === 'ready'`));

  await js(`document.getElementById('enter-lenses').click()`);
  await untilPage(() => js(`document.querySelector('.visual').dataset.intro === 'done'`), 'lens transition', 8000);
  check('lens transition reaches the wearer view', true);
  check('the header says what ASTRAVITAL is', await js(`document.querySelector('header .prototype').textContent.includes('health monitoring') &&
    document.querySelector('.hero-about .about').textContent.includes('ASTRAVITAL is autonomous, adaptive health-monitoring software')`));
  check('the hero shows who uses it: Astra, the onboard medical officer and the Earth doctor', await js(`document.querySelectorAll('.roles li').length === 3 &&
    document.querySelector('.roles').textContent.includes('Onboard medical officer') && document.querySelector('.roles').textContent.includes('Earth doctor')`));
  check('Astra greets the astronaut by name', await js(`document.getElementById('astra-title').textContent.includes('Alex')`));
  const sway1 = await js(`getComputedStyle(document.querySelector('.optics')).translate`);
  await delay(1500);
  const sway2 = await js(`getComputedStyle(document.querySelector('.optics')).translate`);
  check('the lens moves sideways (its position changes over time) and a glint crosses the glass', sway1 !== sway2 && await js(`document.documentElement.dataset.motion === 'full' &&
    document.querySelector('.optics').getClientRects().length > 0 &&
    getComputedStyle(document.querySelector('.optics'), '::before').animationName.includes('optics-glint')`), `${sway1} → ${sway2}`);
  await checkReadable('Glasses page (desktop)');
  await snap('glasses-desktop');
  if (process.env.FOCUS_SCREENSHOT_PATH) {
    await delay(1500);
    const {data} = await page('Page.captureScreenshot', {format:'png', fromSurface:true});
    await writeFile(process.env.FOCUS_SCREENSHOT_PATH, Buffer.from(data, 'base64'));
  }

  await js(`document.getElementById('message').value='How is my pulse?'; document.getElementById('message-form').requestSubmit(); true`);
  await untilPage(async () => (await astra()).includes('heart reading'), 'pulse answer');
  check('typed "How is my pulse?" gets a heart answer', true, await astra());
  check('each reply shows the question it answers', await js(`document.querySelector('#conversation .you-asked')?.textContent.includes('How is my pulse?')`));
  await js(`document.getElementById('message').value='   '; document.getElementById('message-form').requestSubmit(); true`);
  check('sending an empty message explains what to do', await js(`document.getElementById('voice-error').textContent.includes('Type a question first')`));

  await js(`document.getElementById('next-action').click(); true`);
  await untilPage(async () => (await astra()).includes('Check repeated'), 'repeat answer');
  check('Check again repeats with the original reference', await js(`document.getElementById('state-copy').textContent.includes('original reference')`));
  await js(`document.getElementById('next-action').click(); true`);
  await untilPage(() => js(`!document.getElementById('confirmation').hidden`), 'confirmation');
  check('Prepare review asks for a separate confirmation', true);
  await js(`document.getElementById('confirm-review').click(); true`);
  await untilPage(async () => (await astra()).startsWith('Saved'), 'saved answer');
  check('Confirm save stores the review locally', await js(`document.getElementById('next-action').textContent === 'Message your medical team'`));

  await page('Page.reload');
  await untilPage(() => js(`document.getElementById('next-action')?.textContent === 'Message your medical team'`), 'persisted review after reload');
  check('saved review survives a reload', true);
  // After saving, the primary button is the next useful step: it opens the case conversation with Astra's draft.
  await js(`document.getElementById('next-action').click(); true`);
  await untilPage(() => js(`(document.querySelector('#crew-conversation textarea')?.value ?? '').length > 20`), 'Astra draft in the conversation');
  check('after saving, "Message your medical team" opens the conversation with Astra\'s draft', await js(`
    document.querySelector('#crew-conversation textarea').value.includes('bpm')`));
  await js(`(() => { const t = document.querySelector('#crew-conversation textarea'); t.value = ''; t.dispatchEvent(new Event('input', {bubbles:true})); return true; })()`);

  // Shared messages require a separate final preview, persist across views and never imply delivery.
  await js(`document.querySelector('#crew-conversation textarea').value='Message from crew E2E';
    document.querySelector('#crew-conversation form').requestSubmit(); true`);
  await untilPage(() => js(`!document.querySelector('#crew-conversation .case-preview').hidden`), 'message preview');
  check('message preview does not save a message', await js(`!localStorage.getItem('astravital-case-messages-v1')`));
  await js(`document.querySelectorAll('#crew-conversation .case-preview button')[1].click(); true`);
  check('cancelled message saves nothing', await js(`!localStorage.getItem('astravital-case-messages-v1')`));
  await js(`document.querySelector('#crew-conversation form').requestSubmit();
    document.querySelector('#crew-conversation .case-preview button').click(); true`);
  await untilPage(() => js(`document.querySelector('#crew-conversation .case-message-list').textContent.includes('Message from crew E2E')`), 'crew message saved');
  check('crew message states local-only storage', await js(`document.querySelector('#crew-conversation .case-status').textContent === 'Saved locally · Not delivered'`));

  // Like a person: the Body context switch only appears after entering the lens.
  if (await js(`document.querySelector('.visual').dataset.intro === 'ready'`)) {
    await js(`document.getElementById('enter-lenses').click(); true`);
    await untilPage(() => js(`document.querySelector('.visual').dataset.intro === 'done'`), 'lens entered before Body context', 15000);
    await delay(1200);
  }
  await js(`document.getElementById('show-body').click(); true`);
  check('body context view opens', await js(`document.getElementById('show-body').getAttribute('aria-pressed') === 'true'`));
  await untilPage(() => js(`(() => { const img = document.querySelector('#body-art .anatomy-body'); return Boolean(img?.complete && img.naturalWidth); })()`), 'body illustration');
  check('Body context shows the AI-generated anatomy with its label', await js(`document.getElementById('body-art').getClientRects().length > 0 &&
    document.querySelector('#body-label small').textContent.includes('AI-generated image')`));
  check('Body context markers take their status from the data, not the image', await js(`
    document.querySelector('#body-art .anatomy-marker[data-zone=heart]').dataset.level === document.getElementById('hud-heart').dataset.level &&
    document.querySelector('#body-art .anatomy-marker[data-zone=bone]').dataset.level === document.getElementById('hud-bone').dataset.level &&
    document.getElementById('hud-heart').dataset.level !== 'unknown'`));
  const bodyOverlaps = await textOverlaps('.visual');
  check('Body context: no text overlaps other text', bodyOverlaps.length === 0, bodyOverlaps.slice(0, 4).join(' | '));
  await snap('body-desktop');
  // The same audit at common desktop and laptop widths, in both lens views.
  for (const [width, height] of [[1920, 1080], [1536, 864], [1366, 768], [1280, 720], [1100, 800], [1024, 768]]) {
    await page('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
    for (const [view, button] of [['Wearer view', 'show-focus'], ['Body context', 'show-body']]) {
      await js(`document.getElementById('${button}').click(); true`);
      await delay(500);
      const overlaps = await textOverlaps('.visual');
      check(`${view} at ${width} px: no text overlaps other text`, overlaps.length === 0, overlaps.slice(0, 4).join(' | '));
      if (view === 'Body context') await snap(`body-${width}`);
    }
  }
  await page('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await js(`document.getElementById('show-body').click(); true`);
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
  await js(`document.getElementById('mic-button').click(); true`);
  await untilPage(() => js(`document.getElementById('transcript').textContent.includes('OK Astra, how is my heart?')`), 'voice transcript');
  await untilPage(async () => !(await astra()).includes('cannot diagnose'), 'voice answer');
  check('without “OK Astra” a spoken question is ignored; with it Astra answers', await js(`document.getElementById('domain-heart').getAttribute('aria-pressed') === 'true' &&
    document.getElementById('mic-button').getAttribute('aria-pressed') === 'true'`), await astra());
  await js(`document.getElementById('mic-button').click(); true`);
  await untilPage(() => js(`document.getElementById('mic-button').getAttribute('aria-pressed') === 'false'`), 'microphone off');
  check('tapping again stops listening and the lens shows the prompt again', await js(`document.getElementById('lens-voice').dataset.state === 'idle'`));

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

  await untilPage(() => js(`document.querySelector('#ground-conversation .case-message-list').textContent.includes('Message from crew E2E')`), 'shared crew message in doctor view');
  check('doctor has an identity, personal reference and received-report summary', await js(`document.getElementById('ground-case-card').textContent.includes('Alex Morgan') && document.getElementById('ground-case-card').textContent.includes('Personal reference')`));
  await js(`document.querySelector('#ground-conversation textarea').value='Doctor reply E2E';
    document.querySelector('#ground-conversation form').requestSubmit();
    document.querySelector('#ground-conversation .case-preview button').click(); true`);
  await untilPage(() => js(`document.querySelector('#ground-conversation .case-message-list').textContent.includes('Doctor reply E2E')`), 'doctor reply saved');
  await js(`document.querySelector('#ground-conversation .case-message button').click(); true`);
  await untilPage(() => js(`document.querySelector('#ground-conversation .case-message-list').textContent.includes('Reviewed locally · Not delivered')`), 'message reviewed locally');
  check('doctor review retains local-only delivery meaning', true);
  await js(`document.getElementById('ground-note').value = 'Training note from E2E';
    document.getElementById('ground-action-form').requestSubmit(); true`);
  await untilPage(() => js(`document.getElementById('ground-timeline').innerText.includes('Training note from E2E')`), 'Ground note saved');
  await page('Page.reload');
  await untilPage(() => js(`document.getElementById('ground-timeline')?.innerText.includes('Training note from E2E')`), 'Ground note after reload');
  check('Ground note survives a reload', true);
  await checkReadable('Earth doctor view (desktop)');
  check('the Earth doctor view has the same motion switch', await js(`document.getElementById('motion-toggle')?.getAttribute('role') === 'switch' &&
    document.getElementById('motion-toggle').textContent.startsWith('Full motion')`));
  await snap('ground-desktop');
  check('Ground starts with a patient card: risk level, main problem and Reply to astronaut', await js(`
    document.querySelector('#ground-case-card .patient-risk')?.textContent === 'High priority' &&
    document.querySelector('#ground-case-card .patient-problem')?.textContent.includes('73 bpm') &&
    Boolean(document.querySelector('#ground-case-card .reply-cta'))`));
  await js(`document.querySelector('#ground-case-card .reply-cta').click(); true`);
  await untilPage(() => js(`document.activeElement === document.querySelector('#ground-conversation textarea')`), 'reply box focused');
  check('Reply to astronaut opens the reply box addressed to the astronaut', await js(`document.querySelector('#ground-conversation select').value === 'crew'`));

  await untilPage(() => js(`document.querySelector('#ground-conversation .case-message-list').textContent.includes('Doctor reply E2E')`), 'doctor reply after reload');
  check('internal notes are not sent into the shared conversation', await js(`!document.querySelector('#ground-conversation .case-message-list').textContent.includes('Training note from E2E')`));
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
    await checkReadable(`Earth doctor view (${width} px)`);
    await snap(`ground-${width}`);
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

  await untilPage(() => js(`document.querySelector('#crew-conversation .case-message-list')?.textContent.includes('Doctor reply E2E')`), 'reply visible to astronaut');
  check('astronaut receives the saved doctor reply in this browser', true);
  await untilPage(() => js(`(document.querySelector('#conversation .bubble span')?.textContent ?? '').includes('Doctor reply E2E')`), 'doctor reply announced');
  check('the doctor reply arrives in the lens as a notification and Astra reads it', await js(`
    document.getElementById('lens-voice').textContent.includes('replied') || document.getElementById('lens-voice').dataset.state === 'idle'`));
  await js(`document.getElementById('message').value='OK Astra, read my message'; document.getElementById('message-form').requestSubmit(); true`);
  check('“read my message” repeats the latest reply', await untilPage(() => js(`(document.querySelector('#conversation .bubble span')?.textContent ?? '').includes('Doctor reply E2E') && document.querySelector('#conversation .you-asked')?.textContent.includes('read my message')`), 'read my message').then(() => true, () => false));
  await untilPage(() => js(`document.getElementById('next-action')?.textContent === 'Message your medical team'`), 'saved state before reset');
  await js(`document.getElementById('reset-demo').click(); true`);
  await untilPage(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO') && document.getElementById('next-action')?.textContent === 'Check again'`), 'demo reset');
  check('Reset demo returns the web demo to its first state', await js(`(() => { try { return !localStorage.getItem('astravital-ground-actions-v1'); } catch { return false; } })()`));
  check('no JavaScript errors after reset', errors.length === 0, errors.join(' | '));
  // After the first visit the demo keeps working without internet (service worker cache).
  await page('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await js(`navigator.serviceWorker.ready.then(() => true)`);
  await page('Page.reload');
  await untilPage(() => js(`Boolean(navigator.serviceWorker.controller) && document.getElementById('api-status')?.textContent.includes('WEB DEMO')`), 'page controlled by the service worker', 20000);
  await page('Network.emulateNetworkConditions', {offline:true, latency:0, downloadThroughput:-1, uploadThroughput:-1});
  await page('Page.reload');
  const offlineOk = await untilPage(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO') && (document.querySelector('#crew-overview h2')?.textContent ?? '').includes('Alex Morgan')`), 'offline reload', 20000).then(() => true, () => false);
  await page('Network.emulateNetworkConditions', {offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1});
  check('after the first visit the demo reloads and runs with no internet', offlineOk);
  // Motion: full by default, even when the system asks to reduce motion; the person can reduce it and the choice is remembered.
  await js(`localStorage.removeItem('astravital-motion'); true`);
  await page('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion', value:'reduce'}]});
  await page('Page.reload');
  await untilPage(() => js(`document.documentElement.dataset.motion === 'full' && document.getElementById('motion-toggle')?.textContent === 'Full motion: on' && document.getElementById('motion-toggle').title.startsWith('Animations are on')`), 'full motion by default (switch ready)');
  check('full motion is on by default, even if the system asks to reduce motion', await js(`getComputedStyle(document.querySelector('.optics')).animationName.includes('optics-sway')`));
  await js(`document.getElementById('motion-toggle').click(); true`);
  check('the person can switch motion off, and the animations stop', await js(`document.documentElement.dataset.motion === 'reduced' &&
    getComputedStyle(document.querySelector('.optics')).animationName === 'none' && document.getElementById('motion-toggle').textContent === 'Full motion: off' &&
    document.getElementById('motion-toggle').getAttribute('aria-checked') === 'false'`));
  await page('Page.reload');
  await untilPage(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO')`), 'page after the motion choice');
  check('the motion choice is remembered after a reload', await js(`document.documentElement.dataset.motion === 'reduced'`));
  await page('Emulation.setEmulatedMedia', {features:[]});
  await js(`localStorage.removeItem('astravital-motion'); true`);
  for (const [width, height] of [[768, 1024], [390, 844]]) {
    await page('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: true});
    await page('Page.reload');
    await untilPage(() => js(`document.getElementById('api-status')?.textContent.includes('WEB DEMO')`), 'glasses page at ' + width);
    check(`Glasses page fits a ${width} px viewport`, await js(`window.innerWidth === ${width} &&
      document.documentElement.scrollWidth <= window.innerWidth + 1`), await js(`document.documentElement.scrollWidth + ' px wide'`));
    await checkReadable(`Glasses page (${width} px)`);
    check(`Glasses page (${width} px): a Start experience button is on the first screen`, await js(`(() => { const b = document.getElementById('hero-start'); const r = b.getBoundingClientRect(); return b.getClientRects().length > 0 && r.bottom < window.innerHeight; })()`));
    await snap(`glasses-${width}`);
  }
} finally {
  socket?.close(); browser?.kill(); server?.close();
  await rm(profile, {recursive: true, force: true}).catch(() => {});
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll end-to-end checks passed');
process.exit(failures.length ? 1 : 0);
