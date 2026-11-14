// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// @ts-check
import {SOL, HOUR} from './engine.js';

/** @typedef {import('./engine.js').Reading} Reading */
export const ORIGIN = Date.UTC(2026, 10, 14, 7, 5);
export const scenarios = {
  deviation:'Resting deviation', normal:'Stable readings', drift:'Gradual drift',
  missing:'Missing reading', stale:'Stale reading', suspect:'Suspect signal',
  fault:'Device disconnected', short:'Insufficient history',
};

/** @param {number} seed */
export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** @param {string} id @param {number|null} value @param {number} observedAt
 * @param {Reading['quality']} [quality] @returns {Reading} */
export function reading(id, value, observedAt, quality = 'ok') {
  return {id, crewId:'crew-03', indicator:'heart_rate', value, unit:'/min', context:'rest',
    observedAt, source:'Demo heart rate sensor', quality, simulated:true};
}

/** @param {string} scenario */
export function sample(scenario) {
  const random = seeded(142);
  const now = ORIGIN + 7 * 60000;
  const at = scenario === 'stale' ? ORIGIN - 27 * HOUR : ORIGIN;
  const history = Array.from({length:scenario === 'short' ? 3 : 14}, (_, index) => {
    const day = index - (scenario === 'short' ? 3 : 14);
    const drift = scenario === 'drift' ? Math.max(0, day + 6) * 1.5 : 0;
    return reading('history-' + day, Math.round(57 + random() * 8 + drift), at + day * SOL);
  });
  const current = scenario === 'missing' ? null :
    scenario === 'fault' ? reading('current', null, at, 'device-fault') :
    scenario === 'suspect' ? reading('current', 61, at, 'suspect') :
    reading('current', scenario === 'deviation' ? 68 : scenario === 'drift' ? 73 : 61, at);
  return {now, history, current};
}
