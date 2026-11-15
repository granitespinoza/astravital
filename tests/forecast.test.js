// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {forecast, watchRisk, MIN_HISTORY} from '../app/forecast.js';
import {evaluate} from '../scripts/forecast-eval.mjs';

test('forecast declines with too little history', () => {
  const r = forecast([60, 61, 62]);
  assert.equal(r.ready, false); assert.match(r.reason, new RegExp(String(MIN_HISTORY)));
});
test('forecast follows a rising trend and widens its interval with horizon', () => {
  const r = forecast(Array.from({length:20}, (_, i) => 58 + i * 0.5));
  assert.ok(r.ready && r.trendPerSol > 0);
  assert.ok(r.points[0].mean > 66 && r.points[2].mean >= r.points[0].mean);
  assert.ok(r.points[2].high - r.points[2].low > r.points[0].high - r.points[0].low);
});
test('watch risk needs the whole interval beyond the personal WATCH band', () => {
  const steady = forecast([60, 61, 59, 60, 61, 60, 59, 60, 61, 60]);
  assert.equal(watchRisk(steady, {mean:60, sd:1.5}), null);
  const high = forecast([60, 62, 64, 66, 68, 70, 72, 74, 76, 78]);
  assert.ok(watchRisk(high, {mean:60, sd:1.5}).sol >= 1);
});
test('backtest is reproducible and reports the comparison honestly', () => {
  const a = evaluate({crews:30}), b = evaluate({crews:30});
  assert.deepEqual(a, b);
  const last = a.curve.at(-1);
  assert.ok(last.maeForecast < last.maeReferenceMean, 'adapts better than a fixed reference');
  assert.ok(last.intervalCoverage80 > 0.7 && last.intervalCoverage80 < 0.95);
});
