// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, dirname, join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {startServer} from '../scripts/serve.mjs';
import {expectedEvent} from '../app/workflow.js';

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
const visorScreenshotDir = process.env.VISOR_SCREENSHOT_DIR ?? (screenshotDir ? join(dirname(screenshotDir), 'astravital-visor') : undefined);

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
      const report = await page('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
      if (report.exceptionDetails) {
        throw new Error(report.exceptionDetails.exception?.description ?? report.exceptionDetails.text);
      }
      return report.result.value;
    } catch (error) {
      if (/execution context was destroyed|Cannot find context/i.test(error.message)) return undefined;
      throw error;
    }
  };
  const waitFor = async (expression, description) => {
    try { return await until(() => evaluate(expression), description); }
    catch (error) {
      const state = await evaluate('({href:location.href, online:navigator.onLine, navigation:performance.getEntriesByType("navigation")[0]?.type, storage:document.querySelector("#storage")?.textContent ?? document.querySelector("#visor-storage")?.textContent, controller:Boolean(navigator.serviceWorker?.controller), title:document.title})').catch(() => null);
      console.error('Browser check state:', JSON.stringify({state, lastDocument:servedDocuments.at(-1)?.fromServiceWorker, runtimeErrors}));
      throw error;
    }
  };
  const valueOf = id => evaluate('document.getElementById(' + JSON.stringify(id) + ')?.textContent.trim()');
  const setViewport = (width, height) => page('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor:1, mobile:false,
  });
  const selectValue = (id, value, event = 'change') => evaluate(
    '(() => { const field = document.getElementById(' + JSON.stringify(id) + '); field.value = ' +
    JSON.stringify(value) + '; field.dispatchEvent(new Event(' + JSON.stringify(event) + ', {bubbles:true})); })()',
  );
  async function navigateView(name) {
    await evaluate('document.querySelector(' + JSON.stringify('a[data-view="' + name + '"]') + ').click()');
    await waitFor(
      'location.hash === ' + JSON.stringify('#' + name) +
      ' && document.querySelector(' + JSON.stringify('#view-' + name) + ')?.hidden === false' +
      ' && document.querySelectorAll(".view:not([hidden])").length === 1' +
      ' && document.querySelector(' + JSON.stringify('a[data-view="' + name + '"]') + ')?.getAttribute("aria-current") === "page"',
      name + ' view and active navigation',
    );
  }
  const fontsReady = () => waitFor(
    'document.fonts.status === "loaded" && document.fonts.size >= 3 && ' +
    `document.fonts.check('700 18px "Fira Sans"') && document.fonts.check('400 14px "Overpass"') && document.fonts.check('700 14px "Overpass"')`,
    'local brand fonts',
  );
  const noHorizontalOverflow = description => evaluate('document.documentElement.scrollWidth <= innerWidth')
    .then(result => assert.ok(result, description));
  async function capture(name, directory = screenshotDir) {
    if (!directory) return;
    await mkdir(directory, {recursive:true});
    const {cssContentSize} = await page('Page.getLayoutMetrics');
    const clip = {x:0, y:0, width:cssContentSize.width, height:cssContentSize.height, scale:1};
    const {data} = await page('Page.captureScreenshot', {format:'png', captureBeyondViewport:true, clip});
    await writeFile(join(directory, name + '.png'), Buffer.from(data, 'base64'));
  }
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Network.enable');
  await page('Network.setCacheDisabled', {cacheDisabled:true});
  await setViewport(1280, 900);
  const navigation = await page('Page.navigate', {url:origin + '/review.html'});
  assert.ifError(navigation.errorText);
  await waitFor(
    'navigator.serviceWorker?.controller && document.querySelector("#offline")?.textContent.includes("Offline ready") && document.querySelector("#storage")?.textContent.includes("Local storage ready")',
    'offline shell and IndexedDB',
  );
  await fontsReady();
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
  const logBeforeLab = await valueOf('log');
  const eventCountBeforeLab = await valueOf('flow-event-count');

  await navigateView('detection');
  assert.match(await valueOf('page-title'), /Explore the anomaly/);
  assert.ok(await evaluate('document.querySelector("#lab-chart svg") instanceof SVGElement'), 'Lab history chart renders');
  for (const window of [7, 14, 28]) {
    await selectValue('lab-window', String(window));
    await waitFor(
      'Array.from(document.querySelectorAll("#lab-facts div")).some(group => group.querySelector("dt").textContent === "Included readings" && group.querySelector("dd").textContent === ' + JSON.stringify(String(window)) + ')',
      'lab includes exactly ' + window + ' prior readings',
    );
  }
  await selectValue('lab-value', '120', 'input');
  await waitFor('document.querySelector("#lab-status").dataset.state === "alert"', 'high synthetic input flags ALERT');
  assert.ok(Number(await valueOf('lab-z')) >= 3, 'High input exceeds the configured alert deviation');
  await selectValue('lab-value', '', 'input');
  await waitFor('document.querySelector("#lab-status").dataset.state === "suspect"', 'empty lab input is blocked');
  assert.equal(await valueOf('lab-z'), '—', 'No z-score is shown for an empty input');
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#lab-trace li"), item => item.dataset.state)'),
    ['pass', 'blocked', 'skipped', 'skipped', 'skipped'], 'Invalid input stops the actual engine trace before assessment');
  await evaluate('document.querySelector("#lab-reset").click()');
  await waitFor('document.querySelector("#lab-window").value === "14" && document.querySelector("#lab-value").value === ' + JSON.stringify(originalValue), 'lab reset restores scenario input and default window');
  assert.equal(await valueOf('log'), logBeforeLab, 'Lab experiments do not change the local crew log');
  assert.equal(await valueOf('flow-event-count'), eventCountBeforeLab, 'Lab experiments do not add storage events');
  await capture('detection');
  await setViewport(390, 844);
  await noHorizontalOverflow('Detection lab fits a 390px viewport');
  await capture('detection-mobile');
  await setViewport(1280, 900);

  await navigateView('architecture');
  assert.match(await valueOf('page-title'), /From signal to action/);
  const stageTitles = ['Acquire reading', 'Validate data', 'Match resting context', 'Build personal baseline', 'Assess deviation'];
  for (let index = 0; index < stageTitles.length; index++) {
    await evaluate('document.querySelectorAll("#flow-stages button")[' + index + '].click()');
    assert.equal(await valueOf('flow-stage-title'), stageTitles[index], 'Inspector follows selected engine stage');
    assert.equal(await evaluate(`document.querySelectorAll('#flow-stages button[aria-pressed="true"]').length`), 1, 'Exactly one flow stage is selected');
    const payload = await evaluate('JSON.parse(document.querySelector("#flow-payload").textContent)');
    if (index === 0) {
      assert.equal(payload.scenario, 'deviation');
      assert.equal(payload.input.simulated, true);
      assert.equal(payload.input.unit, '/min');
    } else if (index === 1) {
      assert.equal(payload.quality, 'ok');
      assert.equal(payload.staleLimitHours, 26);
    } else if (index === 2) {
      assert.equal(payload.crew, 'crew-03');
      assert.equal(payload.requiredContext, 'rest');
    } else if (index === 3) {
      assert.equal(payload.baseline.n, 14);
      assert.equal(payload.baseline.ids.length, 14);
    } else {
      assert.equal(payload.medicalDiagnosis, false);
      assert.ok(Number.isFinite(payload.z));
      assert.match(payload.rule, /z-score.+v0\.1/i);
    }
  }
  await capture('architecture');
  await setViewport(390, 844);
  await noHorizontalOverflow('Architecture view fits a 390px viewport');
  await capture('architecture-mobile');
  await setViewport(1280, 900);

  await selectValue('scenario', 'fault');
  await waitFor('document.querySelectorAll("#flow-stages button")[1]?.dataset.state === "blocked"', 'sensor fault blocks the data-flow quality gate');
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#flow-stages button"), button => button.dataset.state)'),
    ['pass', 'blocked', 'skipped', 'skipped', 'skipped'], 'Fault flow cannot skip quality and produce a deviation');
  await evaluate('document.querySelectorAll("#flow-stages button")[1].click()');
  assert.equal((await evaluate('JSON.parse(document.querySelector("#flow-payload").textContent)')).quality, 'device-fault');
  await evaluate('document.querySelectorAll("#flow-stages button")[4].click()');
  assert.equal((await evaluate('JSON.parse(document.querySelector("#flow-payload").textContent)')).evaluated, false, 'Skipped stage reports unevaluated data');
  await navigateView('detection');
  assert.equal(await evaluate('document.querySelector("#lab-value").disabled'), true, 'Reported fault cannot be edited into a valid reading');
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#lab-trace li"), item => item.dataset.state)'),
    ['pass', 'blocked', 'skipped', 'skipped', 'skipped']);
  assert.equal(await valueOf('lab-z'), '—');
  await selectValue('scenario', 'deviation');
  await navigateView('crew');
  assert.equal(await valueOf('log'), logBeforeLab, 'Trace inspection does not add crew events');

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

  for (const name of ['detection', 'architecture']) {
    await navigateView(name);
    await page('Page.reload', {ignoreCache:false});
    await waitFor(
      'performance.getEntriesByType("navigation")[0]?.type === "reload" && navigator.onLine === false && location.hash === ' + JSON.stringify('#' + name) +
      ' && document.querySelector("#storage")?.textContent.includes("Local storage ready") && document.querySelector(' + JSON.stringify('#view-' + name) + ')?.hidden === false',
      name + ' view survives an offline reload',
    );
    await fontsReady();
    assert.ok(servedDocuments.at(-1)?.fromServiceWorker, name + ' reload came from the service worker');
    assert.equal(await valueOf('log'), logBefore, name + ' navigation preserves review events');
    if (name === 'detection') {
      await selectValue('lab-window', '7');
      await selectValue('lab-value', '120', 'input');
      assert.equal(await evaluate('document.querySelector("#lab-status").dataset.state'), 'alert', 'Lab computes an anomaly with the network disabled');
    } else {
      await evaluate('document.querySelectorAll("#flow-stages button")[3].click()');
      assert.equal((await evaluate('JSON.parse(document.querySelector("#flow-payload").textContent)')).baseline.n, 14, 'Data inspector works offline');
    }
    await setViewport(390, 844);
    await noHorizontalOverflow(name + ' still fits mobile after offline reload');
    await setViewport(1280, 900);
  }
  assert.deepEqual(await evaluate('(async () => Promise.all(["explorer.js", "fira-sans-bold.woff2", "overpass-regular.woff2", "overpass-bold.woff2"].map(asset => caches.match(new URL(asset, location.href)).then(Boolean))))()'),
    [true, true, true, true], 'Explorer and all local brand fonts are cached for offline access');
  await navigateView('crew');

  await waitFor('!document.querySelector("#resolve").hidden && !document.querySelector("#resolve").disabled', 'review close action');
  await evaluate('document.querySelector("#resolve").click()');
  await waitFor('/simulated review closed/i.test(document.querySelector("#log").textContent)', 'closed review');
  const closedLog = await valueOf('log');

  await cdp.call('Browser.setDownloadBehavior', {behavior:'allow', downloadPath:profile});
  await evaluate('document.querySelector(".backup-tools").open = true');
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
  const freshNavigation = await page('Page.navigate', {url:origin + '/review.html'});
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


  // A distinct browser context starts the glasses simulator without imported events.
  const visorContext = await cdp.call('Target.createBrowserContext');
  const visorTarget = await cdp.call('Target.createTarget', {url:'about:blank', browserContextId:visorContext.browserContextId});
  ({sessionId:pageSession} = await cdp.call('Target.attachToTarget', {targetId:visorTarget.targetId, flatten:true}));
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Network.enable');
  await page('Network.setCacheDisabled', {cacheDisabled:true});
  // Test instrumentation counts intended audio calls without pretending to verify
  // acoustic output. Mic and ASR APIs fail loudly if the app attempts to use them.
  await page('Page.addScriptToEvaluateOnNewDocument', {source:`
    window.__hudProbe = {plays:[], microphoneCalls:0, recognitionCalls:0};
    HTMLMediaElement.prototype.play = function () {
      window.__hudProbe.plays.push(this.src);
      return Promise.resolve();
    };
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async function () {
      window.__hudProbe.microphoneCalls++;
      throw new Error('Microphone use is forbidden in the simulator test.');
    };
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      Object.defineProperty(window, name, {configurable:true, value:function () {
        window.__hudProbe.recognitionCalls++;
        throw new Error('Speech recognition is forbidden in the simulator test.');
      }});
    }
  `});
  const injectIntent = async text => {
    await evaluate('document.querySelector(".voice-tools").open = true');
    await selectValue('voice-command', text, 'input');
    await evaluate('document.querySelector("#send-intent").click()');
  };
  const visorReady = () => waitFor(
    'document.querySelector("#visor-storage")?.textContent === "Local records ready" && document.querySelector("#visor-offline")?.textContent === "Offline ready" && navigator.serviceWorker?.controller',
    'visor local storage and offline shell',
  );
  const stageFits = async (bodyVisible = false) => {
    await noHorizontalOverflow('Glasses simulator page fits a 390px viewport');
    assert.ok(await evaluate(`(() => {
      const stage = document.querySelector('#visor-stage').getBoundingClientRect();
      const selectors = ${JSON.stringify(bodyVisible ? ['#hud-card', '#body-panel'] : ['#hud-card'])};
      return selectors.every(selector => {
        const element = document.querySelector(selector);
        if (element.hidden) return true;
        const bounds = element.getBoundingClientRect();
        return bounds.left >= stage.left && bounds.right <= stage.right &&
          bounds.top >= stage.top && bounds.bottom <= stage.bottom && element.scrollWidth <= element.clientWidth;
      });
    })()`), 'HUD and body context remain within the simulated glasses stage');
  };
  const visorNavigation = await page('Page.navigate', {url:origin + '/legacy.html'});
  assert.ifError(visorNavigation.errorText);
  await setViewport(1280, 900);
  await visorReady();
  await fontsReady();
  assert.equal(await valueOf('visor-event-count'), '0', 'New visor context has no imported crew events');
  assert.equal(await valueOf('hud-label'), 'WATCH');
  assert.equal(await evaluate('document.querySelector("#audio-mode").value'), 'off', 'Audio output starts muted');
  assert.equal(await evaluate('window.__hudProbe.plays.length'), 0, 'No automatic cue plays while muted');
  assert.match(await evaluate('document.body.textContent'), /Browser simulation/);
  await capture('desktop', visorScreenshotDir);
  await setViewport(390, 844);
  await stageFits();
  await capture('mobile', visorScreenshotDir);
  await setViewport(1280, 900);

  await selectValue('audio-mode', 'discreet');
  assert.equal(await evaluate('window.__hudProbe.plays.length'), 1, 'Enabling audio issues one initial local cue');
  assert.ok((await evaluate('window.__hudProbe.plays[0]')).endsWith('/hud-check.wav'));
  await selectValue('audio-mode', 'off');
  await selectValue('audio-mode', 'discreet');
  await injectIntent('astra status');
  assert.equal(await evaluate('window.__hudProbe.plays.length'), 1, 'Rerenders and audio toggles do not repeat an episode cue');
  await evaluate('document.querySelector("#hud-replay").click()');
  assert.equal(await evaluate('window.__hudProbe.plays.length'), 2, 'An explicit replay requests the local cue again');
  await evaluate('document.querySelector("#hud-why").click()');
  await waitFor('document.querySelector("#body-panel").hidden === false', 'body explanation panel');
  assert.equal(await valueOf('body-heading'), 'Cardiovascular signal');
  assert.match(await valueOf('body-limit'), /does not locate a heart lesion/);
  assert.equal(await evaluate('document.querySelector("#body-heart-highlight").style.opacity'), '1');
  assert.equal(await evaluate('window.__hudProbe.plays.length'), 3, 'Why requests one explanation clip');
  assert.ok((await evaluate('window.__hudProbe.plays.at(-1)')).endsWith('/hud-explain.wav'));
  await capture('body-detail', visorScreenshotDir);
  await setViewport(390, 844);
  await stageFits(true);
  await capture('body-detail-mobile', visorScreenshotDir);
  await evaluate('document.querySelector("#body-bone-button").click()');
  assert.equal(await valueOf('body-heading'), 'No bone measurement available');
  assert.match(await valueOf('body-copy'), /Heart rate cannot supply it/);
  assert.match(await valueOf('body-limit'), /No bone loss, porosity or fracture risk has been detected/);
  await stageFits(true);
  await capture('bone-context-mobile', visorScreenshotDir);
  await evaluate('document.querySelector("#body-close").click()');
  await setViewport(1280, 900);
  await selectValue('audio-mode', 'off');

  for (const text of ['astra confirm save now', 'astra confirm save']) {
    await injectIntent(text);
    assert.match(await valueOf('intent-feedback'), /not recognized or unavailable/);
    assert.equal(await valueOf('visor-event-count'), '0', 'Unknown or unarmed confirmation cannot write a record');
  }
  await evaluate('document.querySelector("#hud-action").click()');
  await waitFor('document.querySelector("#hud-label").textContent === "ALERT" && document.querySelector("#visor-event-count").textContent === "1" && !document.querySelector("#hud-action").disabled', 'repeat creates a confirmed alert');
  assert.equal(await valueOf('hud-action'), 'Request review');
  await evaluate('document.querySelector("#hud-action").click()');
  assert.equal(await evaluate('document.querySelector("#confirm-panel").hidden'), false);
  assert.equal(await valueOf('visor-event-count'), '1', 'Opening confirmation does not save a request');
  await injectIntent('astra confirm save now');
  assert.equal(await valueOf('visor-event-count'), '1', 'Partial or extended voice command cannot confirm a pending request');
  assert.equal(await evaluate('document.querySelector("#confirm-panel").hidden'), false);
  await evaluate('document.querySelector("#hud-cancel").click()');
  assert.equal(await evaluate('document.querySelector("#confirm-panel").hidden'), true);
  assert.equal(await valueOf('visor-event-count'), '1', 'Cancel leaves only the repeat record');

  await evaluate('document.querySelector("#simulate-save-failure").click()');
  assert.equal(await evaluate('document.querySelector("#simulate-save-failure").getAttribute("aria-pressed")'), 'true');
  await evaluate('document.querySelector("#hud-action").click()');
  await evaluate('document.querySelector("#hud-confirm").click()');
  await waitFor('document.querySelector("#hud-label").textContent === "SAVE FAILED" && !document.querySelector("#hud-action").disabled', 'failed save is visible without a success claim');
  assert.equal(await valueOf('visor-event-count'), '1');
  assert.match(await valueOf('hud-announcement'), /No success confirmation was issued/);
  assert.equal(await valueOf('hud-action'), 'Try again');
  await capture('save-failure', visorScreenshotDir);
  await evaluate('document.querySelector("#hud-action").click()');
  assert.equal(await evaluate('document.querySelector("#confirm-panel").hidden'), false, 'Retry requests confirmation again');
  assert.equal(await valueOf('visor-event-count'), '1', 'Retry alone does not save');
  await evaluate('document.querySelector("#hud-confirm").click(); document.querySelector("#hud-confirm").click()');
  await waitFor('document.querySelector("#hud-label").textContent === "SAVED LOCALLY" && document.querySelector("#visor-event-count").textContent === "2"', 'read-back confirms one saved review request');
  assert.equal(await valueOf('hud-headline'), 'Saved here. Not delivered.');
  assert.match(await valueOf('hud-caption'), /No message has been sent/);
  assert.equal(await evaluate('document.querySelector("#confirm-panel").hidden'), true);
  const readHudRecords = () => evaluate(`new Promise((resolve, reject) => {
    const request = indexedDB.open('astravital-dashboard', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('events');
      const records = transaction.objectStore('events').getAll();
      transaction.oncomplete = () => { database.close(); resolve(records.result); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    };
  })`);
  const savedRecords = await readHudRecords();
  assert.deepEqual(savedRecords.map(record => record.id).sort(), ['deviation:repeat', 'deviation:request']);
  for (const record of savedRecords) assert.deepEqual(record, expectedEvent('deviation', record.kind), 'HUD and console share the same saved event payload');
  await injectIntent('astra confirm save');
  assert.equal(await valueOf('visor-event-count'), '2', 'Repeated confirmation after success cannot duplicate a request');
  assert.deepEqual(await evaluate('({microphone:window.__hudProbe.microphoneCalls, recognition:window.__hudProbe.recognitionCalls})'), {microphone:0, recognition:0});
  assert.ok((await evaluate('window.__hudProbe.plays')).every(url => url.startsWith(origin + '/') && url.endsWith('.wav')), 'All requested cues are local packaged WAVs');
  await capture('saved', visorScreenshotDir);

  await page('Network.emulateNetworkConditions', {offline:true, latency:0, downloadThroughput:0, uploadThroughput:0});
  await page('Page.reload', {ignoreCache:false});
  await visorReady();
  await waitFor('navigator.onLine === false && document.querySelector("#hud-label").textContent === "SAVED LOCALLY"', 'visor restores saved state after offline reload');
  assert.ok(servedDocuments.at(-1)?.fromServiceWorker, 'Visor root reload came from the service worker');
  assert.equal(await valueOf('visor-event-count'), '2');
  assert.deepEqual(await readHudRecords(), savedRecords, 'Offline reload keeps the same record IDs and payloads');
  assert.equal(await evaluate('document.querySelector("#audio-mode").value'), 'off', 'Reload does not silently enable audio');
  assert.deepEqual(await evaluate('({microphone:window.__hudProbe.microphoneCalls, recognition:window.__hudProbe.recognitionCalls, plays:window.__hudProbe.plays.length})'), {microphone:0, recognition:0, plays:0});
  const cachedAudio = await evaluate(`(async () => Promise.all(['hud-check', 'hud-followup', 'hud-saved', 'hud-error', 'hud-explain'].map(async clip => {
    const response = await caches.match(new URL(clip + '.wav', location.href));
    if (!response) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {type:response.headers.get('Content-Type'), signature:String.fromCharCode(...bytes.slice(0,4)), bytes:bytes.length};
  })))()`);
  assert.equal(cachedAudio.length, 5);
  for (const asset of cachedAudio) {
    assert.ok(asset && /^audio\/wav/.test(asset.type), 'Spoken cue has a local audio/wav cache response');
    assert.equal(asset.signature, 'RIFF');
    assert.ok(asset.bytes > 44, 'Spoken cue contains more than a WAV header');
  }

  // Export the HUD-created records through the console while still offline.
  const hudExportDirectory = join(profile, 'hud-export');
  await mkdir(hudExportDirectory);
  await cdp.call('Browser.setDownloadBehavior', {behavior:'allow', downloadPath:hudExportDirectory, browserContextId:visorContext.browserContextId});
  await evaluate('document.querySelector(".console-link").click()');
  await waitFor('document.querySelector("#storage")?.textContent === "Local storage ready"', 'offline HUD-to-console navigation');
  assert.ok(servedDocuments.at(-1)?.fromServiceWorker, 'Review console is also precached');
  assert.match(await valueOf('log'), /CMO review requested/);
  await evaluate('document.querySelector(".backup-tools").open = true; document.querySelector("#export").click()');
  const hudExportPath = join(hudExportDirectory, 'astravital-demo.json');
  const hudBackup = await until(async () => {
    try { return JSON.parse(await readFile(hudExportPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }, 'export of HUD-created records through the console');
  assert.equal(hudBackup.format, 'astravital-demo');
  assert.equal(hudBackup.version, 1);
  assert.deepEqual(hudBackup.events, savedRecords);

  const importContext = await cdp.call('Target.createBrowserContext');
  const importTarget = await cdp.call('Target.createTarget', {url:'about:blank', browserContextId:importContext.browserContextId});
  ({sessionId:pageSession} = await cdp.call('Target.attachToTarget', {targetId:importTarget.targetId, flatten:true}));
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Network.enable');
  await page('DOM.enable');
  const importNavigation = await page('Page.navigate', {url:origin + '/review.html'});
  assert.ifError(importNavigation.errorText);
  await waitFor('document.querySelector("#storage")?.textContent === "Local storage ready"', 'fresh console for HUD-record import');
  assert.equal(await valueOf('log'), '');
  for (let attempt = 0; attempt < 2; attempt++) {
    const {root} = await page('DOM.getDocument');
    const {nodeId} = await page('DOM.querySelector', {nodeId:root.nodeId, selector:'#import'});
    await evaluate('document.querySelector("#storage").textContent = "Import pending"');
    await page('DOM.setFileInputFiles', {nodeId, files:[hudExportPath]});
    await waitFor('document.querySelector("#storage").textContent === "Demo records imported" && !document.querySelector("#choose-import").disabled', 'HUD records accepted by console import');
    assert.equal(await evaluate('document.querySelectorAll("#log li").length'), 2, 'Double import retains one repeat and one review request');
  }
  await page('Page.navigate', {url:origin + '/legacy.html'});
  await visorReady();
  assert.equal(await valueOf('hud-label'), 'SAVED LOCALLY', 'Visor also recognizes records imported through the console');
  assert.equal(await valueOf('visor-event-count'), '2');

  assert.deepEqual(runtimeErrors, [], 'No page runtime exceptions');
  const external = [...requests].filter(url => /^https?:/i.test(url) && new URL(url).origin !== origin);
  assert.deepEqual(external, [], 'No external requests from the dashboard');
  console.log(product + ' check passed: glasses simulator and review console, explicit confirmation with failure/retry, shared records offline, muted local cue controls, no microphone/ASR calls, responsive body context, three analysis views, and zero external requests.');
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
