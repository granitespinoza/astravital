// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// The browser web demo must give exactly the same answers as the local server for the same conversation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDatabase} from '../server/database.mjs';
import {respond} from '../server/assistant.mjs';
import {request, resetWebDemo} from '../app/web-demo.js';

const post = (text, sessionId) => request('/api/assistant', {method: 'POST', body: JSON.stringify({text, sessionId})});

test('web demo states match the real database for both domains', async () => {
  resetWebDemo();
  const db = createDatabase({path: ':memory:', seed: 142});
  try {
    for (const domain of ['cardiovascular', 'bone']) {
      const server = db.getState(domain);
      const web = await request('/api/state?domain=' + domain);
      for (const key of ['id', 'scenario', 'state', 'quality', 'performed', 'requested']) assert.deepEqual(web[key], server[key], `${domain}.${key}`);
      assert.deepEqual(web.evidenceIds, server.evidenceIds);
      assert.deepEqual(web.decision, server.decision);
    }
  } finally { db.close(); }
});

test('the same conversation gets identical answers in the web demo and on the server', async () => {
  resetWebDemo();
  const db = createDatabase({path: ':memory:', seed: 142});
  try {
    let serverSession;
    let webSession;
    const script = ['Hello Astra', 'How is my pulse?', 'How is my heart?', 'Why?', 'Check again', 'Request review', 'Confirm save', 'And my bones?', 'Can you diagnose osteoporosis?', 'Call the doctors on Earth', 'I feel dizzy'];
    for (const text of script) {
      const server = respond(db, {text, sessionId: serverSession});
      const web = await post(text, webSession);
      serverSession = server.sessionId;
      webSession = web.sessionId;
      assert.equal(web.action, server.action, `action for "${text}"`);
      assert.equal(web.text, server.text, `text for "${text}"`);
      assert.deepEqual(web.evidenceIds, server.evidenceIds, `evidence for "${text}"`);
    }
    const reviews = await request('/api/reviews');
    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].domain, 'cardiovascular');
    assert.equal(reviews[0].delivery, 'local-only (this browser)');
  } finally { db.close(); }
});

test('web demo reports its limits instead of pretending to have voice or a server', async () => {
  resetWebDemo();
  const health = await request('/health');
  assert.equal(health.profile, 'web-demo');
  assert.equal(health.voice.ready, false);
  assert.equal(health.tts.ready, false);
  await assert.rejects(request('/api/transcribe', {method: 'POST'}), /full local app/);
  await assert.rejects(request('/api/state?domain=bone&scenario=mismatch'), /default demo scenario/);
  await assert.rejects(post(''), /up to 1000 characters/);
});
