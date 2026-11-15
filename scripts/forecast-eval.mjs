// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// Time-ordered backtest of the experimental forecast on synthetic crews (seeded, reproducible).
// Each sol, the model sees only earlier sols and predicts the next one. Compared with the naive
// "last value" and the personal-reference mean. Prints a learning curve (error vs history length).
import {pathToFileURL} from 'node:url';
import {seeded} from '../app/scenarios.js';
import {forecast, watchRisk} from '../app/forecast.js';

export function synthCrew(seed, sols = 180) {
  const r = seeded(seed), gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const base = 55 + r() * 12, kind = ['steady', 'drift', 'event'][seed % 3];
  const driftStart = 60 + Math.floor(r() * 60), eventAt = 40 + Math.floor(r() * 120);
  let ar = 0;
  return {kind, driftStart, values:Array.from({length:sols}, (_, t) => {
    ar = 0.6 * ar + gauss() * 1.6;
    let v = base + ar + 1.2 * Math.sin(t / 9);
    if (kind === 'drift' && t >= driftStart) v += 0.12 * (t - driftStart);
    if (kind === 'event' && t >= eventAt && t < eventAt + 3) v += 9;
    return Math.round(v);
  })};
}

export function evaluate({crews = 200, sols = 180, checkpoints = [14, 30, 60, 90, 179]} = {}) {
  const err = {holt:{}, naive:{}, mean:{}}, cover = {}, count = {};
  let leads = [], falseAlarms = 0, crewDays = 0;
  for (let c = 0; c < crews; c++) {
    const {kind, driftStart, values} = synthCrew(1000 + c, sols);
    const ref = values.slice(0, 14), mu = ref.reduce((a, b) => a + b) / 14;
    const sd = Math.sqrt(ref.reduce((a, b) => a + (b - mu) ** 2, 0) / 13) || 1;
    let warned = null, ruleHit = null;
    for (let t = 14; t < sols; t++) {
      const f = forecast(values.slice(0, t), {horizon:3});
      const bucket = checkpoints.find(k => t <= k) ?? checkpoints.at(-1);
      const y = values[t], p = f.points[0];
      for (const [k, v] of [['holt', p.mean], ['naive', values[t - 1]], ['mean', mu]]) err[k][bucket] = (err[k][bucket] ?? 0) + Math.abs(y - v);
      cover[bucket] = (cover[bucket] ?? 0) + (y >= p.low && y <= p.high ? 1 : 0);
      count[bucket] = (count[bucket] ?? 0) + 1;
      const risk = watchRisk(f, {mean:mu, sd});
      if (kind === 'steady') { crewDays++; if (risk) falseAlarms++; }
      if (kind === 'drift' && t >= driftStart) {
        if (risk && warned == null) warned = t;
        if (ruleHit == null && Math.abs((y - mu) / sd) >= 2 && Math.abs((values[t - 1] - mu) / sd) >= 2) ruleHit = t;
      }
    }
    if (kind === 'drift' && warned != null && ruleHit != null) leads.push(ruleHit - warned);
  }
  const curve = checkpoints.map(k => ({upToSol:k, n:count[k], maeForecast:+(err.holt[k] / count[k]).toFixed(2),
    maeLastValue:+(err.naive[k] / count[k]).toFixed(2), maeReferenceMean:+(err.mean[k] / count[k]).toFixed(2),
    intervalCoverage80:+(cover[k] / count[k]).toFixed(2)}));
  const sorted = leads.sort((a, b) => a - b);
  return {crews, sols, curve, driftLeadSolsMedian:sorted[Math.floor(sorted.length / 2)] ?? null,
    driftCrewsCompared:sorted.length, falseWatchForecastsPerCrewDay:+(falseAlarms / crewDays).toFixed(3)};
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(evaluate(), null, 2));
