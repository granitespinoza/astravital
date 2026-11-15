// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// This is a browser HUD simulation, not a native Lens or speech recognizer.
import {scenarios} from './scenarios.js';
import {presentHud, resolveIntent} from './hud-model.js';
import {expectedEvent, sameRecord} from './workflow.js';
import {openStorage, readEvents, appendEvents} from './storage.js';

const byId = id => document.getElementById(id);
const picker = byId('visor-scenario');
const audioMode = byId('audio-mode');
const card = byId('hud-card');
const primary = byId('hud-action');
const feedback = byId('hud-announcement');
const storage = byId('visor-storage');
for (const [value, label] of Object.entries(scenarios)) picker.add(new Option(label, value));
try {
  const saved = localStorage.getItem('astravital-visor-scenario');
  if (Object.hasOwn(scenarios, saved)) picker.value = saved;
} catch { /* A blocked preference store does not disable the workflow. */ }
let database;
let events = [];
let busy = true;
let confirming = null;
let minimized = false;
let saveError = null;
let failNextSave = false;
let region = 'heart';
let bodyOpen = false;
let model;
let sound;
let currentClip = 'hud-check';
const spoken = new Set();
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('astravital-events') : null;

function playClip(name, userRequested = false) {
  if (audioMode.value === 'off') return;
  const episode = `${picker.value}:${name}`;
  if (!userRequested && spoken.has(episode)) return;
  spoken.add(episode);
  if (sound) { sound.pause(); sound.currentTime = 0; }
  sound = new Audio('./' + name + '.wav');
  sound.play().catch(() => {
    feedback.textContent = 'Spoken cue unavailable. The text and controls remain usable.';
  });
}

function renderBody() {
  const panel = byId('body-panel');
  panel.hidden = !bodyOpen;
  panel.dataset.region = region === 'bones' ? 'bones' : 'heart';
  byId('body-heart-button').setAttribute('aria-pressed', String(region === 'heart'));
  byId('body-bone-button').setAttribute('aria-pressed', String(region === 'bones'));
  const suitable = model.reading !== null;
  byId('body-heart-highlight').style.opacity = suitable && region === 'heart' ? '1' : '.12';
  byId('body-heart').style.opacity = suitable && region === 'heart' ? '1' : '.2';
  if (region === 'bones') {
    byId('body-heading').textContent = 'No bone measurement available';
    byId('body-copy').textContent = 'Bone monitoring needs a dated, quality-controlled measurement from a suitable device. Heart rate cannot supply it.';
    byId('body-limit').textContent = 'Research direction only. No bone loss, porosity or fracture risk has been detected in this prototype.';
    return;
  }
  byId('body-heading').textContent = suitable ? 'Cardiovascular signal' : model.headline;
  const {decision, reading} = model;
  byId('body-copy').textContent = suitable && decision.baseline
    ? `${reading.value} bpm at rest. Your reference is ${decision.baseline.mean.toFixed(1)} ± ${decision.baseline.sd.toFixed(1)} bpm (${decision.baseline.n} readings). ${decision.reason}`
    : decision.reason;
  byId('body-limit').textContent = 'The marker identifies the monitored system. It does not locate a heart lesion or explain the cause. Synthetic data; not a diagnosis.';
}

function render() {
  model = presentHud(picker.value, events);
  if (model.saved) { confirming = null; saveError = null; }
  const isConfirming = confirming === picker.value && model.canRequest;
  const state = saveError ? 'error' : model.saved ? 'saved' : (model.decision.level ?? model.decision.quality);
  card.dataset.state = state;
  card.hidden = minimized || bodyOpen;
  byId('hud-idle').hidden = !minimized || bodyOpen;
  byId('hud-label').textContent = saveError ? 'SAVE FAILED' : model.saved ? 'SAVED LOCALLY' : model.label;
  byId('hud-kind').textContent = isConfirming ? 'CONFIRM YOUR ACTION' : model.saved ? 'ONBOARD REVIEW REQUEST' : 'RESTING HEART RATE';
  byId('hud-headline').textContent = saveError ? 'Couldn’t save the request.' : model.saved ? 'Saved here. Not delivered.' : model.headline;
  byId('hud-caption').textContent = saveError ? 'Nothing was confirmed. You can retry with the same record ID.' :
    model.saved ? 'Your request is on this device. No message has been sent to a clinician or Earth.' :
    model.reading ? model.performed ? 'The repeat is still outside your usual resting range.' :
      model.decision.level === 'ok' ? 'You can return to your task.' : 'Check again when you can pause your task.' :
      'No health deviation is assessed from this reading. Check the source or history.';
  byId('confirm-panel').hidden = !isConfirming;
  byId('hud-main-actions').hidden = isConfirming;
  primary.textContent = saveError ? 'Try again' : model.action === 'repeat' ? 'Check again' : model.action === 'request' ? 'Request review' : 'Continue task';
  picker.disabled = busy;
  byId('simulate-save-failure').disabled = busy;
  primary.disabled = busy || (!database && (model.action !== null || Boolean(saveError)));
  byId('hud-confirm').disabled = busy || !database || !isConfirming;
  byId('hud-cancel').disabled = busy;
  byId('hud-why').disabled = busy;
  byId('hud-dismiss').disabled = busy;
  byId('send-intent').disabled = busy;
  byId('visor-event-count').textContent = events.length;
  byId('simulate-save-failure').setAttribute('aria-pressed', String(failNextSave));
  currentClip = saveError ? 'hud-error' : model.saved ? 'hud-saved' : model.performed ? 'hud-followup' : 'hud-check';
  byId('hud-replay').disabled = audioMode.value === 'off' || (!model.action && !model.saved && !saveError);
  renderBody();
  if (!busy && !minimized && !isConfirming && (model.action || model.saved || saveError)) playClip(currentClip);
}

async function save(kind) {
  if (busy || !database) return;
  const scenario = picker.value;
  if (kind === 'request' && confirming !== scenario) return;
  busy = true;
  render();
  try {
    const fresh = await readEvents(database);
    const next = presentHud(scenario, fresh);
    if (kind === 'repeat' && !next.canRepeat && !next.performed) throw new Error('Repeat is unavailable in this state.');
    if (kind === 'request' && !next.canRequest && !next.saved) throw new Error('Confirm a valid repeat before requesting review.');
    const record = expectedEvent(scenario, kind);
    if (failNextSave) {
      failNextSave = false;
      throw new Error('Simulated local storage failure.');
    }
    await appendEvents(database, [record]);
    const persisted = await readEvents(database);
    if (!persisted.some(event => sameRecord(event, record))) throw new Error('Read-back did not confirm this record.');
    events = persisted;
    confirming = null;
    saveError = null;
    feedback.textContent = kind === 'repeat' ? 'Simulated repeat saved using the original baseline.' : 'Review request saved on this device. Delivery is not implemented.';
    storage.textContent = 'Local records ready';
    channel?.postMessage('updated');
  } catch (error) {
    confirming = null;
    saveError = {scenario, kind};
    feedback.textContent = error.message + ' No success confirmation was issued.';
    storage.textContent = 'Local save failed';
    spoken.delete(`${scenario}:hud-error`);
  } finally {
    busy = false;
    render();
  }
}

function act(intent) {
  if (busy) return false;
  if (['repeat', 'request', 'confirm'].includes(intent) && !database) return false;
  if (intent === 'status') { minimized = false; render(); return true; }
  if (intent === 'explain') { bodyOpen = true; region = 'heart'; minimized = false; render(); playClip('hud-explain', true); return true; }
  if (intent === 'dismiss') { minimized = true; bodyOpen = false; if (sound) sound.pause(); render(); return true; }
  if (intent === 'replay') { if (audioMode.value === 'off') return false; playClip(currentClip, true); return true; }
  if (intent === 'cancel') { if (!confirming) return false; confirming = null; render(); return true; }
  if (intent === 'repeat' && model.canRepeat) { void save('repeat'); return true; }
  if (intent === 'request' && model.canRequest) { confirming = picker.value; bodyOpen = false; render(); return true; }
  if (intent === 'confirm' && confirming === picker.value && model.canRequest) { void save('request'); return true; }
  return false;
}

primary.addEventListener('click', () => {
  if (saveError?.scenario === picker.value) {
    if (saveError.kind === 'request') { confirming = picker.value; saveError = null; render(); }
    else { saveError = null; void save('repeat'); }
  } else if (model.action) act(model.action);
  else act('dismiss');
});
byId('hud-confirm').addEventListener('click', () => act('confirm'));
byId('hud-cancel').addEventListener('click', () => act('cancel'));
byId('hud-why').addEventListener('click', () => act('explain'));
byId('hud-dismiss').addEventListener('click', () => act('dismiss'));
byId('show-hud').addEventListener('click', () => act('status'));
byId('hud-replay').addEventListener('click', () => act('replay'));
byId('body-close').addEventListener('click', () => { bodyOpen = false; render(); byId('hud-why').focus({preventScroll:true}); });
byId('body-heart-button').addEventListener('click', () => { region = 'heart'; renderBody(); });
byId('body-bone-button').addEventListener('click', () => { region = 'bones'; renderBody(); });
byId('simulate-save-failure').addEventListener('click', () => { failNextSave = !failNextSave; render(); });
picker.addEventListener('change', () => {
  confirming = null; saveError = null; minimized = presentHud(picker.value, events).label === 'OK'; bodyOpen = false;
  if (sound) sound.pause();
  try { localStorage.setItem('astravital-visor-scenario', picker.value); } catch { /* Optional preference only. */ }
  render();
});
audioMode.addEventListener('change', () => {
  if (sound) sound.pause();
  render();
});
byId('send-intent').addEventListener('click', () => {
  const intent = resolveIntent(byId('voice-command').value);
  byId('intent-feedback').textContent = intent && act(intent)
    ? 'Simulated intent accepted: ' + intent + '.'
    : 'Command not recognized or unavailable at this step. Use the visible controls.';
});
byId('voice-command').addEventListener('keydown', event => {
  if (event.key === 'Enter') byId('send-intent').click();
});

if (channel) channel.onmessage = async () => {
  if (!database || busy) return;
  try { events = await readEvents(database); render(); }
  catch { storage.textContent = 'Local records could not be refreshed.'; }
};
async function start() {
  try { database = await openStorage(); events = await readEvents(database); storage.textContent = 'Local records ready'; feedback.textContent = 'Scene and sensor are simulated. No microphone or camera is used.'; }
  catch { database = undefined; storage.textContent = 'Local storage unavailable. Actions cannot be saved.'; feedback.textContent = 'Read-only preview. Local storage is unavailable.'; }
  busy = false; minimized = presentHud(picker.value, events).label === 'OK'; render();
  const offline = byId('visor-offline');
  if (!('serviceWorker' in navigator)) { offline.textContent = 'Offline access requires HTTPS or localhost'; return; }
  const update = () => { if (navigator.serviceWorker.controller) offline.textContent = 'Offline ready'; };
  navigator.serviceWorker.addEventListener('controllerchange', update);
  try { await navigator.serviceWorker.register('./sw.js'); update(); }
  catch { offline.textContent = navigator.serviceWorker.controller ? 'Offline ready' : 'Offline cache unavailable'; }
}
render();
void start();
