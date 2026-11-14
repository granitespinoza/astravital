// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// @ts-check

/** @typedef {'ok'|'missing'|'stale'|'suspect'|'device-fault'|'insufficient-history'} Quality */
/** @typedef {'ok'|'watch'|'alert'} Level */
/** @typedef {{id:string, crewId:string, indicator:'heart_rate', value:number|null, unit:'/min', context:'rest'|'activity', observedAt:number, source:string, quality:'ok'|'suspect'|'device-fault', simulated:true}} Reading */
/** @typedef {{window:number, dayMs:number, minSamples:number, staleMs:number, watch:number, alert:number}} Policy */
/** @typedef {{mean:number, sd:number, n:number, window:number, ids:string[]}} Baseline */
/** @typedef {{quality:Quality, baseline:Baseline|null, z:number|null, level:Level|null, rule:string, reason:string, slope:number|null}} Decision */

export const HOUR = 3_600_000;
export const SOL = 88_775_000;
export const RULE = 'Personal resting heart rate z-score v0.1';

/** @param {number} [window] @param {number} [dayMs] @returns {Policy} */
export function policy(window = 14, dayMs = SOL) {
  return { window, dayMs, minSamples: 5, staleMs: 26 * HOUR, watch: 2, alert: 3 };
}

/** @param {Reading} row */
function usable(row) {
  return row.quality === 'ok' && typeof row.value === 'number' &&
    Number.isFinite(row.value) && row.value > 0 && Number.isFinite(row.observedAt);
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
  return variance > 0 ? covariance / variance : null;
}

/**
 * @param {Reading|null} reading
 * @param {Reading[]} history
 * @param {number} now
 * @param {Policy} settings
 * @param {Baseline|null} [frozen] Snapshot for the open episode of this crew member.
 * @returns {Decision}
 */
export function decide(reading, history, now, settings, frozen = null) {
  /** @type {Decision} */
  const result = { quality: 'ok', baseline: null, z: null, level: null, rule: RULE, reason: '', slope: null };
  if (!reading) {
    return { ...result, quality: 'missing', reason: 'No reading for this measurement.' };
  }
  if (reading.quality === 'device-fault') {
    return { ...result, quality: 'device-fault', reason: 'The simulated device reported a disconnection.' };
  }
  if (!usable(reading) || reading.observedAt > now) {
    return { ...result, quality: 'suspect', reason: 'The reading failed a data quality check.' };
  }
  if (now - reading.observedAt > settings.staleMs) {
    return { ...result, quality: 'stale', reason: 'This reading is older than the configured limit.' };
  }
  if (reading.context !== 'rest') {
    return { ...result, reason: 'This activity reading is outside the resting context.' };
  }

  const from = reading.observedAt - settings.window * settings.dayMs;
  const prior = history.filter(row => row.id !== reading.id && row.crewId === reading.crewId &&
    row.indicator === reading.indicator && row.unit === reading.unit && row.context === reading.context &&
    row.observedAt >= from && row.observedAt < reading.observedAt && usable(row))
    .sort((a, b) => a.observedAt - b.observedAt);
  const baseline = frozen ?? profile(prior, settings.window);

  if (baseline.n < settings.minSamples) {
    return { ...result, quality: 'insufficient-history', baseline, reason: 'More valid resting readings are needed.' };
  }
  if (baseline.sd === 0) {
    return { ...result, quality: 'insufficient-history', baseline, reason: 'The baseline has zero variation, so a z-score is undefined.' };
  }

  const z = (Number(reading.value) - baseline.mean) / baseline.sd;
  const magnitude = Math.abs(z);
  /** @type {Level} */
  let level = 'ok';
  if (magnitude >= settings.alert) level = 'alert';
  else if (magnitude >= settings.watch) level = 'watch';

  const slope = trend([...prior.slice(-4), reading], settings.dayMs);
  const reason = level === 'ok' ? 'Within the configured personal band.' :
    'Outside the configured personal band. A repeat reading can help confirm the deviation.';
  return { ...result, baseline, z, level, slope, reason };
}
