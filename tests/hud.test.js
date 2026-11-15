// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {decide, policy} from '../app/engine.js';
import {ORIGIN, reading, sample, scenarios} from '../app/scenarios.js';
import {evaluateScenario, expectedEvent, sameRecord} from '../app/workflow.js';
import {presentHud, resolveIntent} from '../app/hud-model.js';

// Recorded from the console implementation before extracting the shared workflow.
const eventHashes = {
  deviation:{repeat:'574f71d1ed6ea22290a5c79d10c44cd8d439722d27f98cb118a65221211823a6',
    request:'77d2775edc8a8dc2321e23c7d25db618f1ae546d1d4f0bb7191a8aa365356638',
    close:'b640e9cbff5865df60f69d9c968933755bb66303dde2a69ef524481b3efcbd37'},
  drift:{repeat:'32920ec6d2ba76d4344145534324454eee3478b5907ebdc0f0959d9b6bafdfe2',
    request:'6dac5e29fffb0f00921a75a0c8aada3c99fa79258c3beb43498fc8f9b344cdcc',
    close:'3dbe2bfaa97a9157e28a127dca8b6ba4972c2f6afbccb11367957382b796e165'},
};

test('shared workflow preserves version-1 console event payloads byte-for-byte', () => {
  for (const [scenario, kinds] of Object.entries(eventHashes)) {
    for (const [kind, hash] of Object.entries(kinds)) {
      const record = expectedEvent(scenario, kind);
      assert.equal(createHash('sha256').update(JSON.stringify(record)).digest('hex'), hash, scenario + ':' + kind);
      assert.equal(record.id, scenario + ':' + kind);
      assert.equal(record.simulated, true);
    }
  }
  assert.throws(() => expectedEvent('normal', 'request'), /cannot open a review/);
  assert.throws(() => expectedEvent('deviation', 'diagnose'), /Unknown record type/);
});

test('console and HUD use the same first and frozen-repeat assessments', () => {
  for (const scenario of Object.keys(scenarios)) {
    for (const settings of [policy(), policy(7)]) {
      const source = sample(scenario);
      const evaluated = evaluateScenario(scenario, settings);
      const first = decide(source.current, source.history, source.now, settings);
      const repeated = reading('repeat-' + scenario, scenario === 'deviation' ? 73 : 74, ORIGIN + 7 * 60000);
      assert.deepEqual(evaluated, {history:source.history, current:source.current, first, repeated,
        followUp:decide(repeated, source.history, source.now, settings, first.baseline),
        canRepeat:first.level === 'watch' || first.level === 'alert'});
    }
    const state = presentHud(scenario, []);
    assert.deepEqual(state.decision, evaluateScenario(scenario).first);
    if (state.decision.quality === 'ok') assert.deepEqual(state.reading, evaluateScenario(scenario).current);
  }
  const repeat = expectedEvent('deviation', 'repeat');
  const state = presentHud('deviation', [repeat]);
  assert.deepEqual(state.decision, evaluateScenario('deviation').followUp);
  assert.deepEqual(state.reading, repeat.reading);
});

test('degraded HUD states hide the current number and never offer a health action', () => {
  for (const [scenario, label] of Object.entries({missing:'MISSING', stale:'STALE', suspect:'SUSPECT',
    fault:'DEVICE FAULT', short:'INSUFFICIENT HISTORY'})) {
    const source = sample(scenario);
    const unchanged = JSON.stringify(source);
    const state = presentHud(scenario, []);
    assert.equal(state.label, label);
    assert.equal(state.reading, null, scenario + ' cannot display a misleading current value');
    assert.equal(state.decision.z, null);
    assert.equal(state.decision.level, null);
    assert.equal(state.canRepeat, false);
    assert.equal(state.canRequest, false);
    assert.equal(state.action, null);
    assert.equal(state.saved, false);
    assert.equal(JSON.stringify(source), unchanged);
  }
});

test('HUD offers repeat then review and claims saved only after a persisted request', () => {
  const repeat = expectedEvent('deviation', 'repeat');
  const request = expectedEvent('deviation', 'request');
  const close = expectedEvent('deviation', 'close');
  const initial = presentHud('deviation', []);
  assert.equal(initial.action, 'repeat');
  assert.equal(initial.canRepeat, true);
  assert.equal(initial.canRequest, false);
  assert.equal(initial.saved, false);
  const repeated = presentHud('deviation', [repeat]);
  assert.equal(repeated.action, 'request');
  assert.equal(repeated.canRepeat, false);
  assert.equal(repeated.canRequest, true);
  assert.equal(repeated.saved, false);
  const requested = presentHud('deviation', [repeat, request]);
  assert.equal(requested.action, null);
  assert.equal(requested.requested, true);
  assert.equal(requested.saved, true);
  const closed = presentHud('deviation', [repeat, request, close]);
  assert.equal(closed.closed, true);
  assert.equal(closed.saved, true);
  assert.equal(closed.action, null);
  assert.equal(presentHud('deviation', [request, close]).saved, false, 'Orphan records cannot claim a saved review');
  assert.equal(presentHud('deviation', [repeat, close]).closed, false, 'Closing requires a valid request');
  assert.equal(presentHud('normal', []).action, null);
});

test('HUD ignores altered or unrelated events and leaves inputs unchanged', () => {
  const repeat = expectedEvent('deviation', 'repeat');
  const request = expectedEvent('deviation', 'request');
  const events = [repeat, {...request, recordedAt:0}, expectedEvent('drift', 'request')];
  const before = JSON.stringify(events);
  const state = presentHud('deviation', events);
  assert.equal(state.performed, true);
  assert.equal(state.requested, false);
  assert.equal(state.saved, false);
  assert.equal(JSON.stringify(events), before);
  const reordered = Object.fromEntries(Object.entries(request).reverse());
  assert.ok(sameRecord(request, reordered));
  assert.equal(presentHud('deviation', [repeat, reordered]).saved, true, 'JSON key order does not invalidate an otherwise identical export');
  assert.equal(presentHud('deviation', [{...repeat, reading:{...repeat.reading, value:999}}]).performed, false);
  assert.equal(presentHud('deviation', null).saved, false);
  assert.throws(() => presentHud('unknown', []), /Unknown demo scenario/);
});

test('simulated intent matching accepts only complete whitelisted commands', () => {
  for (const [text, intent] of Object.entries({'astra status':'status', 'astra explain':'explain',
    'astra check again':'repeat', 'astra request review':'request', 'astra confirm save':'confirm',
    'astra cancel':'cancel', 'astra dismiss':'dismiss', 'astra repeat that':'replay'})) {
    assert.equal(resolveIntent(text), intent);
    assert.equal(resolveIntent('  ' + text.toUpperCase() + '  '), intent);
  }
  for (const unknown of ['astra', 'confirm save', 'astra confirm', 'astra confirm save now',
    'please astra confirm save', 'astra confirm save and request review', 'astra confirm save.',
    'astra  confirm save', '', null, 5, {}]) {
    assert.equal(resolveIntent(unknown), null, String(unknown));
  }
});
