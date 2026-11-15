// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// HTTP integration tests use isolated SQLite files and ephemeral loopback ports.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startApplication} from '../server/http.mjs';

async function application(t) {
  const directory = await mkdtemp(join(tmpdir(), 'astravital-api-'));
  const dbPath = join(directory, 'demo.sqlite');
  let server;
  const api = {
    origin: '',
    async start() {
      server = await startApplication({port: 0, host: '127.0.0.1', dbPath});
      api.origin = 'http://127.0.0.1:' + server.address().port;
    },
    async stop() {
      if (!server) return;
      const previous = server;
      server = undefined;
      await new Promise((resolve, reject) => {
        previous.close(error => error ? reject(error) : resolve());
        previous.closeAllConnections();
      });
    },
    async request(path, options = {}) {
      const response = await fetch(api.origin + path, options);
      return {status: response.status, headers: response.headers, data: await response.json()};
    },
    post(path, input, headers = {}) {
      return api.request(path, {
        method: 'POST', headers: {'Content-Type': 'application/json', ...headers},
        body: JSON.stringify(input),
      });
    },
    async turn(text, sessionId) {
      const result = await api.post('/api/assistant', {text, ...(sessionId ? {sessionId} : {})});
      assert.equal(result.status, 200);
      return result.data;
    },
  };
  t.after(async () => {
    await api.stop();
    await rm(directory, {recursive: true, force: true});
  });
  await api.start();
  return api;
}

test('HTTP health and domain states expose seeded evidence with valid layer lineage', async t => {
  const api = await application(t);
  const health = await api.request('/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.ok, true);
  assert.equal(health.data.profile, 'local');
  assert.equal(health.data.simulatedData, true);
  assert.equal(health.data.database.storage, 'sqlite');
  assert.equal(health.data.database.seed, 142);
  assert.equal(typeof health.data.voice.ready, 'boolean', 'Health reports capability, not assumed voice availability');
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');

  const evidence = await api.request('/api/evidence');
  assert.equal(evidence.status, 200);
  assert.equal(evidence.data.seed, 142);
  const {bronze, silver, gold, quarantine, counts} = evidence.data;
  assert.equal(counts.bronze, bronze.length);
  assert.equal(counts.silver, silver.length);
  assert.equal(counts.gold, gold.length);
  assert.equal(counts.quarantine, quarantine.length);
  assert.ok(quarantine.length > 0, 'The demonstration retains at least one rejected observation');
  const originalIds = new Set(bronze.map(row => row.id));
  const validatedIds = new Set(silver.map(row => row.id));
  assert.ok(silver.every(row => originalIds.has(row.bronzeId)));
  for (const rejected of quarantine) {
    assert.ok(originalIds.has(rejected.bronzeId));
    assert.ok(rejected.reasons.length > 0);
    assert.ok(!silver.some(row => row.bronzeId === rejected.bronzeId));
  }
  for (const domain of ['cardiovascular', 'bone']) {
    const result = await api.request('/api/state?domain=' + domain);
    assert.equal(result.status, 200);
    assert.equal(result.data.domain, domain);
    assert.equal(result.data.simulated, true);
    assert.ok(result.data.evidenceIds.length > 0);
    assert.ok(result.data.evidenceIds.every(id => validatedIds.has(id)));
    assert.ok(gold.some(row => row.id === result.data.id));
  }
  const mismatch = await api.request('/api/state?domain=bone&scenario=mismatch');
  assert.equal(mismatch.status, 200);
  assert.equal(mismatch.data.decision.comparable, false);
  const missing = await api.request('/api/state?domain=cardiovascular&scenario=missing');
  assert.equal(missing.status, 200);
  assert.equal(missing.data.quality, 'missing');
  assert.equal(missing.data.reading, null);
});

test('HTTP rejects malformed, oversized and unsupported requests without creating reviews', async t => {
  const api = await application(t);
  for (const raw of ['{', 'null', '[]', '{}', '{"text":23}', '{"text":"   "}']) {
    const result = await api.request('/api/assistant', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: raw,
    });
    assert.equal(result.status, 400, 'Invalid assistant body: ' + raw);
    assert.equal(typeof result.data.error, 'string');
  }
  assert.equal((await api.post('/api/assistant', {text: 'x'.repeat(1001)})).status, 400);
  assert.equal((await api.post('/api/assistant', {text: 'x'.repeat(17000)})).status, 413);
  for (const path of ['/api/state?domain=unknown', '/api/state?domain=bone&scenario=unknown']) {
    assert.equal((await api.request(path)).status, 400);
  }
  assert.equal((await api.request('/api/not-a-route')).status, 404);
  assert.equal((await api.post('/api/seed', {})).status, 404, 'No public reseeding route');
  assert.deepEqual((await api.request('/api/reviews')).data, []);
});

test('cross-origin writes are blocked while exact same-origin requests work', async t => {
  const api = await application(t);
  const input = {domain: 'bone', scenario: 'change', confirmed: true, requestId: 'origin-review'};
  const foreign = await api.post('/api/reviews', input, {Origin: 'http://untrusted.example'});
  assert.equal(foreign.status, 403);
  assert.deepEqual((await api.request('/api/reviews')).data, []);
  const wrongScheme = await api.post('/api/reviews', input, {Origin: api.origin.replace('http:', 'https:')});
  assert.equal(wrongScheme.status, 403);
  assert.deepEqual((await api.request('/api/reviews')).data, []);
  const accepted = await api.post('/api/reviews', input, {Origin: api.origin});
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.saved, true);
  assert.equal(accepted.data.review.delivery, 'local-only');
  assert.equal((await api.request('/api/reviews')).data.length, 1);
});

test('HTTP conversation preserves context and never saves from ambiguous, combined or cancelled confirmation', async t => {
  const api = await application(t);
  let reply = await api.turn('¿Cómo está mi corazón?');
  const sessionId = reply.sessionId;
  assert.equal(reply.domain, 'cardiovascular');
  reply = await api.turn('¿Y mis huesos?', sessionId);
  assert.equal(reply.domain, 'bone');
  reply = await api.turn('¿Por qué?', sessionId);
  assert.equal(reply.action, 'explain');
  assert.equal(reply.domain, 'bone');
  assert.ok(reply.evidenceIds.length > 0);
  reply = await api.turn('Solicitar revisión y confirmo', sessionId);
  assert.equal(reply.action, 'review-confirmation-required');
  assert.ok(reply.pending?.requestId);
  assert.deepEqual((await api.request('/api/reviews')).data, []);
  reply = await api.turn('sí, pero quizá después', sessionId);
  assert.notEqual(reply.action, 'review-saved');
  assert.deepEqual((await api.request('/api/reviews')).data, []);
  const otherSession = await api.turn('Confirmar');
  assert.equal(otherSession.action, 'confirmation-unavailable', 'Confirmation cannot borrow another session\'s pending action');
  reply = await api.turn('Cancelar', sessionId);
  assert.equal(reply.action, 'review-cancelled');
  assert.equal(reply.pending, null);
  reply = await api.turn('Confirmar', sessionId);
  assert.equal(reply.action, 'confirmation-unavailable');
  reply = await api.turn('Solicitar revisión', sessionId);
  assert.ok(reply.pending);
  reply = await api.turn('Estado del corazón', sessionId);
  assert.equal(reply.domain, 'cardiovascular');
  assert.equal(reply.pending, null, 'Changing domain invalidates the pending review');
  reply = await api.turn('Confirmar', sessionId);
  assert.equal(reply.action, 'confirmation-unavailable');
  assert.deepEqual((await api.request('/api/reviews')).data, []);
});

test('review endpoint requires true confirmation and eligible evidence, and rejects ID reuse across episodes', async t => {
  const api = await application(t);
  for (const confirmed of [false, 'true', 1, null]) {
    const result = await api.post('/api/reviews', {domain: 'bone', confirmed, requestId: 'invalid-confirmation'});
    assert.equal(result.status, 400);
  }
  assert.equal((await api.post('/api/reviews', {domain: 'bone', confirmed: true})).status, 400);
  assert.equal((await api.post('/api/reviews', {domain: 'cardiovascular', confirmed: true, requestId: 'premature-heart'})).status, 400);
  assert.equal((await api.post('/api/reviews', {domain: 'bone', scenario: 'mismatch', confirmed: true, requestId: 'incompatible-bone'})).status, 400);
  assert.deepEqual((await api.request('/api/reviews')).data, []);

  const input = {domain: 'bone', scenario: 'change', confirmed: true, requestId: 'shared-request-id'};
  const first = await api.post('/api/reviews', input);
  assert.equal(first.status, 200);
  assert.equal(first.data.duplicate, false);
  assert.equal((await api.post('/api/reviews', input)).data.duplicate, true);
  await api.turn('Repetir lectura');
  const conflict = await api.post('/api/reviews', {...input, domain: 'cardiovascular', scenario: 'deviation'});
  assert.equal(conflict.status, 400);
  assert.equal((await api.request('/api/reviews')).data.length, 1);
});

test('confirmed HTTP review and its frozen cardiac evidence survive server restart without duplicate seed or save', async t => {
  const api = await application(t);
  let reply = await api.turn('Estado del corazón');
  const sessionId = reply.sessionId;
  const baseline = reply.state.decision.baseline;
  reply = await api.turn('Solicitar revisión', sessionId);
  assert.equal(reply.action, 'review-unavailable');
  reply = await api.turn('Repetir lectura', sessionId);
  assert.equal(reply.action, 'repeat-complete');
  assert.deepEqual(reply.state.decision.baseline, baseline);
  reply = await api.turn('Solicitar revisión', sessionId);
  const requestId = reply.pending.requestId;
  reply = await api.turn('Confirmar', sessionId);
  assert.equal(reply.saved, true);
  assert.equal(reply.review.id, requestId);
  assert.equal(reply.review.delivery, 'local-only');
  const before = (await api.request('/api/evidence')).data;
  const saved = (await api.request('/api/reviews')).data;
  assert.equal(saved.length, 1);

  await api.stop();
  await api.start();
  const restored = (await api.request('/api/state?domain=cardiovascular&scenario=deviation')).data;
  assert.equal(restored.performed, true);
  assert.equal(restored.requested, true);
  assert.deepEqual(restored.decision.baseline, baseline);
  assert.deepEqual((await api.request('/api/reviews')).data, saved);
  assert.deepEqual((await api.request('/api/evidence')).data.counts, before.counts, 'Startup seed does not duplicate persisted data');
  const retry = await api.post('/api/reviews', {domain: 'cardiovascular', scenario: 'deviation', confirmed: true, requestId});
  assert.equal(retry.status, 200);
  assert.equal(retry.data.duplicate, true);
  assert.deepEqual(retry.data.review, saved[0]);
  assert.equal((await api.request('/api/reviews')).data.length, 1);
});
