// AI assistance: Anthropic Claude and OpenAI Codex. See docs/SI-USAGE.md.
// The browser web demo must give exactly the same answers as the local server for the same conversation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDatabase} from '../server/database.mjs';
import {respond} from '../server/assistant.mjs';
import {db as webVisor, request, resetWebDemo} from '../app/web-demo.js';
import {createMissionDemo} from '../app/mission-demo.js';
import {readFile} from 'node:fs/promises';

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

test('the Ground web demo reads seed-142 reports and saves notes only in browser storage', async t => {
  resetWebDemo();
  const json = await readFile(new URL('../app/mission-demo.json',import.meta.url),'utf8');
  t.mock.method(globalThis,'fetch', async url => {
    assert.equal(url.href,new URL('../app/mission-demo.json',import.meta.url).href);
    return new Response(json);
  });
  const original = Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const items = new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:key => items.get(key) ?? null, setItem:(key,value) => items.set(key,value),
  }});
  t.after(() => {
    if (original) Object.defineProperty(globalThis,'localStorage',original);
    else delete globalThis.localStorage;
  });
  const demo = await createMissionDemo();
  const {inbox,crew} = await demo.request('ground');
  assert.deepEqual(inbox.map(entry => entry.priority),['alert','watch','info','info']);
  const alex = crew.find(member => member.crewId === 'crew-03');
  const initial = webVisor.getState('cardiovascular');
  assert.equal(alex.name,'Alex Morgan');
  assert.equal(alex.visorCase,'initial');
  assert.deepEqual(alex.reading,initial.reading);
  assert.deepEqual(alex.decision,initial.decision);
  assert.deepEqual(alex.evidenceIds,initial.evidenceIds);
  assert.deepEqual(alex.bone.decision,webVisor.getState('bone').decision);
  const repeat = webVisor.repeatReading().state;
  const repeatDemo = await createMissionDemo({caseId:'repeat'});
  const repeatedAlex = (await repeatDemo.request('ground')).crew.find(member => member.crewId === alex.crewId);
  assert.equal(repeatedAlex.visorCase,'repeat');
  assert.deepEqual(repeatedAlex.reading,repeat.reading);
  assert.deepEqual(repeatedAlex.decision,repeat.decision);
  assert.deepEqual(repeatedAlex.evidenceIds,repeat.evidenceIds);
  assert.notEqual(repeatedAlex.latestEvidenceId,alex.latestEvidenceId);
  const note = {crewId:'crew-03',action:'note',note:'Seed-142 review.',confirmed:true,requestId:'browser-ground-note'};
  assert.equal((await demo.request('ground-action',note)).entry.delivery,'local-only');
  assert.equal((await demo.request('ground-action',note)).duplicate,true);
  const reopened = await createMissionDemo();
  const again = await reopened.request('ground');
  assert.equal(again.crew.find(member => member.crewId === 'crew-03').timeline.find(event => event.id === note.requestId).note,note.note);
  resetWebDemo();
});
