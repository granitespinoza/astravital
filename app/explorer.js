// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {policy, traceDecision} from './engine.js';
import {sample} from './scenarios.js';
import {drawHistory} from './chart.js';

const byId = id => document.getElementById(id);
const views = {
  crew: {title:'Crew health overview', eyebrow:'A CLEARER SIGNAL. A HUMAN DECISION.', description:'Understand your personal baseline. Choose your next step.', breadcrumb:'CREW OVERVIEW'},
  detection: {title:'Explore the anomaly', eyebrow:'THE SIGNAL, WITH ITS REASONING.', description:'Change a simulated reading. See exactly why a flag appears.', breadcrumb:'DETECTION LAB'},
  architecture: {title:'From signal to action', eyebrow:'BUILT AROUND ONE HUMAN DECISION.', description:'Follow the data. Inspect each check. See where it stops.', breadcrumb:'ARCHITECTURE / DATA FLOW'},
};
const states = {ok:'● OK', watch:'▲ WATCH', alert:'▲ ALERT', missing:'○ MISSING', stale:'◷ STALE', suspect:'◇ SUSPECT', 'device-fault':'× DEVICE FAULT', 'insufficient-history':'○ INSUFFICIENT HISTORY'};
const stageTitles = ['Acquire', 'Validate', 'Match context', 'Build baseline', 'Explain deviation'];
const stageStates = {pass:'✓ Passed', blocked:'! Stopped here', skipped:'— Not evaluated'};

function showView() {
  const name = Object.hasOwn(views, location.hash.slice(1)) ? location.hash.slice(1) : 'crew';
  const copy = views[name];
  for (const key of Object.keys(views)) byId('view-' + key).hidden = key !== name;
  for (const link of document.querySelectorAll('[data-view]')) {
    if (link.dataset.view === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  byId('breadcrumb-view').textContent = copy.breadcrumb;
  byId('view-eyebrow').textContent = copy.eyebrow;
  byId('page-description').textContent = copy.description;
  byId('page-title').textContent = copy.title;
  const dot = document.createElement('span');
  dot.className = 'title-dot'; dot.textContent = '.';
  byId('page-title').append(dot);
  document.title = 'ASTRAVITAL · ' + copy.breadcrumb.toLowerCase();
}

function facts(container, entries) {
  container.replaceChildren(...entries.map(([label, value]) => {
    const group = document.createElement('div');
    const term = document.createElement('dt'); term.textContent = label;
    const content = document.createElement('dd'); content.textContent = value;
    group.append(term, content); return group;
  }));
}

export function createExplorer() {
  let snapshot;
  let labValue;
  let activeStage = 0;
  let lastScenario;
  const labInput = byId('lab-value');
  const windowPicker = byId('lab-window');

  function renderLab() {
    if (!snapshot) return;
    const data = sample(snapshot.scenario, 28);
    const settings = policy(Number(windowPicker.value));
    const current = data.current ? {...data.current, id:'lab-current', source:labValue === undefined ? data.current.source : 'Lab input (simulated)', value:labValue === undefined ? data.current.value : labValue} : null;
    const trace = traceDecision(current, data.history, data.now, settings);
    const {decision} = trace;
    const {z, baseline, level, quality} = decision;
    const editable = Boolean(data.current && data.current.quality === 'ok');
    labInput.disabled = !editable;
    if (document.activeElement !== labInput) labInput.value = current?.value ?? '';
    byId('lab-input-note').textContent = editable
      ? 'Synthetic input only. Seed 142 provides ' + data.history.length + ' prior readings for comparing windows.'
      : 'This scenario has unavailable or flagged data. Select a valid-reading scenario to change the value.';
    const state = level ?? quality;
    byId('lab-status').dataset.state = state;
    byId('lab-status').textContent = states[state];
    byId('lab-z').textContent = Number.isFinite(z) ? (z > 0 ? '+' : '') + z.toFixed(2) : '—';
    byId('lab-pin').hidden = !Number.isFinite(z);
    byId('lab-pin').style.left = (Math.max(-4, Math.min(4, z ?? 0)) + 4) / 8 * 100 + '%';
    byId('lab-explanation').textContent = Number.isFinite(z)
      ? `${current.value} bpm compared with ${baseline.mean.toFixed(1)} ± ${baseline.sd.toFixed(1)} bpm across ${baseline.n} prior readings. ${decision.reason}`
      : decision.reason;
    facts(byId('lab-facts'), [['Window', settings.window + ' sols'], ['Included readings', baseline?.n ?? '—'], ['History rows excluded', trace.stages[3].state === 'skipped' ? '—' : trace.excludedCount]]);
    const ids = new Set(trace.includedIds);
    const points = data.history.filter(row => ids.has(row.id));
    if (current && current.quality === 'ok' && Number.isFinite(current.value) && quality === 'ok') points.push(current);
    drawHistory(byId('lab-chart'), points, current, baseline, settings);
    byId('lab-trace').replaceChildren(...trace.stages.map((stage, index) => {
      const item = document.createElement('li'); item.dataset.state = stage.state;
      const icon = document.createElement('span'); icon.className = 'step-icon'; icon.textContent = stage.state === 'pass' ? '✓' : stage.state === 'blocked' ? '!' : '—'; icon.setAttribute('aria-hidden','true');
      const heading = document.createElement('strong'); heading.textContent = `${index + 1}. ${stage.label} · ${stage.state === 'pass' ? 'Passed' : stage.state === 'blocked' ? 'Blocked' : 'Skipped'}`;
      const detail = document.createElement('p'); detail.textContent = stage.detail;
      item.append(icon, heading, detail); return item;
    }));
  }

  function renderFlow(focusSelection = false) {
    if (!snapshot) return;
    const {trace, measurement, decision, scenario, performed, request, closed, eventCount} = snapshot;
    const buttons = trace.stages.map((stage, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'flow-stage'; button.dataset.state = stage.state;
      button.setAttribute('aria-pressed', String(activeStage === index));
      const number = document.createElement('span'); number.textContent = '0' + (index + 1);
      const label = document.createElement('strong'); label.textContent = stageTitles[index];
      const state = document.createElement('small'); state.textContent = stageStates[stage.state];
      button.append(number, label, state);
      button.addEventListener('click', () => { activeStage = index; renderFlow(true); });
      return button;
    });
    byId('flow-stages').replaceChildren(...buttons);
    if (focusSelection) buttons[activeStage].focus({preventScroll:true});
    const stage = trace.stages[activeStage];
    byId('flow-stage-number').textContent = `STEP 0${activeStage + 1} / ${stage.state.toUpperCase()}`;
    byId('flow-stage-title').textContent = stage.label;
    byId('flow-stage-detail').textContent = stage.detail;
    const payloads = [
      {scenario, input:measurement ? {id:measurement.id, value:measurement.value, unit:measurement.unit, context:measurement.context, simulated:measurement.simulated} : null},
      {quality:decision.quality, acquiredAt:measurement ? new Date(measurement.observedAt).toISOString() : null, staleLimitHours:26},
      {crew:measurement?.crewId ?? null, context:measurement?.context ?? null, requiredContext:'rest'},
      {baseline:decision.baseline, excludedHistoryRows:trace.excludedCount},
      {z:decision.z, level:decision.level, rule:decision.rule, medicalDiagnosis:false},
    ];
    byId('flow-payload').textContent = stage.state === 'skipped' ? JSON.stringify({evaluated:false, reason:stage.detail}, null, 2) : JSON.stringify(payloads[activeStage], null, 2);
    byId('flow-repeat').textContent = performed ? '✓ Repeat recorded' : 'Repeat pending';
    byId('flow-review').textContent = closed ? '✓ Simulated review closed' : request ? '✓ Request stored locally' : 'Review not requested';
    byId('flow-event-count').textContent = eventCount;
  }

  window.addEventListener('hashchange', () => {
    showView();
    byId('workspace').focus({preventScroll:true});
    renderLab();
  });
  windowPicker.addEventListener('change', renderLab);
  labInput.addEventListener('input', () => { labValue = labInput.value === '' ? null : Number(labInput.value); renderLab(); });
  byId('lab-reset').addEventListener('click', () => { labValue = undefined; windowPicker.value = '14'; renderLab(); });
  showView();
  return next => {
    snapshot = next;
    if (next.scenario !== lastScenario) { labValue = undefined; lastScenario = next.scenario; }
    renderLab(); renderFlow();
  };
}
