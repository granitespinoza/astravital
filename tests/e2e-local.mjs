// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// End-to-end check of the FULL LOCAL APP in headless Chrome: real Node server, real SQLite file,
// mission profile on loopback. Drives glasses → crew phone simulator → CMO → Earth doctor, like the
// on-site rehearsal (docs/MISSION-LAN.md). Synthetic data only; nothing leaves 127.0.0.1.
// Run: node tests/e2e-local.mjs   (Chrome or Edge required, or BROWSER_PATH)
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, realpath, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {startApplication} from '../server/http.mjs';

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

const work = await mkdtemp(join(await realpath(tmpdir()), 'astravital-e2e-local-'));
const profile = join(work, 'chrome');
let server, browser, socket;
const failures = [];
try {
  server = await startApplication({port:0, host:'127.0.0.1', dbPath:join(work, 'demo.sqlite'), mission:true});
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=1440,900',
    'about:blank'], {stdio:'ignore', windowsHide:true});
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
    // The CMO confirms an acknowledgement in a native dialog; accept it like the operator would.
    if (m.method === 'Page.javascriptDialogOpening') call('Page.handleJavaScriptDialog', {accept:true}, session).catch(() => {});
  };
  const call = (method, params = {}, sessionId) => new Promise((ok, fail) => { const id = ++seq; pending.set(id, {ok, fail}); socket.send(JSON.stringify({id, method, params, sessionId})); });
  const {targetId} = await call('Target.createTarget', {url:'about:blank'});
  ({sessionId:session} = await call('Target.attachToTarget', {targetId, flatten:true}));
  const page = (method, params) => call(method, params, session);
  await page('Runtime.enable'); await page('Network.enable'); await page('Page.enable');
  // Emulate a slow CI runner to expose timing races locally: E2E_LATENCY_MS=400, E2E_CPU_THROTTLE=6.
  if (process.env.E2E_CPU_THROTTLE) await page('Emulation.setCPUThrottlingRate', {rate:Number(process.env.E2E_CPU_THROTTLE)});
  if (process.env.E2E_LATENCY_MS) await page('Network.emulateNetworkConditions', {offline:false, latency:Number(process.env.E2E_LATENCY_MS), downloadThroughput:-1, uploadThroughput:-1});
  const js = async expression => { const r = await page('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true}); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok' : 'FAIL'} - ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failures.push(name); };
  // A fresh document each time, so hash-selected views (crew link, #ground) start cleanly.
  const go = async url => {
    await page('Page.navigate', {url:'about:blank'});
    await page('Page.navigate', {url});
    await untilPage(() => js(`location.href === ${JSON.stringify(url)} && document.readyState !== 'loading'`), 'navigation to ' + url);
  };
  const text = id => js(`document.getElementById('${id}')?.innerText ?? ''`);
  // Click like a person: only once the control is visible and enabled (the page disables controls while it works).
  const click = async id => {
    await untilPage(() => js(`(() => { const el = document.getElementById('${id}'); return Boolean(el && !el.disabled && el.getClientRects().length); })()`), id + ' enabled');
    await js(`document.getElementById('${id}').click(); true`);
  };
  // The console refuses an action while it refreshes ("The console is updating. Try again.").
  // Repeat the action only after that refusal, so a real request is never sent twice.
  const act = async (trigger, done, what, ms = 20000) => {
    const clear = () => js(`document.getElementById('action-result').textContent = ''; true`);
    await clear(); await js(trigger);
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await done().catch(() => false)) return;
      if ((await text('action-result')).includes('Try again')) { await delay(300); await clear(); await js(trigger); }
      await delay(150);
    }
    throw new Error('Timed out waiting for ' + what);
  };

  // 1. Glasses with the real API and SQLite.
  await go(base + '/');
  await untilPage(() => js(`document.getElementById('api-status')?.textContent === 'LOCAL SYSTEM READY'`), 'local system ready');
  check('glasses connect to the local server and database', true);
  check('glasses offer the onboard mission console', await js(`!document.getElementById('mission-entry').hidden`));
  await click('enter-lenses');
  await untilPage(() => js(`document.querySelector('.visual').dataset.intro === 'done'`), 'lens transition', 8000);
  await untilPage(() => js(`!document.getElementById('message').disabled && !document.querySelector('#message-form button').disabled`), 'message box enabled');
  await js(`document.getElementById('message').value='How is my pulse?'; document.getElementById('message-form').requestSubmit(); true`);
  await untilPage(async () => (await text('conversation')).includes('heart reading'), 'server answer');
  check('Astra answers from the local server', true, (await text('conversation')).replace(/\s+/g, ' ').slice(0, 120));
  await click('next-action');
  await untilPage(async () => (await text('conversation')).includes('Check repeated'), 'repeat');
  await click('next-action');
  await untilPage(() => js(`!document.getElementById('confirmation').hidden`), 'confirmation');
  await click('confirm-review');
  await untilPage(() => js(`document.getElementById('next-action').textContent === 'Message your medical team'`), 'saved');
  const reviews = await (await fetch(base + '/api/reviews')).json();
  check('confirmed review is stored once in SQLite', Array.isArray(reviews) && reviews.length === 1, `${reviews.length} review(s)`);
  check('glasses never show the experimental forecast to the crew', !(await js(`document.body.innerText.toLowerCase().includes('forecast')`)));

  // 2. Crew phone simulator on loopback, paired from the CMO console.
  const cmo = await (await fetch(base + '/api/mission/cmo')).json();
  const alexLink = cmo.links.find(link => link.id === 'crew-03')?.url;
  check('CMO console issues a pairing link for each crew member', cmo.links.length === 4 && Boolean(alexLink));
  await go(alexLink);
  await untilPage(() => js(`!document.getElementById('send-sample').disabled`), 'crew client ready');
  for (const n of [1, 2]) {
    await js(`document.getElementById('profile').value='high'; document.getElementById('sample-form').requestSubmit(); true`);
    await untilPage(async () => (await text('crew-state')).includes('Simulated sol ' + n), `crew sample ${n} received`);
  }
  check('two strong deviations from the phone reach the station', /ALERT/.test(await text('crew-state')));

  // 3. CMO reviews and acknowledges onboard.
  await go(base + '/mission.html');
  await untilPage(async () => (await text('connection')) === 'Connected to the mission laptop' && /Alex Morgan[\s\S]*ALERT/.test(await text('roster')), 'CMO roster');
  check('CMO sees Alex Morgan in ALERT', true);
  check('CMO sees the review saved from the glasses', (await text('review-count')).startsWith('1 review'));
  await act(`[...document.querySelectorAll('#roster button')].find(b => b.textContent === 'Acknowledge reading')?.click(); true`,
    async () => (await text('roster')).includes('CMO acknowledged this sample.'), 'CMO acknowledgement');
  check('CMO acknowledgement is saved', true);

  // 4. Report queued onboard, simulated Earth receipt, Earth doctor review.
  await go(base + '/mission.html#ground');
  await untilPage(async () => !(await js(`document.getElementById('ground-panel').hidden || document.getElementById('report-form').hidden`))
    && (await text('connection')) === 'Connected to the mission laptop', 'Ground panel');
  await act(`document.getElementById('report-kind').value='daily'; document.getElementById('report-form').requestSubmit(); true`,
    async () => (await text('reports')).includes('QUEUED'), 'queued report');
  check('report waits in the simulated Earth link queue', !(await text('ground-heart')).match(/\d+\s*bpm/));
  await act(`[...document.querySelectorAll('#reports button')].find(b => b.textContent === 'Simulate Earth receipt')?.click(); true`,
    async () => /Confirmed ALERT/.test(await text('ground-inbox')), 'received report');
  check('Earth doctor inbox puts the confirmed ALERT first', (await js(`document.querySelector('#ground-inbox li')?.innerText ?? ''`)).includes('Confirmed ALERT'));
  await js(`const s=document.getElementById('ground-member'); s.value='crew-03'; s.dispatchEvent(new Event('change',{bubbles:true})); true`);
  await untilPage(async () => /\d+\s*bpm/.test(await text('ground-heart')), 'Alex heart panel');
  const heart = await text('ground-heart');
  check('Earth doctor sees the phone reading with the personal reference', /Personal reference\s*\d/.test(heart) && /Deviation persisted on repeat\s*Yes/.test(heart));
  check('Earth doctor sees the experimental forecast with an interval', heart.includes('Trend forecast · experimental') && /Sol \+1\s*[\d.]+ bpm \(80%/.test(heart) && heart.includes('flight surgeon only'));
  await js(`document.getElementById('ground-note').value='Local E2E note'; document.getElementById('ground-action-form').requestSubmit(); true`);
  await untilPage(async () => (await text('ground-timeline')).includes('Local E2E note'), 'Ground note');
  check('Earth doctor note is saved in SQLite', (await (await fetch(base + '/api/mission/ground')).json()).crew
    .find(member => member.crewId === 'crew-03').timeline.some(event => event.note === 'Local E2E note'));

  const external = [...requests].filter(request => new URL(request).origin !== base && !request.startsWith('data:') && !request.startsWith('about:'));
  check('no requests leave the local server', external.length === 0, external.join(', '));
  check('no JavaScript errors', errors.length === 0, errors.join(' | '));
} finally {
  socket?.close(); browser?.kill();
  if (server) { server.closeAllConnections?.(); await new Promise(ok => server.close(ok)); }
  await rm(work, {recursive:true, force:true}).catch(() => {});
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll local end-to-end checks passed');
process.exit(failures.length ? 1 : 0);
