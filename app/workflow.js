// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {decide, policy} from './engine.js';
import {ORIGIN, reading, sample} from './scenarios.js';

const minutes = 60000;

/** One deterministic workflow, shared by the console and HUD simulator. */
export function evaluateScenario(scenario, settings = policy()) {
  const {now, history, current} = sample(scenario);
  const first = decide(current, history, now, settings);
  const value = scenario === 'deviation' ? 73 : 74;
  const repeated = reading('repeat-' + scenario, value, ORIGIN + 7 * minutes);
  const followUp = decide(repeated, history, now, settings, first.baseline);
  const canRepeat = first.level === 'watch' || first.level === 'alert';
  return {history, current, first, repeated, followUp, canRepeat};
}

/** Preserve the version-1 console event contract, including IDs and timestamps. */
export function expectedEvent(scenario, kind, settings = policy()) {
  const data = evaluateScenario(scenario, settings);
  if (!data.canRepeat) throw new Error('This scenario cannot open a review.');
  const base = {id:scenario + ':' + kind, scenario, kind, simulated:true};
  if (kind === 'repeat') return {...base, reading:data.repeated};
  if (data.followUp.level !== 'alert' && data.followUp.level !== 'watch') {
    throw new Error('The repeat did not confirm a deviation.');
  }
  if (kind === 'request') {
    return {
      ...base, crewId:data.repeated.crewId, recordedAt:ORIGIN + 8 * minutes,
      earthLink:'unavailable', readingIds:[data.current.id, data.repeated.id],
      decision:data.followUp, thresholds:{watch:settings.watch, alert:settings.alert},
    };
  }
  if (kind === 'close') return {...base, recordedAt:ORIGIN + 9 * minutes};
  throw new Error('Unknown record type.');
}

/** Compare JSON-shaped records without treating key order as content. */
export function sameRecord(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object' ||
      Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(right);
  return Object.keys(left).length === keys.length &&
    keys.every(key => Object.hasOwn(left, key) && sameRecord(left[key], right[key]));
}
