// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// @ts-check

/** @typedef {'ok'|'missing'|'stale'|'suspect'|'device-fault'|'insufficient-history'} Quality */
/** @typedef {'ok'|'watch'|'alert'} Level */
/** @typedef {{id:string, crewId:string, indicator:'heart_rate', value:number|null, unit:'/min', context:'rest'|'activity', observedAt:number, source:string, quality:'ok'|'suspect'|'device-fault', simulated:true}} Reading */
/** @typedef {{window:number, dayMs:number, minSamples:number, staleMs:number, watch:number, alert:number}} Policy */
/** @typedef {{mean:number, sd:number, n:number, window:number, ids:string[]}} Baseline */
/** @typedef {{quality:Quality, baseline:Baseline|null, z:number|null, level:Level|null, rule:string, reason:string, slope:number|null}} Decision */
/** @typedef {{id:string, label:string, state:'pass'|'blocked'|'skipped', detail:string}} TraceStage */
/** @typedef {{decision:Decision, stages:TraceStage[], includedIds:string[], excludedCount:number}} DecisionTrace */

export const HOUR = 3_600_000;
export const SOL = 88_775_000;
export const RULE = 'Personal resting heart rate z-score v0.1';

/** @param {number} [window] @param {number} [dayMs] @returns {Policy} */
export function policy(window = 14, dayMs = SOL) {
  return { window, dayMs, minSamples: 5, staleMs: 26 * HOUR, watch: 2, alert: 3 };
}

/** @param {Reading} row */
function usable(row) {
  return row != null && typeof row === 'object' &&
    typeof row.id === 'string' && row.id.length > 0 &&
    typeof row.crewId === 'string' && row.crewId.length > 0 &&
    row.indicator === 'heart_rate' && row.unit === '/min' &&
    (row.context === 'rest' || row.context === 'activity') &&
    typeof row.source === 'string' && row.source.length > 0 && row.simulated === true &&
    row.quality === 'ok' && typeof row.value === 'number' &&
    Number.isFinite(row.value) && row.value > 0 && Number.isFinite(row.observedAt);
}

/** @param {Policy} settings */
function validPolicy(settings) {
  return settings != null && typeof settings === 'object' &&
    Number.isFinite(settings.window) && settings.window > 0 &&
    Number.isFinite(settings.dayMs) && settings.dayMs > 0 &&
    Number.isFinite(settings.window * settings.dayMs) &&
    Number.isInteger(settings.minSamples) && settings.minSamples >= 2 &&
    Number.isFinite(settings.staleMs) && settings.staleMs >= 0 &&
    Number.isFinite(settings.watch) && settings.watch > 0 &&
    Number.isFinite(settings.alert) && settings.alert > settings.watch;
}

/** @param {Baseline} baseline @param {Policy} settings */
function validBaseline(baseline, settings) {
  return baseline != null && typeof baseline === 'object' &&
    Number.isFinite(baseline.mean) &&
    (baseline.n === 0 ? baseline.mean === 0 && baseline.sd === 0 : baseline.mean > 0) &&
    Number.isFinite(baseline.sd) && baseline.sd >= 0 &&
    Number.isInteger(baseline.n) && baseline.n >= 0 &&
    baseline.window === settings.window &&
    Array.isArray(baseline.ids) && baseline.ids.length === baseline.n &&
    baseline.ids.every(id => typeof id === 'string' && id.length > 0) &&
    new Set(baseline.ids).size === baseline.ids.length;
}

/** @param {Reading} left @param {Reading} right */
function sameReading(left, right) {
  return left.crewId === right.crewId && left.indicator === right.indicator &&
    left.unit === right.unit && left.context === right.context &&
    left.observedAt === right.observedAt && left.value === right.value &&
    left.source === right.source && left.quality === right.quality && left.simulated === right.simulated;
}

/** @param {Reading[]} rows @param {Reading} reading @param {number} from */
function priorReadings(rows, reading, from) {
  /** @type {Map<string, Reading|null>} */
  const unique = new Map();
  for (const row of rows) {
    if (!usable(row) || row.id === reading.id || row.crewId !== reading.crewId ||
        row.indicator !== reading.indicator || row.unit !== reading.unit || row.context !== reading.context ||
        row.observedAt < from || row.observedAt >= reading.observedAt) continue;
    if (!unique.has(row.id)) unique.set(row.id, row);
    else {
      const previous = unique.get(row.id);
      // Conflicting copies are quarantined instead of choosing one by input order.
      if (!previous || !sameReading(previous, row)) unique.set(row.id, null);
    }
  }
  return [...unique.values()].filter(/** @returns {row is Reading} */ row => row !== null)
    .sort((a, b) => a.observedAt - b.observedAt);
}

/** @param {Reading[]} rows @param {number} window @returns {Baseline} */
function profile(rows, window) {
  const n = rows.length;
  const mean = n > 0 ? rows.reduce((sum, row) => sum + Number(row.value), 0) / n : 0;
  const sumOfSquares = rows.reduce((sum, row) => sum + (Number(row.value) - mean) ** 2, 0);
  const sd = n > 1 ? Math.sqrt(sumOfSquares / (n - 1)) : 0;
  return { mean, sd, n, window, ids: rows.map(row => row.id) };
}

/** @param {Reading[]} rows @param {number} dayMs */
function trend(rows, dayMs) {
  if (rows.length < 2) return null;
  const elapsed = rows.map(row => (row.observedAt - rows[0].observedAt) / dayMs);
  const xMean = elapsed.reduce((sum, value) => sum + value, 0) / rows.length;
  const yMean = rows.reduce((sum, row) => sum + Number(row.value), 0) / rows.length;
  const covariance = rows.reduce((sum, row, i) =>
    sum + (elapsed[i] - xMean) * (Number(row.value) - yMean), 0);
  const variance = elapsed.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  const slope = variance > 0 ? covariance / variance : null;
  return slope !== null && Number.isFinite(slope) ? slope : null;
}

/**
 * The trace and normal decision use one pipeline. Stage details describe software
 * checks, never medical diagnoses. Included IDs belong to the selected baseline;
 * excludedCount counts history rows not eligible after filtering and deduplication.
 * A frozen snapshot retains its original IDs, even after the rolling window moves.
 *
 * @param {Reading|null} reading
 * @param {Reading[]} history
 * @param {number} now
 * @param {Policy} settings
 * @param {Baseline|null} [frozen] Snapshot for the open episode of this crew member.
 * @returns {DecisionTrace}
 */
export function traceDecision(reading, history, now, settings, frozen = null) {
  /** @type {Decision} */
  const result = { quality: 'ok', baseline: null, z: null, level: null, rule: RULE, reason: '', slope: null };
  /** @type {TraceStage[]} */
  const stages = [
    {id:'ingest', label:'Acquire reading', state:'skipped', detail:'Waiting for a reading.'},
    {id:'quality', label:'Validate data', state:'skipped', detail:'Requires a valid input.'},
    {id:'context', label:'Match resting context', state:'skipped', detail:'Requires suitable data.'},
    {id:'baseline', label:'Build personal baseline', state:'skipped', detail:'Requires a matching resting context.'},
    {id:'deviation', label:'Assess deviation', state:'skipped', detail:'Requires a usable personal baseline.'},
  ];
  /** @type {string[]} */
  let includedIds = [];
  let excludedCount = 0;
  /** @param {number} index @param {TraceStage['state']} state @param {string} detail */
  const mark = (index, state, detail) => Object.assign(stages[index], {state, detail});
  /** @param {Partial<Decision>} changes @returns {DecisionTrace} */
  const finish = changes => ({decision:{...result, ...changes}, stages, includedIds, excludedCount});

  if (!Number.isFinite(now) || !validPolicy(settings) || !Array.isArray(history)) {
    const reason = 'The clock, rule configuration or history input is invalid.';
    mark(0, 'blocked', reason);
    return finish({quality:'suspect', reason});
  }
  if (!reading) {
    const reason = 'No reading for this measurement.';
    mark(0, 'blocked', reason);
    return finish({quality:'missing', reason});
  }
  mark(0, 'pass', 'A simulated reading is available for local processing.');
  if (reading.quality === 'device-fault') {
    const reason = 'The simulated device reported a disconnection.';
    mark(1, 'blocked', reason);
    return finish({quality:'device-fault', reason});
  }
  if (!usable(reading) || reading.observedAt > now) {
    const reason = 'The reading failed a data quality check.';
    mark(1, 'blocked', reason);
    return finish({quality:'suspect', reason});
  }
  if (now - reading.observedAt > settings.staleMs) {
    const reason = 'This reading is older than the configured limit.';
    mark(1, 'blocked', reason);
    return finish({quality:'stale', reason});
  }
  mark(1, 'pass', 'Valid fields, positive finite value and acquisition time within the stale limit.');
  if (reading.context !== 'rest') {
    const reason = 'This activity reading is outside the resting context.';
    mark(2, 'blocked', reason);
    return finish({reason});
  }
  mark(2, 'pass', 'Only earlier valid readings from the same crew member and resting context are eligible.');

  const from = reading.observedAt - settings.window * settings.dayMs;
  const prior = priorReadings(history, reading, from);
  excludedCount = history.length - prior.length;
  const baseline = frozen ?? profile(prior, settings.window);
  if (!validBaseline(baseline, settings)) {
    const reason = 'The baseline statistics, sample IDs or configured window are inconsistent.';
    mark(3, 'blocked', reason);
    return finish({quality:'insufficient-history', reason});
  }
  includedIds = [...baseline.ids];
  if (baseline.n < settings.minSamples) {
    const reason = 'More valid resting readings are needed.';
    mark(3, 'blocked', `${baseline.n} valid readings; at least ${settings.minSamples} required.`);
    return finish({quality:'insufficient-history', baseline, reason});
  }
  if (baseline.sd === 0) {
    const reason = 'The baseline has zero variation, so a z-score is undefined.';
    mark(3, 'blocked', reason);
    return finish({quality:'insufficient-history', baseline, reason});
  }
  mark(3, 'pass', frozen ? `Frozen baseline retained (${baseline.n} readings).` :
    `${baseline.n} unique valid readings in the ${settings.window}-sol window; ${excludedCount} history rows excluded.`);

  const z = (Number(reading.value) - baseline.mean) / baseline.sd;
  if (!Number.isFinite(z)) {
    const reason = 'The deviation calculation exceeded a finite numeric range.';
    mark(4, 'blocked', reason);
    return finish({quality:'suspect', baseline, reason});
  }
  const magnitude = Math.abs(z);
  /** @type {Level} */
  let level = 'ok';
  if (magnitude >= settings.alert) level = 'alert';
  else if (magnitude >= settings.watch) level = 'watch';

  const slope = trend([...prior.slice(-4), reading], settings.dayMs);
  const reason = level === 'ok' ? 'Within the configured personal band.' :
    'Outside the configured personal band. A repeat reading can help confirm the deviation.';
  mark(4, 'pass', `z = ${z.toFixed(2)}; ${level.toUpperCase()} under ${RULE}. Statistical deviation, not a diagnosis.`);
  return finish({baseline, z, level, slope, reason});
}

/**
 * @param {Reading|null} reading
 * @param {Reading[]} history
 * @param {number} now
 * @param {Policy} settings
 * @param {Baseline|null} [frozen]
 * @returns {Decision}
 */
export function decide(reading, history, now, settings, frozen = null) {
  return traceDecision(reading, history, now, settings, frozen).decision;
}
