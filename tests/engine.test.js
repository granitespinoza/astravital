// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.

import assert from 'node:assert/strict';
import test from 'node:test';
import { decide, traceDecision, HOUR, policy, RULE, SOL } from '../app/engine.js';
import { ORIGIN, reading, sample, seeded } from '../app/scenarios.js';

const settings = policy();

function at(value, day, id = String(day)) {
  return reading(id, value, ORIGIN + day * SOL);
}

test('baseline uses only prior, valid readings for the same crew member and context', () => {
  const current = at(72, 0);
  const history = [58, 59, 60, 61, 62].map((value, index) => at(value, index - 5));
  const exclusions = [
    at(90, -15),
    at(80, 0, 'same-time'),
    at(80, 1),
    { ...at(80, -4, 'activity'), context: 'activity' },
    { ...at(80, -4, 'other-crew'), crewId: 'crew-04' },
    { ...at(80, -4, 'suspect'), quality: 'suspect' },
    at(0, -3, 'non-positive'),
    { ...at(80, -3, 'bad-time'), observedAt: NaN },
  ];
  const decision = decide(current, [current, ...exclusions, ...history.toReversed()], ORIGIN, settings);
  assert.equal(decision.baseline.n, 5);
  assert.equal(decision.baseline.mean, 60);
  assert.equal(decision.baseline.sd, Math.sqrt(2.5));
  assert.deepEqual(decision.baseline.ids, history.map(row => row.id));
  assert.equal(decision.rule, RULE);
  assert.equal(decision.level, 'alert');
  assert.equal(decide({ ...current, context: 'activity' }, history, ORIGIN, settings).level, null);
});

test('lower window boundary is inclusive and the current measurement is exclusive', () => {
  const current = at(63, 0);
  const history = [...Array(29).keys()].map(index => at(58 + index % 5, index - 29));
  for (const window of [7, 14, 28]) {
    const decision = decide(current, history, ORIGIN, policy(window));
    assert.equal(decision.baseline.n, window);
    assert.equal(decision.baseline.ids[0], String(-window));
    assert.equal(decision.baseline.ids.at(-1), '-1');
  }
});

test('WATCH and ALERT apply at exact positive and negative z-score boundaries', () => {
  const baseline = { mean: 60, sd: 2, n: 5, window: 14, ids: ['b1','b2','b3','b4','b5'] };
  const cases = [[53, 'alert'], [54, 'alert'], [55, 'watch'], [56, 'watch'], [57, 'ok'],
    [63, 'ok'], [64, 'watch'], [65, 'watch'], [66, 'alert'], [67, 'alert']];
  for (const [value, expected] of cases) {
    const decision = decide(at(value, 0), [], ORIGIN, settings, baseline);
    assert.equal(decision.z, (value - 60) / 2);
    assert.equal(decision.level, expected);
    assert.equal(decision.slope, null);
  }
});

test('zero-variance history yields no z-score or alert', () => {
  const current = at(72, 0);
  const history = [-5, -4, -3, -2, -1].map(day => at(60, day));
  const decision = decide(current, history, ORIGIN, settings);
  assert.equal(decision.quality, 'insufficient-history');
  assert.equal(decision.baseline.sd, 0);
  assert.equal(decision.z, null);
  assert.equal(decision.level, null);
  assert.match(decision.reason, /zero variation/);
});

test('S4 and S5: sensor fault, suspect signal, missing and stale have distinct outcomes', () => {
  const cases = {
    fault: 'device-fault',
    suspect: 'suspect',
    missing: 'missing',
    stale: 'stale',
    short: 'insufficient-history',
  };
  for (const [scenario, quality] of Object.entries(cases)) {
    const { now, history, current } = sample(scenario);
    const decision = decide(current, history, now, settings);
    assert.equal(decision.quality, quality);
    assert.equal(decision.z, null);
    assert.equal(decision.level, null);
  }
  const { history, current } = sample('normal');
  assert.equal(decide(current, history, ORIGIN + 26 * HOUR, settings).quality, 'ok');
  assert.equal(decide(current, history, ORIGIN + 26 * HOUR + 1, settings).quality, 'stale');
  assert.equal(decide(at(Infinity, 0), history, ORIGIN, settings).quality, 'suspect');
  assert.equal(decide(at(60, 1), history, ORIGIN, settings).quality, 'suspect');

  for (const day of [1, 2, 3]) {
    assert.equal(decide(null, history, ORIGIN + day * SOL, settings).quality, 'missing');
  }
  const recovered = at(61, 4);
  const decision = decide(recovered, [...history, current], recovered.observedAt, settings);
  assert.equal(decision.quality, 'ok');
  assert.equal(decision.level, 'ok');
});

test('frozen episode keeps the same baseline when shifted readings fill the rolling window', () => {
  const { now, history, current } = sample('drift');
  const initial = decide(current, history, now, settings);
  assert.equal(initial.level, 'alert');
  const shifted = Array.from({ length: 14 }, (_, index) => at(72 + index % 3, index + 1));
  const followUp = at(73, 15);
  const allRows = [...history, current, ...shifted];
  const adaptive = decide(followUp, allRows, followUp.observedAt, settings);
  const frozen = decide(followUp, allRows, followUp.observedAt, settings, initial.baseline);
  assert.equal(adaptive.level, 'ok');
  assert.equal(frozen.level, 'alert');
  assert.deepEqual(frozen.baseline, initial.baseline);
});

test('trend describes the least-squares slope per sol across up to five recent points', () => {
  const history = [50, 51.5, 53, 54.5, 56, 57.5].map((value, index) => at(value, index - 6));
  const decision = decide(at(59, 0), history, ORIGIN, settings);
  assert.equal(decision.slope, 1.5);
});

test('all dashboard fixture readings identify the simulated source and use the canonical unit', () => {
  for (const name of ['normal', 'deviation', 'drift', 'stale', 'missing', 'suspect', 'fault', 'short']) {
    const { current, history } = sample(name);
    for (const row of current ? [...history, current] : history) {
      assert.equal(row.simulated, true);
      assert.equal(row.indicator, 'heart_rate');
      assert.equal(row.unit, '/min');
      assert.equal(row.context, 'rest');
      assert.ok(row.source);
      assert.ok(Number.isFinite(row.observedAt));
    }
  }
  assert.deepEqual(sample('deviation'), sample('deviation'));
  const { now, history, current } = sample('deviation');
  assert.equal(decide(current, history, now, settings).level, 'watch');
});

const FIRST_EVENT_SOL = 21;

function replay(window, duration, offset) {
  const random = seeded(142);
  const history = [];
  let baseline = null;
  let watchSols = 0;
  let alertSols = 0;
  let firstFlag = null;
  let eventFlags = 0;

  for (let sol = -27; sol <= 60; sol++) {
    const eventAge = sol - FIRST_EVENT_SOL;
    const injected = eventAge >= 0 && eventAge < duration;
    const value = Math.round(57 + random() * 8) + (injected ? offset(eventAge) : 0);
    const row = at(value, sol);
    if (sol > 0) {
      if (!injected) baseline = null;
      const decision = decide(row, history, row.observedAt, policy(window), baseline);
      const flag = decision.level === 'watch' || decision.level === 'alert';
      // Test controlled noise separately from the injected event. Preserve the
      // first flagged baseline through the remainder of that event.
      if (injected && flag) {
        baseline ??= decision.baseline;
        firstFlag ??= eventAge;
        eventFlags++;
      }
      if (duration === 0) {
        if (decision.level === 'watch') watchSols++;
        if (decision.level === 'alert') alertSols++;
      }
    }
    history.push(row);
  }
  return { watchSols, alertSols, firstFlag, eventFlags };
}

test('S1–S3: evaluate the same seeded replays with 7, 14 and 28-sol windows', context => {
  for (const window of [7, 14, 28]) {
    const normal = replay(window, 0, () => 0);
    const drift = replay(window, 10, age => (age + 1) * 1.5);
    const acute = replay(window, 1, () => 20);
    const falseFlags = normal.watchSols + normal.alertSols;
    assert.equal(normal.firstFlag, null);
    assert.ok(drift.eventFlags > 0, 'the gradual event has at least one flag');
    assert.equal(acute.firstFlag, 0);
    context.diagnostic(JSON.stringify({
      window,
      falseFlags,
      falseFlagsPerCrewSol: falseFlags / 60,
      watchSols: normal.watchSols,
      alertSols: normal.alertSols,
      driftDelaySols: drift.firstFlag,
      driftFlaggedSols: drift.eventFlags,
      acuteDelaySols: acute.firstFlag,
      missedEvents: Number(drift.firstFlag === null) + Number(acute.firstFlag === null),
    }));
  }
});


test('invalid clock and rule configuration block assessment without a z-score', () => {
  const {current, history, now} = sample('deviation');
  const invalid = [
    {...settings, window:0}, {...settings, window:Infinity}, {...settings, dayMs:NaN},
    {...settings, minSamples:1}, {...settings, staleMs:-1},
    {...settings, watch:0}, {...settings, alert:settings.watch},
  ];
  for (const config of invalid) {
    const trace = traceDecision(current, history, now, config);
    assert.equal(trace.decision.quality, 'suspect');
    assert.equal(trace.decision.z, null);
    assert.equal(trace.decision.level, null);
    assert.equal(trace.stages[0].state, 'blocked');
    assert.ok(trace.stages.slice(1).every(stage => stage.state === 'skipped'));
  }
  for (const clock of [NaN, Infinity, -Infinity]) {
    assert.equal(decide(current, history, clock, settings).quality, 'suspect');
  }
  assert.equal(decide(current, null, now, settings).quality, 'suspect');
});

test('duplicate history IDs cannot inflate baseline and conflicting copies are excluded', () => {
  const current = at(72, 0);
  const history = [58, 59, 60, 61, 62].map((value,index) => at(value,index-5));
  const clean = decide(current, history, ORIGIN, settings);
  const duplicated = traceDecision(current, [...history, ...history.map(row => ({...row}))], ORIGIN, settings);
  assert.deepEqual(duplicated.decision, clean);
  assert.equal(duplicated.excludedCount, history.length);
  assert.deepEqual(duplicated.includedIds, history.map(row => row.id));
  const conflict = {...history[0], value:90};
  for (const rows of [[...history, conflict], [conflict, ...history]]) {
    const decision = decide(current, rows, ORIGIN, settings);
    assert.equal(decision.baseline.n, 4);
    assert.equal(decision.quality, 'insufficient-history');
    assert.equal(decision.level, null);
    assert.ok(!decision.baseline.ids.includes(history[0].id));
  }
});

test('malformed history rows are excluded and malformed current fields never assess as OK', () => {
  const {current, history, now} = sample('normal');
  const decision = decide(current, [...history, null, undefined, {}, 3, {...history[0], id:''}], now, settings);
  assert.deepEqual(decision, decide(current, history, now, settings));
  for (const change of [{id:''}, {crewId:''}, {source:''}, {unit:'bpm'}, {indicator:'skin_temperature'},
    {observedAt:NaN}, {simulated:false}, {value:'61'}]) {
    const invalid = decide({...current, ...change}, history, now, settings);
    assert.equal(invalid.quality, 'suspect');
    assert.equal(invalid.z, null);
    assert.equal(invalid.level, null);
  }
});

test('invalid frozen statistics and numeric overflow cannot create a false OK or ALERT', () => {
  const {current, history, now} = sample('deviation');
  const baseline = decide(current, history, now, settings).baseline;
  for (const change of [{mean:NaN}, {mean:Infinity}, {sd:-1}, {sd:Infinity}, {n:1.5}, {ids:['a','a']},
    {n:100, ids:[]}, {n:100}, {ids:[]}, {window:7}]) {
    const invalid = traceDecision(current, history, now, settings, {...baseline, ...change});
    assert.equal(invalid.decision.quality, 'insufficient-history');
    assert.equal(invalid.decision.z, null);
    assert.equal(invalid.decision.level, null);
    assert.equal(invalid.stages[3].state, 'blocked');
    assert.equal(invalid.stages[4].state, 'skipped');
  }
  const overflow = decide(at(72,0), [-5,-4,-3,-2,-1].map(day => at(1e308,day)), ORIGIN, settings);
  assert.equal(overflow.quality, 'insufficient-history');
  assert.equal(overflow.level, null);
});

test('trace exposes the same decision and ordered quality-first flow without changing the decision shape', () => {
  const {current,history,now} = sample('deviation');
  const trace = traceDecision(current,history,now,settings);
  assert.deepEqual(trace.decision,decide(current,history,now,settings));
  assert.deepEqual(trace.stages.map(stage => stage.id), ['ingest','quality','context','baseline','deviation']);
  assert.ok(trace.stages.every(stage => stage.state === 'pass'));
  assert.equal(trace.includedIds.length, trace.decision.baseline.n);
  assert.deepEqual(Object.keys(trace.decision).sort(), ['baseline','level','quality','reason','rule','slope','z']);
  for (const scenario of ['fault','stale','suspect']) {
    const source = sample(scenario);
    const blocked = traceDecision(source.current,source.history,source.now,settings);
    assert.equal(blocked.stages[0].state,'pass');
    assert.equal(blocked.stages[1].state,'blocked');
    assert.ok(blocked.stages.slice(2).every(stage => stage.state === 'skipped'));
    assert.equal(blocked.decision.level,null);
  }
  const frozen = traceDecision(current,history,now,settings,trace.decision.baseline);
  assert.deepEqual(frozen.decision,trace.decision);
  assert.match(frozen.stages[3].detail,/Frozen/);
});


test('empty eligible history retains its empty baseline and asks for more history', () => {
  const current = at(72,0);
  const trace = traceDecision(current,[],ORIGIN,settings);
  assert.equal(trace.decision.quality,'insufficient-history');
  assert.match(trace.decision.reason,/More valid resting readings/);
  assert.deepEqual(trace.decision.baseline,{mean:0,sd:0,n:0,window:14,ids:[]});
  assert.equal(trace.decision.z,null);
  assert.equal(trace.decision.level,null);
  assert.equal(trace.stages[3].state,'blocked');
  assert.match(trace.stages[3].detail,/0 valid readings/);
  assert.equal(trace.stages[4].state,'skipped');
});
