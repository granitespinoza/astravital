// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {healthStatus, healthStatusText, repeatOutcome} from './health-status.js';
import {browserMessages,messageContext} from './case-messages.js';
import {createCaseThread} from './case-thread.js';

const byId = id => document.getElementById(id);
const phoneToken = new URLSearchParams(location.hash.slice(1)).get('crew');
const isPhone = phoneToken !== null;
const queueKey = 'astravital-mission-queue-' + phoneToken;
let pending = [];
if (isPhone) {
  try {
    const stored = JSON.parse(localStorage.getItem(queueKey) ?? '[]');
    if (Array.isArray(stored)) pending = stored;
  } catch { /* The active tab still holds unconfirmed packets. */ }
}
let state;
let active = isPhone ? 'crew' : 'cmo';
let busy = false;
let signature;
let links = [];
let demo, ground, groundModule, modeReady = false;
let localService=false, medicalThread,crewThread,cmoThread,cmoPayload;
const browserStore=browserMessages();
async function messageRequest(input,context) {
  if(demo&&!localService)return browserStore.request(input,context);
  const headers={'Content-Type':'application/json',...(isPhone?{Authorization:'Bearer '+phoneToken}:{})};
  const response=await fetch(isPhone?'./api/mission/messages':'./api/messages',{method:'POST',headers,body:JSON.stringify(input)});
  const value=await response.json();if(!response.ok)throw new Error(value.error??'The message could not be saved.');return value;
}

const requestId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)),
  byte => byte.toString(16).padStart(2,'0')).join('');

function element(tag, text, css) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (css) node.className = css;
  return node;
}

async function request(path, data) {
  if (demo) return demo.request(path,data);
  const headers = isPhone ? {Authorization:'Bearer ' + phoneToken} : {};
  const options = {headers, cache:'no-store', signal:AbortSignal.timeout(5000)};
  if (data !== undefined) {
    options.method = 'POST';
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  let response, value;
  try {
    response = await fetch('./api/mission/' + path, options);
    value = await response.json();
  } catch {
    throw new Error('The mission laptop is unreachable. Check the local Wi-Fi connection.');
  }
  if (!response.ok) throw Object.assign(new Error(value.error ?? 'The request failed.'), {status:response.status});
  return value;
}

function persistQueue() {
  let stored = true;
  try { localStorage.setItem(queueKey, JSON.stringify(pending)); }
  catch { stored = false; }
  byId('queue').textContent = pending.length
    ? pending.length + ' awaiting confirmation.' + (stored ? '' : ' Keep this tab open to retry.')
    : 'No samples waiting to send.';
}

function formatTime(value) {
  return value == null ? 'Unavailable' : new Date(value).toISOString().slice(0,16).replace('T',' ') + ' UTC';
}

function readingsCard(member, canAcknowledge) {
  const details = element('div','','mission-card');
  const decision = member.decision;
  const key = decision.level ?? decision.quality;
  const status = element('p',healthStatusText(key),'mission-status');
  status.dataset.level = healthStatus(key).level;
  const value = member.reading?.value;
  details.append(element('h3',member.name),status,element('p',value === undefined ? 'No sample received' : value + ' bpm','mission-value'),
    element('p',repeatOutcome(member) ?? decision.reason));
  if (member.receivedAt) details.append(element('p','Received ' + formatTime(member.receivedAt) + ' · Simulated sol ' + member.missionDay,'mission-hint'));
  if (decision.baseline?.n) {
    const info = document.createElement('details');
    info.append(element('summary','Measurement evidence'),
      element('p',decision.baseline.mean.toFixed(1) + ' bpm personal baseline · ' + decision.baseline.n + ' readings'),
      element('p','Z-score ' + (decision.z?.toFixed(2) ?? '—') + ' · Quality: ' + decision.quality),
      element('p','Deviation persisted on repeat: ' + (member.repeated ? 'Yes' : 'No')),
      element('p',decision.rule),element('p',member.latestEvidenceId));
    if (member.recent.length > 1) info.append(element('p','Recent received samples (bpm): ' + member.recent.map(item=>item.value).join(', ')));
    details.append(info);
  }
  if (member.acknowledgedAt) details.append(element('p','CMO acknowledged this sample.','mission-hint'));
  else if (canAcknowledge && ['watch','alert'].includes(decision.level)) {
    const button = element('button','Acknowledge reading');
    button.type = 'button';
    button.onclick = () => {
      if (confirm('Acknowledge this simulated reading for ' + member.name + '?')) {
        void perform('ack',{crewId:member.crewId,evidenceId:member.latestEvidenceId,confirmed:true},'Acknowledgement saved.');
      }
    };
    details.append(button);
  }
  return details;
}

function render(payload) {
  const next = JSON.stringify(payload);
  if (signature === next) return;
  signature = next;
  if (active === 'crew') {
    state = payload;
    byId('send-sample').disabled = false;
    byId('heading').textContent = payload.name;
    byId('crew-state').replaceChildren(readingsCard(payload,false));
    crewThread??=createCaseThread(byId('crew-conversation'),{request:messageRequest});
    crewThread.render(messageContext(payload,'cardiovascular','crew'));
  } else if (active === 'cmo') {
    cmoPayload=payload;
    if (!links.length || links[0].url !== payload.links[0]?.url) {
      const selected = byId('member').value;
      links = payload.links;
      byId('member').replaceChildren(...payload.crew.map(member => {
        const option = element('option',member.name);
        option.value = member.crewId;
        return option;
      }));
      if (selected) byId('member').value = selected;
      updatePair();
    }
    byId('pair-mode').textContent = payload.lanEnabled
      ? 'Phone and laptop must be on the same local network.'
      : 'Laptop preview. Start with the laptop’s Wi-Fi IPv4 address to pair a phone.';
    byId('review-count').textContent = payload.reviewCount + ' review requests saved in the glasses experience.';
    byId('roster').replaceChildren(...payload.crew.map(member => readingsCard(member,true)));
    updateCmoConversation();
  } else {
    ground.render(payload,Boolean(demo));
    const cards = payload.reports.map(report => {
      const card = element('article','','mission-card');
      card.append(element('h3',report.kind === 'daily' ? 'Daily overview' : 'Weekly overview'),
        element('p',report.status === 'queued' ? '○ QUEUED · SIMULATED' :
          report.status === 'reviewed' ? '✓ RECEIVED · REVIEWED · SIMULATED' : '✓ RECEIVED · SIMULATED','mission-status'),
        element('p','Created ' + formatTime(report.createdAt),'mission-hint'));
      if (report.delayMinutes) card.append(element('p',`Modeled delay · ${report.delayMinutes} min`,'mission-hint'));
      if (report.status === 'queued' && report.dueAt) card.append(element('p','Simulated arrival ' + formatTime(report.dueAt),'mission-hint'));
      if (report.deliveredAt) card.append(element('p','Simulated receipt ' + formatTime(report.deliveredAt),'mission-hint'));
      if (report.crew) {
        const list = document.createElement('ul');
        for (const member of report.crew) {
          list.append(element('li',member.name + ': ' + (member.reading ? member.reading.value + ' bpm · ' +
            healthStatusText(member.decision.level ?? member.decision.quality) : 'No reading')));
        }
        card.append(list);
      }
      if (!demo && report.status !== 'reviewed') {
        const queued = report.status === 'queued';
        const button = element('button',queued ? 'Simulate Earth receipt' : 'Mark simulated review');
        button.type = 'button';
        button.onclick = () => void perform('report-state',{id:report.id,action:queued ? 'deliver' : 'review'},
          queued ? 'Receipt simulated.' : 'Simulated review saved.');
        card.append(button);
      }
      return card;
    });
    byId('reports').replaceChildren(...(cards.length ? cards : [element('p','No reports queued.')]));
  }
}

async function refresh() {
  const view = active;
  try {
    if (view === 'crew') {
      while (pending.length) {
        await request('readings',pending[0]);
        pending.shift();
        persistQueue();
      }
    }
    if (view === 'ground' && !ground) {
      groundModule ??= import('./ground-view.js?v=18');
      const {createGroundView} = await groundModule;
      if (view !== active) return;
      medicalThread??=createCaseThread(byId('ground-conversation'),{request:messageRequest,localOnly:Boolean(demo&&!localService)});
      ground = createGroundView({prepareRequestId:requestId,onCase:context=>medicalThread.render(context), perform:async draft => {
        const outcome = await request('ground-action',draft);
        await poll();
        return outcome;
      }});
    }
    const payload = await request(view);
    if (view !== active) return;
    render(payload);
    byId('connection').textContent = demo ? 'WEB DEMO · Seed 142 training report' : 'Connected to the mission laptop';
  } catch (error) {
    if (view !== active) return;
    byId('connection').textContent = error.status === 403 && !isPhone
      ? 'Open a crew link from the CMO console on the laptop.' : error.message;
  }
}

async function poll() {
  if (busy) return;
  busy = true;
  const view = active;
  try { await refresh(); }
  finally {
    busy = false;
    if (active !== view) void poll();
  }
}

async function perform(path,data,message) {
  if (busy) {
    byId('action-result').textContent = 'The console is updating. Try again.';
    return;
  }
  busy = true;
  try {
    await request(path,data);
    byId('action-result').textContent = message;
    await refresh();
  } catch (error) { byId('action-result').textContent = error.message; }
  finally { busy = false; }
}

function updatePair() {
  byId('pair-link').value = links.find(link => link.id === byId('member').value)?.url ?? '';
  updateCmoConversation();
}
function updateCmoConversation(){
  const member=cmoPayload?.crew.find(item=>item.crewId===byId('member').value);if(!member)return;
  cmoThread??=createCaseThread(byId('cmo-conversation'),{request:messageRequest});
  cmoThread.render(messageContext(member,'cardiovascular','cmo'));
}

function selectView(view) {
  active = view;
  signature = undefined;
  byId('level').textContent = view === 'cmo' ? 'LEVEL 2 · CREW MEDICAL OFFICER' : 'LEVEL 3 · FLIGHT SURGEON';
  byId('heading').textContent = view === 'cmo' ? 'Onboard crew review' : 'Earth doctor view';
  document.querySelector('main').dataset.view = view;
  byId('cmo-panel').hidden = view !== 'cmo';
  byId('ground-panel').hidden = view !== 'ground';
  byId('action-result').textContent = '';
  byId('show-cmo').setAttribute('aria-pressed',String(view === 'cmo'));
  byId('show-ground').setAttribute('aria-pressed',String(view === 'ground'));
  if (modeReady) void poll();
}

async function initStaff() {
  const local = ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
  if (!local && location.protocol !== 'https:') {
    byId('connection').textContent = 'Open a crew link from the CMO console on the laptop.';
    return;
  }
  if (local) {
    try {
      const response = await fetch('./health',{cache:'no-store',signal:AbortSignal.timeout(3000)});
      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        const health = await response.json();
        localService=health.ok===true;
        modeReady = health.mission === true;
      }
    } catch { /* No local mission profile answered the capability check. */ }
  }
  if (!modeReady) {
    try {
      const {createMissionDemo} = await import('./mission-demo.js?v=15');
      demo = await createMissionDemo({caseId:new URLSearchParams(location.search).get('case')});
      modeReady = true;
    } catch {
      byId('connection').textContent = 'The web demo snapshot is unavailable. Reload to try again.';
      return;
    }
  }
  byId('staff-nav').hidden = Boolean(demo);
  byId('report-form').hidden = Boolean(demo);
  byId('glasses-link').hidden = false;
  if (demo) byId('glasses-link').href = './#shared-case';
  byId('show-cmo').onclick = () => { location.hash = '#cmo'; };
  byId('show-ground').onclick = () => { location.hash = '#ground'; };
  byId('member').onchange = updatePair;
  byId('pair-link').onclick = event => event.currentTarget.select();
  byId('report-form').onsubmit = event => {
    event.preventDefault();
    void perform('reports',{kind:byId('report-kind').value},'Report queued onboard.');
  };
  const route = () => selectView(demo || location.hash === '#ground' ? 'ground' : 'cmo');
  addEventListener('hashchange',route);
  route();
  if (demo && navigator.serviceWorker) void navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (!demo) setInterval(poll,2500);
}

if (isPhone) {
  byId('level').textContent = 'LEVEL 1 · CREW';
  byId('heading').textContent = 'Crew check';
  byId('crew-panel').hidden = false;
  byId('sample-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!state) return;
    const packetId = requestId();
    pending.push({packetId,value:state.profiles[byId('profile').value],simulated:true});
    persistQueue();
    void poll();
  });
  persistQueue();
  void poll();
  setInterval(poll,2500);
} else {
  void initStaff();
}
