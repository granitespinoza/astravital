// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {scenarios} from './scenarios.js';
import {evaluateScenario, expectedEvent, sameRecord} from './workflow.js';

const degraded = {
  missing:{label:'MISSING', headline:'Reading unavailable'},
  stale:{label:'STALE', headline:'Reading is out of date'},
  suspect:{label:'SUSPECT', headline:'Check the reading source'},
  'device-fault':{label:'DEVICE FAULT', headline:'Device reported a disconnection'},
  'insufficient-history':{label:'INSUFFICIENT HISTORY', headline:'Personal baseline not ready'},
};
const intents = new Map([
  ['astra status', 'status'],
  ['astra explain', 'explain'],
  ['astra check again', 'repeat'],
  ['astra request review', 'request'],
  ['astra confirm save', 'confirm'],
  ['astra cancel', 'cancel'],
  ['astra dismiss', 'dismiss'],
  ['astra repeat that', 'replay'],
]);

/** Exact command matching for a simulated input, not speech recognition. */
export function resolveIntent(text) {
  if (typeof text !== 'string') return null;
  return intents.get(text.trim().toLowerCase()) ?? null;
}

/**
 * A read-only projection for a minimal-attention HUD simulator. A supplied event
 * counts only when its full payload matches the shared workflow and its earlier
 * steps exist. This function neither saves events nor confirms a user action.
 * saved means a valid review request is present, not merely a simulated repeat.
 * action is an intent name: repeat, request, or null.
 */
export function presentHud(scenario, events) {
  if (!Object.hasOwn(scenarios, scenario)) throw new Error('Unknown demo scenario.');
  const data = evaluateScenario(scenario);
  const records = Array.isArray(events) ? events : [];
  const hasRecord = kind => {
    if (!data.canRepeat) return false;
    let expected;
    try { expected = expectedEvent(scenario, kind); }
    catch { return false; }
    return records.some(event => sameRecord(event, expected));
  };
  const performed = hasRecord('repeat');
  const requested = performed && hasRecord('request');
  const closed = requested && hasRecord('close');
  const selectedReading = performed ? data.repeated : data.current;
  const selectedDecision = performed ? data.followUp : data.first;
  const qualityMessage = degraded[selectedDecision.quality];
  // Do not project a stale or unsuitable number as the crew's current health.
  const reading = qualityMessage ? null : selectedReading;
  const decision = qualityMessage ? {...selectedDecision, z:null, level:null} : selectedDecision;
  const confirmed = performed && (decision.level === 'watch' || decision.level === 'alert');
  const canRepeat = !qualityMessage && data.canRepeat && !performed;
  const canRequest = !qualityMessage && confirmed && !requested;
  const action = canRepeat ? 'repeat' : canRequest ? 'request' : null;
  const label = qualityMessage?.label ?? (decision.level ?? decision.quality).toUpperCase();
  const headline = qualityMessage?.headline ?? (closed ? 'Simulated review closed' :
    requested ? 'Review request saved locally' : confirmed ? 'Change confirmed. Review available.' :
    decision.level === 'alert' ? 'Larger change from your usual reading' :
    decision.level === 'watch' ? 'Change from your usual reading' : 'Within your personal band');
  return {
    scenario, reading, decision, history:data.history, performed, requested, closed,
    canRepeat, canRequest, saved:requested, label, headline, action,
  };
}
