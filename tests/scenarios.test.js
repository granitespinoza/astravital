// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sample, scenarios} from '../app/scenarios.js';
import {decide, policy} from '../app/engine.js';

test('lab extension preserves each crew scenario and its default decision', () => {
  for (const scenario of Object.keys(scenarios)) {
    const crew = sample(scenario), lab = sample(scenario, 28);
    assert.deepEqual(lab.history.slice(-crew.history.length), crew.history, scenario);
    assert.deepEqual(lab.current, crew.current, scenario);
    assert.deepEqual(decide(lab.current, lab.history, lab.now, policy()), decide(crew.current, crew.history, crew.now, policy()), scenario);
  }
});

test('window exploration uses one ordered history without inventing samples for short history', () => {
  const lab = sample('normal', 28);
  for (const window of [7, 14, 28]) {
    const result = decide(lab.current, lab.history, lab.now, policy(window));
    assert.equal(result.baseline.n, window);
    assert.equal(result.quality, 'ok');
  }
  assert.equal(new Set(lab.history.map(row => row.id)).size, 28);
  assert.ok(lab.history.every((row, index) => index === 0 || row.observedAt > lab.history[index - 1].observedAt));
  assert.equal(sample('short', 28).history.length, 3);
});
