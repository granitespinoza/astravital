// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {drawHistory} from './chart.js';
import {policy, SOL} from './engine.js';
import {heartThreshold} from './ground-model.js';
import {dailySeries, forecast, watchRisk} from './forecast.js';
import {healthStatus, healthStatusText, repeatOutcome} from './health-status.js';

const byId = id => document.getElementById(id);
const settings = policy();
const displayTime = value => value == null ? 'Unavailable' : new Date(value).toISOString().slice(0,16).replace('T',' ') + ' UTC';
const humanize = value => value?.replaceAll('_',' ').replaceAll('-',' ') ?? 'Unavailable';
const number = (value, places) => Number.isFinite(value) ? value.toFixed(places) : 'Unavailable';

function node(tag, text = '', css) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (css) element.className = css;
  return element;
}

function facts(entries) {
  const list = node('dl','','ground-metrics');
  for (const [key,value] of entries) {
    const group = node('div');
    group.append(node('dt',key),node('dd',value));
    list.append(group);
  }
  return list;
}

function chip(state, label) {
  const {level} = healthStatus(state);
  const element = node('span','','status-chip');
  const bars = node('span','','level-bars');
  bars.setAttribute('aria-hidden','true');
  bars.append(node('i'),node('i'),node('i'));
  element.dataset.level = level;
  const {icon, code} = healthStatus(state);
  element.append(node('strong',label ? `${icon} ${code} · ${label}` : healthStatusText(state)),bars);
  return element;
}

function metric(value, unit) {
  const label = node('p',value,'mission-value');
  label.append(node('small',' ' + unit));
  return label;
}

function heartPanel(member, webDemo) {
  const panel = byId('ground-heart');
  const {reading,decision} = member;
  const baseline = decision.baseline;
  const old = !webDemo && member.receivedAt && Date.now() - Date.parse(member.receivedAt) > settings.staleMs;
  panel.replaceChildren(chip(old ? 'stale' : decision.level ?? decision.quality));
  if (reading && decision.quality === 'ok') panel.append(metric(reading.value,'bpm'));
  else panel.append(node('p','No usable resting reading in this report.','mission-hint'));
  if (old) panel.append(node('p','The last received sample is stale. Values and decision below are from the archived report.','mission-hint'));
  panel.append(
    facts([
      ['Personal reference',baseline?.n ? `${number(baseline.mean,1)} ± ${number(baseline.sd,1)} bpm (n=${baseline.n})` : 'Unavailable'],
      ['Z-score',number(decision.z,2)],
      ['Report decision threshold',heartThreshold(decision)],
      ['Deviation persisted on repeat',member.repeated ? 'Yes' : 'No'],
      ['Quality',humanize(decision.quality)],
      ['Source',reading?.source ?? 'Unavailable'],
      ['Observed · simulated clock',displayTime(reading?.observedAt)],
      ['Received onboard',displayTime(member.receivedAt)],
    ]),
    node('p',repeatOutcome(member) ?? decision.reason,'mission-hint'),
  );
  panel.append(trendPanel(member, baseline));
  const history = member.history ?? (member.recent ?? []).map(point => ({...point,id:point.evidenceId}));
  const chart = byId('ground-history');
  drawHistory(chart,history,reading,baseline,settings);
  if (history.length) {
    const records = node('details');
    const values = node('ul');
    values.append(...history.map(point => node('li',`${displayTime(point.observedAt)} · ${point.value} bpm`)));
    records.append(node('summary','History readings'),values);
    chart.append(records);
  }
}

// AI assistance: Anthropic Claude. Experimental forecast, shown only to the doctor, never to the crew.
function trendPanel(member, baseline) {
  const box = node('div','','ground-forecast');
  box.append(node('h3','Trend forecast · experimental'));
  const points = [...(member.history ?? [])];
  if (member.reading && !points.some(point => point.id === member.reading.id)) points.push(member.reading);
  const result = forecast(dailySeries(points,SOL),{horizon:3});
  if (!result.ready) { box.append(node('p',result.reason,'mission-hint')); return box; }
  const risk = watchRisk(result, baseline, settings.watch);
  box.append(facts([
    ...result.points.map(p => [`Sol +${p.h}`,`${number(p.mean,1)} bpm (80%: ${number(p.low,0)}–${number(p.high,0)})`]),
    ['Trend',`${result.trendPerSol >= 0 ? '+' : ''}${number(result.trendPerSol,2)} bpm per sol`],
    ['Forecast vs personal WATCH band',risk ? `Whole 80% interval beyond the band at sol +${risk.sol}` : 'Not beyond the band'],
  ]));
  box.append(node('p',`${result.model} · ${result.n} sols of history, one value per sol. Backtest on synthetic crews: it adapts to the person but does not yet beat the last reading. Context for the flight surgeon only; the decision above still comes from the personal-reference rule.`,'mission-hint'));
  return box;
}

// AI assistance: Anthropic Claude. Status shown on the anatomy comes from the data, never from the image colours.
function heartState(member, webDemo) {
  if (!member) return 'missing';
  const old = !webDemo && member.receivedAt && Date.now() - Date.parse(member.receivedAt) > settings.staleMs;
  return old ? 'stale' : member.decision.level ?? member.decision.quality;
}

// Bone wording follows the glasses: a DXA change is worth a review; it cannot be re-checked like the heart reading.
function boneLabel(state, bone) {
  if (!bone) return 'No scan in this simulation';
  return {ok:'Within reference', watch:'Worth a review'}[state] ?? 'More data needed';
}

function boneState(bone) {
  if (!bone) return 'missing';
  const {comparable, significance} = bone.decision;
  return !comparable || significance === 'not-established' ? 'missing' : significance === 'exceeds-measurement-lsc' ? 'watch' : 'ok';
}

// The images are AI-generated illustrations (watermarked); markers are drawn by code from the selected report.
function anatomyStage(onZone) {
  const stage = node('div','','anatomy-stage');
  const image = (layer, src, alt, css) => {
    const img = document.createElement('img');
    Object.assign(img, {src, alt, className:css, decoding:'async', draggable:false});
    img.dataset.layer = layer;
    return img;
  };
  const figure = node('div','','anatomy-figure');
  figure.append(image('body','./anatomy-body.webp','Illustrative full-body anatomy with the heart and left hip highlighted. AI-generated image.','anatomy-body'));
  for (const [zone, x, y] of [['heart',53.5,26],['bone',55.8,44.3]]) {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'anatomy-marker';
    marker.dataset.zone = zone;
    marker.dataset.level = 'unknown';
    marker.style.left = x + '%';
    marker.style.top = y + '%';
    marker.append(node('span','','anatomy-ring'),node('span',zone === 'heart' ? 'Heart' : 'Left hip','anatomy-tag'));
    marker.onclick = () => onZone(zone === 'heart' ? 'cardiovascular' : 'bone');
    figure.append(marker);
  }
  stage.append(figure,
    image('heart','./anatomy-heart.webp','Illustrative heart anatomy. AI-generated image.','anatomy-closeup'),
    image('bone','./anatomy-left-hip.webp','Illustrative pelvis and left femur. AI-generated image.','anatomy-closeup'),
    node('p','','anatomy-status'),
    node('span','AI-generated image · ChatGPT (OpenAI)','ai-badge'));
  stage.querySelector('.anatomy-status').setAttribute('aria-live','polite');
  return stage;
}

function bonePanel(bone) {
  const panel = byId('ground-bone');
  if (!bone) {
    const message = bone === null ? 'No bone scan in this simulation' : 'Bone scan unavailable in this report.';
    panel.replaceChildren(chip('missing'),node('p',message));
    return;
  }
  const {current, baseline, comparable, percentChange, lscPercent, message, reasons, significance} = bone.decision;
  const state = boneState(bone);
  panel.replaceChildren(chip(state,boneLabel(state,bone)));
  if (current) panel.append(metric(number(current.value,2),'g/cm²'));
  panel.append(facts([
    ['Region',humanize(current?.region)],
    ['Side',humanize(current?.side)],
    ['Method',current?.method ?? 'Unavailable'],
    ['Latest scan',displayTime(current?.observedAt)],
    ['Previous scan',displayTime(baseline?.observedAt)],
    ['Change from previous scan',Number.isFinite(percentChange) ? number(percentChange,2) + '%' : 'Unavailable'],
    ['Least significant change',Number.isFinite(lscPercent) ? number(lscPercent,2) + '% · synthetic precision' : 'Unavailable'],
    ['Comparable',comparable ? 'Yes' : 'No'],
  ]),node('p',message,'mission-hint'));
  if (reasons.length) panel.append(node('p','Comparison details · ' + reasons.map(humanize).join(', '),'mission-hint'));
}

function evidencePanel(evidence) {
  const panel = byId('ground-evidence');
  panel.replaceChildren();
  if (!evidence) {
    panel.append(node('p','No evidence records available for this report.','mission-hint'));
    return;
  }
  const disclosure = node('details');
  disclosure.append(node('summary','Evidence · Bronze / Silver / Gold'));
  for (const [level,records] of Object.entries(evidence)) {
    const details = node('details');
    details.append(node('summary',`${level[0].toUpperCase() + level.slice(1)} · ${records.length} records`),
      node('pre',JSON.stringify(records,null,2)));
    disclosure.append(details);
  }
  panel.append(disclosure);
}

export function createGroundView({perform, prepareRequestId}) {
  const picker = byId('ground-member');
  const ack = byId('ground-ack');
  const add = byId('ground-add-note');
  const consult = byId('ground-teleconsult');
  const input = byId('ground-note');
  const feedback = byId('ground-action-result');
  const sharedCase = byId('ground-shared-case');
  const surface = byId('ground-scene');
  const zoomSteps = [1,2.5,4,6];
  let zoomIndex = 0;
  let report, member, scene, webDemo, busy = false, retry;
  let domain = new URLSearchParams(location.search).get('domain') === 'bone' ? 'bone' : 'cardiovascular';

  const closeupScale = {2.5:1, 4:1.35, 6:1.7};

  function updateAnatomy() {
    // Overview at 1×; close-up of the selected region when magnified.
    surface.dataset.view = zoomIndex === 0 ? 'body' : domain === 'bone' ? 'bone' : 'heart';
    const states = {heart:heartState(member,webDemo), bone:boneState(member?.bone)};
    for (const marker of surface.querySelectorAll('.anatomy-marker')) {
      const zone = marker.dataset.zone, status = healthStatus(states[zone]);
      const name = zone === 'heart' ? 'Heart' : 'Left hip';
      const label = zone === 'bone' ? boneLabel(states.bone,member?.bone) : status.label;
      marker.dataset.level = status.level;
      marker.querySelector('.anatomy-tag').textContent = name + ' · ' + label;
      marker.setAttribute('aria-label',name + ': ' + label + '. Show details.');
    }
    const line = surface.querySelector('.anatomy-status');
    if (!line) return;
    const focus = domain === 'bone' ? 'bone' : 'heart';
    line.dataset.level = healthStatus(states[focus]).level;
    const {icon, code} = healthStatus(states[focus]);
    line.textContent = focus === 'heart' ? '♥ Heart · ' + healthStatusText(states.heart) : `◇ Left hip · ${icon} ${code} · ${boneLabel(states.bone,member?.bone)}`;
  }

  function zoomTo(index) {
    zoomIndex = Math.max(0,Math.min(index,zoomSteps.length-1));
    const zoom = zoomSteps[zoomIndex];
    surface.dataset.zoom = String(zoom);
    surface.style.setProperty('--closeup-scale',String(closeupScale[zoom] ?? 1));
    byId('ground-zoom-level').textContent = zoom + '×';
    byId('ground-zoom-out').disabled = zoomIndex === 0;
    byId('ground-zoom-reset').disabled = zoomIndex === 0;
    byId('ground-zoom-in').disabled = zoomIndex === zoomSteps.length-1;
    updateAnatomy();
  }

  function selectDomain(next, focus = false) {
    domain = next;
    const showHeart = domain === 'cardiovascular';
    surface.dataset.region = showHeart ? 'heart' : 'bone';
    byId('ground-heart-button').setAttribute('aria-pressed',String(showHeart));
    byId('ground-bone-button').setAttribute('aria-pressed',String(!showHeart));
    byId('ground-heart-panel').hidden = !showHeart;
    byId('ground-bone-panel').hidden = showHeart;
    if (focus) zoomTo(Math.max(1,zoomIndex));
    else updateAnatomy();
  }

  function controls() {
    ack.disabled = busy || !member || member.groundAcknowledged || !['watch','alert'].includes(member.decision.level);
    ack.textContent = member?.groundAcknowledged ? 'Acknowledged' : 'Acknowledge';
    add.disabled = consult.disabled = busy || !member;
    input.disabled = busy || !member;
  }

  function renderMember() {
    member = report.crew.find(item => item.crewId === picker.value);
    sharedCase.hidden = !member?.visorCase;
    sharedCase.textContent = member?.visorCase ? 'Shared glasses case · ' +
      (member.visorCase === 'repeat' ? 'Repeat resting check' : 'Initial resting check') : '';
    const timeline = byId('ground-timeline');
    if (member) {
      heartPanel(member,webDemo);
      bonePanel(member.bone);
      evidencePanel(member.evidence);
      timeline.replaceChildren(...member.timeline.map(event => {
        const item = node('li','','ground-event');
        const time = node('time',displayTime(event.at));
        time.dateTime = event.at;
        item.append(time,node('p',event.label));
        if (event.note) item.append(node('p',event.note));
        return item;
      }));
    } else {
      byId('ground-heart').replaceChildren(chip('missing'),node('p','Waiting for a received report.','mission-hint'));
      byId('ground-bone').replaceChildren(chip('missing'),node('p','Waiting for a received report.','mission-hint'));
      byId('ground-history').replaceChildren();
      evidencePanel(null);
      timeline.replaceChildren(node('li','No received reports.','mission-hint'));
    }
    updateAnatomy();
    controls();
  }

  function selectCrew(id) {
    if (picker.value !== id) {
      input.value = '';
      feedback.textContent = '';
    }
    picker.value = id;
    renderMember();
    if (window.matchMedia('(max-width: 760px)').matches) byId('ground-heart-panel').scrollIntoView({block:'nearest'});
  }

  async function save(action) {
    if (!member || busy) return;
    const draft = {action,crewId:member.crewId,confirmed:true};
    if (action === 'acknowledge') draft.evidenceId = member.latestEvidenceId;
    if (action === 'note') draft.note = input.value.trim();
    const key = JSON.stringify(draft);
    retry = retry?.key === key ? retry : {key,requestId:prepareRequestId()};
    busy = true;
    picker.disabled = true;
    controls();
    try {
      const outcome = await perform({...draft,requestId:retry.requestId});
      feedback.textContent = outcome.entry.label + '.';
      if (action === 'note') input.value = '';
      retry = null;
    } catch (error) { feedback.textContent = error.message; }
    finally {
      busy = false;
      picker.disabled = !report.crew.length;
      controls();
    }
  }

  picker.onchange = () => { input.value = ''; feedback.textContent = ''; renderMember(); };
  byId('ground-heart-button').onclick = () => selectDomain('cardiovascular',true);
  byId('ground-bone-button').onclick = () => selectDomain('bone',true);
  byId('ground-zoom-in').onclick = () => zoomTo(zoomIndex + 1);
  byId('ground-zoom-out').onclick = () => zoomTo(zoomIndex - 1);
  byId('ground-zoom-reset').onclick = () => zoomTo(0);
  ack.onclick = () => void save('acknowledge');
  consult.onclick = () => void save('teleconsult');
  byId('ground-action-form').onsubmit = event => { event.preventDefault(); void save('note'); };
  surface.replaceChildren(anatomyStage(next => selectDomain(next,true)));
  byId('ground-zoom').hidden = false;
  selectDomain(domain);
  zoomTo(domain === 'bone' ? 1 : 0);
  surface.querySelector('.anatomy-body').decode()
    .catch(() => surface.replaceChildren(node('div','Anatomy illustration unavailable. Use the Heart and Bones buttons.','scene-fallback')))
    .finally(() => surface.removeAttribute('aria-busy'));

  return {
    render(payload, isWebDemo) {
      const selection = picker.value;
      webDemo = isWebDemo;
      const options = payload.crew.map(item => new Option(item.name,item.crewId));
      picker.replaceChildren(...options);
      const defaultMember = payload.crew.find(item => item.visorCase)?.crewId ?? payload.inbox[0]?.crewId;
      picker.value = payload.crew.some(item => item.crewId === selection) ? selection : defaultMember ?? '';
      picker.disabled = busy || !options.length;
      const inbox = byId('ground-inbox');
      inbox.replaceChildren(...payload.inbox.map(entry => {
        const row = node('li','','ground-row');
        const button = node('button');
        const plain = healthStatus(entry.state);
        const status = node('span',`${entry.priority === 'alert' ? '!' : entry.priority === 'watch' ? '△' : plain.icon} ${entry.label}`,'mission-status');
        status.dataset.level = entry.priority === 'alert' ? 'review' : entry.priority === 'watch' ? 'check' : plain.level;
        button.type = 'button';
        button.append(status,node('span',`${entry.name} · ${entry.threshold}${entry.acknowledged ? ' · Acknowledged' : ''}`));
        button.onclick = () => {
          if (busy) return;
          selectDomain('cardiovascular');
          selectCrew(entry.crewId);
        };
        row.append(button);
        return row;
      }));
      if (!payload.inbox.length) inbox.append(node('li','No received readings.','mission-hint'));
      report = payload;
      renderMember();
    },
  };
}
