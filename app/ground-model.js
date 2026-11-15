// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {policy} from './engine.js';
import {healthStatus} from './health-status.js';

const settings = policy();
const ranks = {alert:0, watch:1, info:2};

export function heartThreshold(decision) {
  if (decision?.level === 'alert') return `|z| ≥ ${settings.alert}`;
  if (decision?.level === 'watch') return `${settings.watch} ≤ |z| < ${settings.alert}`;
  if (decision?.level === 'ok') return `|z| < ${settings.watch}`;
  return 'Threshold not evaluated';
}

export function buildGround(reports, actions = []) {
  const received = reports.filter(report => report.crew);
  const latest = received[0];
  const crew = (latest?.crew ?? []).map(member => {
    const timeline = new Map();
    for (const report of received) {
      const snapshot = report.crew.find(item => item.crewId === member.crewId);
      if (!snapshot) continue;
      for (const event of snapshot.timeline ?? []) timeline.set(event.id, event);
      if (report.deliveredAt) {
        const id = report.id + ':received';
        timeline.set(id, {id, kind:'report-received', at:report.deliveredAt,
          label:`Received ${report.kind} report · simulated`});
      }
      if (report.reviewedAt) {
        const id = report.id + ':reviewed';
        timeline.set(id, {id, kind:'report-reviewed', at:report.reviewedAt,
          label:'Ground report review saved · simulated'});
      }
    }
    const local = actions.filter(event => event.crewId === member.crewId);
    for (const event of local) timeline.set(event.id, event);
    return {...member, reportReceivedAt:latest.deliveredAt,
      groundAcknowledged:local.some(event => event.kind === 'ground-ack' && event.evidenceId === member.latestEvidenceId),
      timeline:[...timeline.values()].sort((a,b) => b.at.localeCompare(a.at))};
  });
  const inbox = crew.map(member => {
    const {level, quality, z} = member.decision;
    const confirmed = level === 'alert' && member.confirmedAlert;
    const priority = confirmed ? 'alert' : ['watch','alert'].includes(level) ? 'watch' : 'info';
    const label = confirmed ? 'Confirmed ALERT' : level === 'alert' ? 'ALERT · awaiting a second ALERT' : healthStatus(level ?? quality).code;
    return {crewId:member.crewId, name:member.name, evidenceId:member.latestEvidenceId,
      priority, state:level ?? quality, label, z, threshold:heartThreshold(member.decision), acknowledged:member.groundAcknowledged};
  }).sort((a,b) => ranks[a.priority] - ranks[b.priority]);
  return {reports, crew, inbox};
}

const kinds = {acknowledge:'ground-ack', note:'note', teleconsult:'teleconsult'};
const labels = {'ground-ack':'Ground acknowledgment saved', note:'Ground note saved', teleconsult:'Simulated teleconsult request saved locally'};

function fail(message, status = 400) {
  throw Object.assign(new Error(message), {status});
}

export function groundAction({crew, previous, at}, input) {
  const {crewId,action,evidenceId,note,confirmed,requestId} = input ?? {};
  if (confirmed !== true || typeof requestId !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(requestId)
      || !Object.hasOwn(kinds, action)) fail('Confirm a valid Ground action.');
  if (action === 'note' && (typeof note !== 'string' || !note.trim() || note.trim().length > 500)) {
    fail('Write a note of 1–500 characters.');
  }
  const kind = kinds[action];
  const entry = {id:requestId, crewId, kind, evidenceId:action === 'acknowledge' ? evidenceId : null,
    note:action === 'note' ? note.trim() : null, at, label:labels[kind], delivery:'local-only'};
  if (previous) {
    if (['crewId','kind','evidenceId','note'].some(key => previous[key] !== entry[key])) {
      fail('This request ID already belongs to a different Ground action.',409);
    }
    return {saved:true, duplicate:true, entry:previous};
  }
  const member = crew.find(item => item.crewId === crewId);
  if (!member) fail('Select a crew member from a received report.',404);
  if (kind === 'ground-ack') {
    if (!evidenceId || evidenceId !== member.latestEvidenceId || !['watch','alert'].includes(member.decision.level)) {
      fail('Select the current WATCH or ALERT from a received report.',409);
    }
    if (member.groundAcknowledged) fail('This reading is already acknowledged.',409);
  }
  return {saved:true, duplicate:false, entry};
}
