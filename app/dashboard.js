// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import { policy, RULE, traceDecision } from './engine.js';
import { evaluateScenario, expectedEvent, sameRecord } from './workflow.js';
import { ORIGIN, sample, scenarios } from './scenarios.js';
import { openStorage, readEvents, appendEvents } from './storage.js';
import { drawHistory } from './chart.js';
import { createExplorer } from './explorer.js';

const byId = id => document.getElementById(id);
const settings = policy();
const updateExplorer = createExplorer();
const scenarioPicker = byId('scenario');
const repeatButton = byId('repeat');
const reviewButton = byId('review');
const closeButton = byId('resolve');
const importInput = byId('import');
const chooseImport = byId('choose-import');
const exportButton = byId('export');
const storageStatus = byId('storage');
const labels = {
  ok:'● OK', watch:'▲ WATCH', alert:'▲ ALERT', missing:'○ MISSING',
  stale:'◷ STALE', suspect:'◇ SUSPECT', 'device-fault':'× DEVICE FAULT',
  'insufficient-history':'○ INSUFFICIENT HISTORY',
};

const minutes = 60000;
const sol142Start = ORIGIN - (7 * 60 + 5) * minutes;
let database;
let events = [];
let busy = true;

for (const [id, label] of Object.entries(scenarios)) scenarioPicker.add(new Option(label, id));

try {
  const saved = localStorage.getItem('astravital-scenario');
  if (Object.hasOwn(scenarios, saved)) scenarioPicker.value = saved;
} catch {
  // The selector still works if local storage is blocked.
}

function when(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function validateImport(bundle) {
  if (bundle?.format !== 'astravital-demo' || bundle.version !== 1 ||
      !Array.isArray(bundle.events) || bundle.events.length > Object.keys(scenarios).length * 3) {
    throw new Error('Unsupported file. Choose an ASTRAVITAL demo export.');
  }

  const imported = new Map();
  for (const event of bundle.events) {
    if (!Object.hasOwn(scenarios, event?.scenario) || !['repeat', 'request', 'close'].includes(event?.kind)) {
      throw new Error('The file contains an invalid demo record.');
    }
    const expected = expectedEvent(event.scenario, event.kind, settings);
    if (!sameRecord(event, expected)) throw new Error('The file contains an altered demo record.');
    imported.set(expected.id, expected);
  }

  const allIds = new Set([...events.map(event => event.id), ...imported.keys()]);
  for (const {scenario, kind} of imported.values()) {
    if ((kind !== 'repeat' && !allIds.has(scenario + ':repeat')) ||
        (kind === 'close' && !allIds.has(scenario + ':request'))) {
      throw new Error('The file is missing an earlier record in the review.');
    }
  }
  return [...imported.values()];
}

function setFacts(container, facts) {
  const groups = facts.map(([label, value]) => {
    const group = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    group.append(term, description);
    return group;
  });
  container.replaceChildren(...groups);
}

function render() {
  const scenario = scenarioPicker.value;
  const {history, current, first, repeated, followUp, canRepeat} = evaluateScenario(scenario, settings);
  const performed = events.some(event => event.id === scenario + ':repeat');
  const request = events.find(event => event.id === scenario + ':request');
  const closed = events.find(event => event.id === scenario + ':close');
  const measurement = performed ? repeated : current;
  const decision = performed ? followUp : first;
  const {quality, level, baseline, z, reason, slope} = decision;
  const state = level ?? quality;

  byId('status').dataset.state = state;
  byId('status').textContent = labels[state];
  byId('value').textContent = measurement?.value ?? '—';
  byId('baseline').textContent = baseline?.n
    ? baseline.mean.toFixed(1) + ' ± ' + baseline.sd.toFixed(1) + ' bpm' : '—';
  byId('deviation').textContent = z === null ? '—' : (z > 0 ? '+' : '') + z.toFixed(2) + ' SD';
  setFacts(byId('details'), [
    ['Acquired', measurement ? when(measurement.observedAt) : 'Unavailable'],
    ['Mission time', measurement ? 'Sol ' + (142 + Math.floor((measurement.observedAt - sol142Start) / settings.dayMs)) : 'Unavailable'],
    ['Source', measurement?.source ?? 'Unavailable'],
    ['Context', 'Resting'],
    ['Data quality', labels[quality]],
  ]);

  const confirming = performed && (level === 'alert' || level === 'watch');
  byId('reason').textContent = confirming
    ? 'The repeat reading confirms a deviation from the personal baseline. You can record a request for onboard review.'
    : reason;
  byId('rule').textContent = RULE + ' · ' + settings.window + ' sols · ' +
    (baseline ? 'n = ' + baseline.n + ' · ' : '') +
    'WATCH |z| ≥ ' + settings.watch + ' · ALERT |z| ≥ ' + settings.alert;
  repeatButton.disabled = busy || !database || !canRepeat || performed;
  reviewButton.disabled = busy || !database || !confirming || Boolean(request);
  closeButton.hidden = !request || Boolean(closed);
  closeButton.disabled = busy || !database;
  byId('action-hint').textContent = closed ? 'The simulated review is closed.' :
    request ? 'Request saved on this device. The baseline remains frozen while the review is open.' :
    confirming ? 'The request records the rule and readings on this device.' :
    canRepeat ? 'A repeat uses the same baseline and advances the demo by seven minutes.' :
    'A valid resting deviation is needed to start a review.';

  byId('trend').textContent = Number.isFinite(slope)
    ? (slope > 0 ? '+' : '') + slope.toFixed(1) + ' bpm/sol' : 'Trend unavailable';
  const baseIds = new Set(baseline?.ids ?? history.map(row => row.id));
  const points = history.filter(row => baseIds.has(row.id));
  if (current?.quality === 'ok' && quality !== 'stale') points.push(current);
  if (performed) points.push(repeated);
  drawHistory(byId('chart'), points, measurement, baseline, settings);
  byId('chart-caption').textContent = baseline?.n >= settings.minSamples && baseline.sd > 0
    ? 'Shaded area shows the personal baseline within the watch threshold.' :
      'The personal band is unavailable for this reading.';
  const rows = points.slice().reverse().map(point => {
    const row = document.createElement('tr');
    for (const value of [when(point.observedAt), point.value + ' bpm', 'Simulated']) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    return row;
  });
  byId('history-table').replaceChildren(...rows);
  byId('log').replaceChildren(...[
    performed ? when(repeated.observedAt) + ' · Repeat reading recorded (' + repeated.value + ' bpm).' : null,
    request ? when(request.recordedAt) + ' · CMO review requested locally by Crew 03.' : null,
    closed ? when(closed.recordedAt) + ' · Simulated review closed.' : null,
  ].filter(Boolean).map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  byId('empty-log').hidden = performed;
  exportButton.disabled = busy || !database;
  chooseImport.disabled = busy || !database;
  const {now} = sample(scenario);
  updateExplorer({scenario, measurement, decision, performed, request, closed,
    eventCount:events.length,
    trace:traceDecision(measurement, history, now, settings, performed ? first.baseline : null)});
}

const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('astravital-events') : null;

async function save(getRecords, message) {
  if (busy || !database) return;
  busy = true;
  render();
  try {
    events = await readEvents(database);
    await appendEvents(database, await getRecords());
    events = await readEvents(database);
    channel?.postMessage('updated');
    byId('announcement').textContent = message;
    storageStatus.textContent = message;
  } catch (error) {
    storageStatus.textContent = 'Local save failed. ' + error.message;
  } finally {
    busy = false;
    render();
  }
}

function record(kind, message) {
  const scenario = scenarioPicker.value;
  void save(() => [expectedEvent(scenario, kind, settings)], message);
}

repeatButton.addEventListener('click', () => record('repeat', 'Repeat reading saved'));
reviewButton.addEventListener('click', () => record('request', 'CMO review request saved'));
closeButton.addEventListener('click', () => record('close', 'Simulated review closed'));
scenarioPicker.addEventListener('change', () => {
  try {
    localStorage.setItem('astravital-scenario', scenarioPicker.value);
  } catch {
    // Changing scenario is still available without storage.
  }
  render();
});

if (channel) channel.onmessage = async () => {
  if (!database || busy) return;
  try {
    events = await readEvents(database);
    render();
  } catch {
    storageStatus.textContent = 'Local storage could not be refreshed.';
  }
};

exportButton.addEventListener('click', async () => {
  try {
    const snapshot = await readEvents(database);
    const content = JSON.stringify({format:'astravital-demo', version:1, events:snapshot}, null, 2);
    const url = URL.createObjectURL(new Blob([content], {type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'astravital-demo.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    storageStatus.textContent = 'Local export failed.';
  }
});

chooseImport.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', () => {
  const file = importInput.files[0];
  if (file) void save(async () => {
    if (file.size > 256000) throw new Error('This file is too large for a demo export.');
    return validateImport(JSON.parse(await file.text()));
  }, 'Demo records imported');
  importInput.value = '';
});

async function prepareStorage() {
  try {
    const opened = await openStorage();
    events = await readEvents(opened);
    database = opened;
    storageStatus.textContent = 'Local storage ready';
  } catch {
    storageStatus.textContent = 'Local storage unavailable. The demo is read-only.';
  } finally {
    busy = false;
    render();
  }
}

async function prepareOffline() {
  const status = byId('offline');
  if (!('serviceWorker' in navigator)) {
    status.textContent = 'Offline cache requires HTTPS or localhost.';
    return;
  }

  const update = () => {
    if (navigator.serviceWorker.controller) status.textContent = 'Offline ready';
  };
  navigator.serviceWorker.addEventListener('controllerchange', update);
  try {
    await navigator.serviceWorker.register('./sw.js');
    update();
  } catch {
    status.textContent = navigator.serviceWorker.controller ? 'Offline ready' : 'Offline cache unavailable';
  }
}

byId('keep-storage').addEventListener('click', async () => {
  try {
    const kept = await navigator.storage?.persist?.();
    storageStatus.textContent = kept ? 'Browser granted persistent storage' :
      'Persistent storage unavailable. Export a backup to retain records.';
  } catch {
    storageStatus.textContent = 'Persistent storage could not be requested.';
  }
});

render();
void prepareStorage();
void prepareOffline();
