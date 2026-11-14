// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, dirname, join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {startServer} from '../scripts/serve.mjs';

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
const screenshotDir = process.env.SCREENSHOT_DIR;

async function until(read, description) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const result = await read();
    if (result) return result;
    await delay(50);
  }
  throw new Error('Timed out waiting for ' + description);
}

async function connect(url, onEvent) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once:true});
    socket.addEventListener('error', reject, {once:true});
  });
  const pending = new Map();
  let sequence = 0;
  socket.addEventListener('close', () => {
    for (const request of pending.values()) request.reject(new Error('Chromium disconnected'));
  });
  socket.addEventListener('message', ({data}) => {
    const message = JSON.parse(data);
    if (!message.id) {
      onEvent(message);
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  return {
    call(method, params = {}, sessionId) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('No response for ' + method)), 5000);
        pending.set(id, {
          resolve(result) { clearTimeout(timeout); resolve(result); },
          reject(error) { clearTimeout(timeout); reject(error); },
        });
        socket.send(JSON.stringify({id, method, params, sessionId}));
      }).finally(() => pending.delete(id));
    },
    close() { socket.close(); },
  };
}

const tempRoot = await realpath(tmpdir());
const profile = await mkdtemp(join(tempRoot, 'astravital-browser-'));
let server;
let browser;
let cdp;
try {
  server = await startServer(0);
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = spawn(browserPath, [
    '--headless=new', '--disable-background-networking', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    'about:blank',
  ], {stdio:'ignore', windowsHide:true});
  let startupError;
  browser.once('error', error => { startupError = error; });
  const [port, wsPath] = (await until(async () => {
    if (startupError) throw startupError;
    if (browser.exitCode !== null) throw new Error('Chromium exited before starting.');
    try { return await readFile(join(profile, 'DevToolsActivePort'), 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }, 'Chromium debugging endpoint')).trim().split(/\r?\n/);
  const requests = new Set();
  const servedDocuments = [];
  const runtimeErrors = [];
  let pageSession;
  cdp = await connect('ws://127.0.0.1:' + port + wsPath, message => {
    if (message.sessionId !== pageSession) return;
    if (message.method === 'Network.requestWillBeSent') {
      requests.add(message.params.request.url);
    }
    if (message.method === 'Network.responseReceived' && message.params.type === 'Document') {
      servedDocuments.push(message.params.response);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      runtimeErrors.push(details.exception?.description ?? details.text);
    }
  });
  const {product} = await cdp.call('Browser.getVersion');
  const {targetId} = await cdp.call('Target.createTarget', {url:'about:blank'});
  ({sessionId:pageSession} = await cdp.call('Target.attachToTarget', {targetId, flatten:true}));
  const page = (method, params) => cdp.call(method, params, pageSession);
  const evaluate = async expression => {
    try {
      const report = await page('Runtime.evaluate', {expression, returnByValue:true});
      if (report.exceptionDetails) {
        throw new Error(report.exceptionDetails.exception?.description ?? report.exceptionDetails.text);
      }
      return report.result.value;
    } catch (error) {
      if (/execution context was destroyed|Cannot find context/i.test(error.message)) return undefined;
      throw error;
    }
  };
  const waitFor = (expression, description) => until(() => evaluate(expression), description);
  const valueOf = id => evaluate('document.getElementById(' + JSON.stringify(id) + ')?.textContent.trim()');
  const setViewport = (width, height) => page('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor:1, mobile:false,
  });
  async function capture(name) {
    if (!screenshotDir) return;
    await mkdir(screenshotDir, {recursive:true});
    const {cssContentSize} = await page('Page.getLayoutMetrics');
    const clip = {x:0, y:0, width:cssContentSize.width, height:cssContentSize.height, scale:1};
    const {data} = await page('Page.captureScreenshot', {format:'png', captureBeyondViewport:true, clip});
    await writeFile(join(screenshotDir, name + '.png'), Buffer.from(data, 'base64'));
  }
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Network.enable');
  await page('Network.setCacheDisabled', {cacheDisabled:true});
  await setViewport(1280, 900);
  const navigation = await page('Page.navigate', {url:origin + '/'});
  assert.ifError(navigation.errorText);
  await waitFor(
    'navigator.serviceWorker?.controller && document.querySelector("#offline")?.textContent.includes("Offline ready") && document.querySelector("#storage")?.textContent.includes("Local storage ready")',
    'offline shell and IndexedDB',
  );
  assert.match(await evaluate('document.body.textContent'), /SIMULATED DATA/);
  assert.match(await valueOf('rule'), /z-score.+v0\.1/i);
  assert.ok(await evaluate('document.querySelector("#chart svg") instanceof SVGElement'), 'History chart renders');
  assert.ok(await evaluate(
    'Math.abs(document.querySelector(".reading").getBoundingClientRect().top - document.querySelector(".assessment").getBoundingClientRect().top) < 2',
  ), 'Wide layout places assessment beside the reading');
  await capture('desktop');
  await setViewport(390, 844);
  assert.ok(await evaluate(
    'document.documentElement.scrollWidth <= innerWidth && document.querySelector(".assessment").getBoundingClientRect().top > document.querySelector(".reading").getBoundingClientRect().bottom',
  ), 'Narrow layout stacks cards without horizontal scrolling');
  await capture('mobile');
  await setViewport(1280, 900);

  for (const [scenario, state] of Object.entries({
    missing:'missing', stale:'stale', suspect:'suspect', fault:'device-fault', short:'insufficient-history',
  })) {
    await evaluate('(() => { const select = document.querySelector("#scenario"); select.value = ' +
      JSON.stringify(scenario) + '; select.dispatchEvent(new Event("change", {bubbles:true})); })()');
    await waitFor('document.querySelector("#status").dataset.state === ' + JSON.stringify(state), state + ' display');
  }
  await evaluate('(() => { const select = document.querySelector("#scenario"); select.value = "deviation"; select.dispatchEvent(new Event("change", {bubbles:true})); })()');
  await waitFor('/watch|alert/.test(document.querySelector("#status").dataset.state)', 'demo deviation');
  const originalValue = await valueOf('value');

  await page('Network.emulateNetworkConditions', {
    offline:true, latency:0, downloadThroughput:0, uploadThroughput:0,
  });
  await waitFor('navigator.onLine === false', 'browser offline state');
  await waitFor('document.querySelector("#repeat").disabled === false', 'repeat action');
  await evaluate('document.querySelector("#repeat").click()');
  await waitFor('document.querySelector("#review").disabled === false', 'confirmed deviation');
  const repeatedValue = await valueOf('value');
  assert.notEqual(repeatedValue, originalValue, 'Repeat changes the displayed reading');
  await evaluate('document.querySelector("#review").click()');
  const reviewEntry = await waitFor(
    'Array.from(document.querySelectorAll("#log li"), entry => entry.textContent.trim()).find(text => /review request/i.test(text))',
    'recorded review request while offline',
  );
  const logBefore = await valueOf('log');
  await page('Page.reload', {ignoreCache:false});
  await waitFor(
    'performance.getEntriesByType("navigation")[0]?.type === "reload" && navigator.onLine === false && document.querySelector("#storage")?.textContent.includes("Local storage ready")',
    'offline reload from service worker',
  );
  assert.equal(await valueOf('value'), repeatedValue, 'Repeat reading survives reload');
  assert.equal(await valueOf('log'), logBefore, 'Local log survives reload');
  assert.ok(servedDocuments.at(-1)?.fromServiceWorker, 'Reloaded document came from the service worker');
  assert.ok(logBefore.includes(reviewEntry));

  await waitFor('!document.querySelector("#resolve").hidden && !document.querySelector("#resolve").disabled', 'review close action');
  await evaluate('document.querySelector("#resolve").click()');
  await waitFor('/simulated review closed/i.test(document.querySelector("#log").textContent)', 'closed review');
  const closedLog = await valueOf('log');

  await cdp.call('Browser.setDownloadBehavior', {behavior:'allow', downloadPath:profile});
  await evaluate('document.querySelector("#export").click()');
  const exportPath = join(profile, 'astravital-demo.json');
  const backup = await until(async () => {
    try { return JSON.parse(await readFile(exportPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }, 'download of offline backup');
  assert.deepEqual(
    backup.events.map(record => record.kind).sort(),
    ['close', 'repeat', 'request'],
    'Backup contains the complete review sequence',
  );
  assert.ok(backup.events.every(record => record.simulated === true));

  const {browserContextId} = await cdp.call('Target.createBrowserContext');
  const freshTarget = await cdp.call('Target.createTarget', {url:'about:blank', browserContextId});
  ({sessionId:pageSession} = await cdp.call('Target.attachToTarget', {targetId:freshTarget.targetId, flatten:true}));
  await page('Runtime.enable');
  await page('Network.enable');
  await page('DOM.enable');
  const freshNavigation = await page('Page.navigate', {url:origin + '/'});
  assert.ifError(freshNavigation.errorText);
  await waitFor('document.querySelector("#storage")?.textContent.includes("Local storage ready")', 'fresh browser storage');
  assert.equal(await valueOf('log'), '', 'Fresh context has an empty review log');
  for (let attempt = 0; attempt < 2; attempt++) {
    const {root} = await page('DOM.getDocument');
    const {nodeId} = await page('DOM.querySelector', {nodeId:root.nodeId, selector:'#import'});
    await evaluate('document.querySelector("#storage").textContent = "Import pending"');
    await page('DOM.setFileInputFiles', {nodeId, files:[exportPath]});
    await waitFor('document.querySelector("#storage").textContent.includes("Demo records imported") && !document.querySelector("#choose-import").disabled', 'import of the demo backup');
    assert.equal(await valueOf('log'), closedLog, 'Repeated import reconstructs one copy of the complete log');
  }

  assert.deepEqual(runtimeErrors, [], 'No page runtime exceptions');
  const external = [...requests].filter(url => /^https?:/i.test(url) && new URL(url).origin !== origin);
  assert.deepEqual(external, [], 'No external requests from the dashboard');
  console.log(product + ' check passed: responsive dashboard, distinct quality states, offline repeat and review, durable reload, export/import without duplicates, and zero external dashboard requests.');
} finally {
  if (cdp) {
    await cdp.call('Browser.close').catch(() => {});
    cdp.close();
  }
  if (browser?.exitCode === null && !browser.killed) {
    const exited = new Promise(resolve => browser.once('exit', resolve));
    browser.kill();
    await Promise.race([exited, delay(1500)]);
  }
  if (server) {
    server.close();
    server.closeAllConnections();
  }
  const profilePath = await realpath(profile);
  if (dirname(profilePath) === tempRoot && basename(profilePath).startsWith('astravital-browser-')) {
    await rm(profilePath, {recursive:true, force:true, maxRetries:8, retryDelay:150});
  }
}
