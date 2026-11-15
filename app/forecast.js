// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// Experimental trend forecast for resting heart rate (Gold consumer, read-only).
// Damped-trend Holt exponential smoothing: it updates level and trend with every new sol,
// so the estimate adapts to the person's own record. Not a diagnosis; evaluated only on synthetic data.
export const FORECAST_MODEL = 'Holt trend forecast v0.1 (experimental)';
export const MIN_HISTORY = 7;

export function holt(values, {alpha = 0.5, beta = 0.03, phi = 0.9} = {}) {
  if (values.length < 2) return null;
  let level = values[0], trend = 0;
  const residuals = [];
  for (let i = 1; i < values.length; i++) {
    const predicted = level + phi * trend;
    residuals.push(values[i] - predicted);
    const previous = level;
    level = alpha * values[i] + (1 - alpha) * (level + phi * trend);
    trend = beta * (level - previous) + (1 - beta) * phi * trend;
  }
  const used = residuals.slice(1);
  const sd = Math.sqrt(used.reduce((s, r) => s + r * r, 0) / Math.max(1, used.length));
  return {level, trend, sd, phi};
}

// Forecast `horizon` sols ahead with an approximate 80% interval (±1.28 sd, widened with horizon).
export function forecast(values, {horizon = 3, ...options} = {}) {
  const clean = values.filter(Number.isFinite);
  if (clean.length < MIN_HISTORY) return {model:FORECAST_MODEL, ready:false, n:clean.length,
    reason:`Needs at least ${MIN_HISTORY} usable sols; has ${clean.length}.`};
  const fit = holt(clean, options);
  const points = Array.from({length:horizon}, (_, k) => {
    const h = k + 1, damp = Array.from({length:h}, (_, i) => fit.phi ** (i + 1)).reduce((a, b) => a + b),
      mean = fit.level + damp * fit.trend, half = 1.28 * fit.sd * Math.sqrt(h);
    return {h, mean, low:mean - half, high:mean + half};
  });
  return {model:FORECAST_MODEL, ready:true, n:clean.length, trendPerSol:fit.trend, points, simulated:true};
}

// Would the forecast reach the WATCH band (|z| >= watch) of the frozen personal reference?
export function watchRisk(result, baseline, watch = 2) {
  if (!result.ready || !baseline?.sd) return null;
  // Warn only when the whole 80% interval of a forecast sol sits beyond the WATCH band.
  const hit = result.points.find(p => Math.min(Math.abs((p.low - baseline.mean) / baseline.sd), Math.abs((p.high - baseline.mean) / baseline.sd)) >= watch && Math.sign(p.low - baseline.mean) === Math.sign(p.high - baseline.mean));
  return hit ? {sol:hit.h, mean:hit.mean} : null;
}
