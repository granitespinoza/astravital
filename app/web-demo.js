// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// In-browser stand-in for the local server, used only when no ASTRAVITAL server answers (for example on
// GitHub Pages). It runs the SAME dialogue policy as the server (server/assistant.mjs) over states exported
// from the real local database (scripts/export-demo.mjs). Synthetic seed-142 data; nothing leaves the browser.
import {respond} from '../server/assistant.mjs';
import snapshot from './demo-snapshot.json' with {type: 'json'};

const KEY = 'astravital-web-demo-v1';
const clone = value => JSON.parse(JSON.stringify(value));
const fail = (message, extra = {}) => Object.assign(new Error(message), extra);
function load() { try { return JSON.parse(globalThis.localStorage?.getItem(KEY) ?? 'null') ?? {}; } catch { return {}; } }
function save() { try { globalThis.localStorage?.setItem(KEY, JSON.stringify(store)); } catch { /* storage may be unavailable */ } }
let store = {sessions: {}, performed: {}, reviews: {}, ...load()};

const scenarioOf = domain => snapshot.states[domain].base.scenario;
function check(domain, scenario) {
  if (!Object.hasOwn(snapshot.states, domain)) throw fail('Unknown domain.', {status: 400});
  if (scenario !== undefined && scenario !== scenarioOf(domain)) throw fail('Only the default demo scenario is available in the web demo.', {status: 400});
}
function stateFor(domain) {
  const states = snapshot.states[domain];
  if (store.reviews[domain] && states.requested) return {...clone(states.requested), review: clone(store.reviews[domain])};
  if (domain === 'cardiovascular' && store.performed.cardiovascular) return clone(states.performed);
  return clone(states.base);
}

// Same interface and validation as server/database.mjs, for the calls server/assistant.mjs makes.
export const db = {
  getState(domain = 'cardiovascular', scenario) { check(domain, scenario); return stateFor(domain); },
  repeatReading({scenario} = {}) {
    check('cardiovascular', scenario);
    const before = stateFor('cardiovascular');
    if (before.performed) return {saved: true, duplicate: true, state: before};
    if (!['watch', 'alert'].includes(before.decision.level)) throw fail('A valid resting deviation is required before a repeat.', {code: 'repeat-unavailable'});
    store.performed.cardiovascular = true; save();
    return {saved: true, duplicate: false, state: stateFor('cardiovascular')};
  },
  requestReview({domain, scenario, confirmed, requestId} = {}) {
    if (confirmed !== true) throw fail('Explicit independent confirmation is required.', {code: 'confirmation-required'});
    check(domain, scenario);
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(requestId)) throw fail('A stable requestId is required.');
    if (store.reviews[domain]) return {saved: true, duplicate: true, review: clone(store.reviews[domain]), state: stateFor(domain)};
    const state = stateFor(domain);
    const eligible = domain === 'cardiovascular' ? state.performed && ['watch', 'alert'].includes(state.decision.level) : state.decision.comparable && state.decision.significance === 'exceeds-measurement-lsc';
    if (!eligible) throw fail('Current evidence does not support this review workflow.', {code: 'review-unavailable'});
    const review = {...clone(snapshot.reviews[domain]), id: requestId, requestId, delivery: 'local-only (this browser)', createdAt: new Date().toISOString()};
    store.reviews[domain] = review; save();
    return {saved: true, duplicate: false, review: clone(review), state: stateFor(domain)};
  },
  getSession(id) { return store.sessions[id] ? clone(store.sessions[id]) : null; },
  saveSession(id, context) { store.sessions[id] = clone(context); save(); },
};

export async function request(path, {method = 'GET', body} = {}) {
  const url = new URL(path, 'https://web-demo.local');
  switch (`${method.toUpperCase()} ${url.pathname}`) {
    case 'GET /health':
      return {ok: true, profile: 'web-demo', database: {ok: true, storage: 'browser', seed: snapshot.seed, simulated: true, counts: snapshot.evidence.counts}, voice: {ready: false, reason: 'WEB_DEMO'}, tts: {ready: false, reason: 'WEB_DEMO'}, simulatedData: true};
    case 'GET /api/state':
      return db.getState(url.searchParams.get('domain') ?? 'cardiovascular', url.searchParams.get('scenario') ?? undefined);
    case 'GET /api/evidence':
      return clone(snapshot.evidence);
    case 'GET /api/reviews':
      return Object.values(store.reviews).map(clone);
    case 'POST /api/assistant': {
      const input = JSON.parse(body ?? '{}');
      if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 1000) throw fail('Provide a message up to 1000 characters.', {status: 400});
      return respond(db, {text: input.text, sessionId: typeof input.sessionId === 'string' ? input.sessionId : undefined});
    }
    default:
      throw fail('This feature runs in the full local app, not in the web demo.', {status: 404});
  }
}

export function resetWebDemo() { store = {sessions: {}, performed: {}, reviews: {}}; save(); }
