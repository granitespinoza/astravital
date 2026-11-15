// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDatabase} from '../server/database.mjs';
import {respond} from '../server/assistant.mjs';
function memory(context) {const db=createDatabase({path:':memory:'});context.after(()=>db.close());return db;}

test('dialogue follows heart/bone context across natural Spanish and English questions with DB evidence', context => {
  const db=memory(context);let reply=respond(db,{text:'estado del corazón'});const sessionId=reply.sessionId;
  assert.equal(reply.domain,'cardiovascular');assert.equal(reply.action,'status');assert.match(reply.text,/heart reading has changed/);assert.doesNotMatch(reply.text,/bpm|z=|LSC|DXA/);
  reply=respond(db,{text:'estado de mis huesos',sessionId});assert.equal(reply.domain,'bone');assert.match(reply.text,/bone check shows a change/);assert.doesNotMatch(reply.text,/[0-9]/);
  reply=respond(db,{text:'por qué',sessionId});assert.equal(reply.action,'explain');assert.match(reply.text,/synthetic LSC/);
  reply=respond(db,{text:'compare with the previous measurement',sessionId});assert.equal(reply.domain,'bone');assert.equal(reply.action,'compare');
  const ids=new Set([...db.getEvidence().silver,...db.getEvidence().gold].map(row=>row.id));
  assert.ok(reply.evidenceIds.length>=3);assert.ok(reply.evidenceIds.every(id=>ids.has(id)));
  assert.equal(db.getSession(sessionId).domain,'bone');
});

test('request, ambiguous confirmation and cancellation never persist a review', context => {
  const db=memory(context);let reply=respond(db,{text:'estado de mis huesos'});const sessionId=reply.sessionId;
  reply=respond(db,{text:'solicitar revisión',sessionId});assert.ok(reply.pending);const requestId=reply.pending.requestId;
  for(const text of ['sí, pero quizá después','¿confirmar?','confirma si crees que debo','ok']) {reply=respond(db,{text,sessionId});assert.notEqual(reply.action,'review-saved');assert.equal(db.listReviews().length,0);}
  reply=respond(db,{text:'cancelar',sessionId});assert.equal(reply.pending,null);assert.equal(db.listReviews().length,0);
  reply=respond(db,{text:'confirmar',sessionId});assert.equal(reply.action,'confirmation-unavailable');
  assert.ok(requestId);
});

test('independent confirmation persists one review; a combined request/confirm only opens pending', context => {
  const db=memory(context);let reply=respond(db,{text:'huesos'});const sessionId=reply.sessionId;
  reply=respond(db,{text:'solicitar revisión y confirmo',sessionId});assert.ok(reply.pending);assert.equal(db.listReviews().length,0);
  const id=reply.pending.requestId;reply=respond(db,{text:'confirmar',sessionId});assert.equal(reply.saved,true);assert.equal(reply.review.id,id);assert.equal(reply.pending,null);
  reply=respond(db,{text:'confirmar',sessionId});assert.equal(reply.action,'confirmation-unavailable');assert.equal(db.listReviews().length,1);
});

test('heart requests require a repeat and preserve the frozen reference in SQLite', context => {
  const db=memory(context);let reply=respond(db,{text:'estado del corazón'});const sessionId=reply.sessionId,baseline=reply.state.decision.baseline;
  reply=respond(db,{text:'solicitar revisión',sessionId});assert.equal(reply.action,'review-unavailable');assert.equal(reply.pending,null);
  reply=respond(db,{text:'repetir lectura',sessionId});assert.equal(reply.action,'repeat-complete');assert.deepEqual(reply.state.decision.baseline,baseline);
  reply=respond(db,{text:'request review',sessionId});assert.ok(reply.pending);
  reply=respond(db,{text:'confirm save',sessionId});assert.equal(reply.saved,true);assert.equal(db.listReviews().length,1);
});

test('pending confirmation is scoped, expiry is enforced, and failed writes have no success response', context => {
  const db=memory(context);let reply=respond(db,{text:'huesos'});const sessionId=reply.sessionId;
  reply=respond(db,{text:'solicitar revisión',sessionId});
  reply=respond(db,{text:'estado del corazón',sessionId});assert.equal(reply.pending,null);
  reply=respond(db,{text:'huesos',sessionId});reply=respond(db,{text:'solicitar revisión',sessionId});
  const expired=db.getSession(sessionId);expired.pending.expiresAt=0;db.saveSession(sessionId,expired);
  reply=respond(db,{text:'confirmar',sessionId});assert.equal(reply.action,'confirmation-expired');assert.equal(db.listReviews().length,0);
  reply=respond(db,{text:'solicitar revisión',sessionId});const pendingId=reply.pending.requestId;
  const failing={...db,requestReview(){throw new Error('Injected storage failure');}};
  reply=respond(failing,{text:'confirmar',sessionId});assert.equal(reply.saved,false);assert.equal(reply.action,'error');assert.equal(reply.pending.requestId,pendingId);assert.equal(db.listReviews().length,0);
  reply=respond(db,{text:'confirmar',sessionId});assert.equal(reply.saved,true);assert.equal(reply.review.id,pendingId);
});

test('mute and out-of-scope medical questions retain evidence without inventing a diagnosis', context => {
  const db=memory(context);let reply=respond(db,{text:'silencio'});assert.equal(reply.muted,true);
  reply=respond(db,{text:'¿tengo osteoporosis?',sessionId:reply.sessionId});assert.equal(reply.action,'decline');assert.match(reply.text,/cannot diagnose/);assert.ok(reply.evidenceIds.length);
  reply=respond(db,{text:'escribe una receta de tratamiento',sessionId:reply.sessionId});assert.notEqual(reply.action,'review-saved');assert.equal(db.listReviews().length,0);
});


test('natural English status is warm, actionable and at most 35 words without measurements', context => {
  const db=memory(context);
  for (const [text, domain] of [['Astra, how are my bones?','bone'],['How is my heart?','cardiovascular']]) {
    const reply=respond(db,{text});assert.equal(reply.domain,domain);assert.equal(reply.action,'status');
    assert.ok(reply.text.split(/\s+/).length<=35, reply.text);assert.doesNotMatch(reply.text,/bpm|g\/cm|LSC|DXA|z=|\bsafe\b|[0-9]/i);
    assert.match(reply.text,/review|check it again/i);assert.ok(reply.evidenceIds.length);
  }
  for(const boneScenario of ['missing','stable','mismatch','missing-lsc']) {
    const reply=respond(db,{text:'How are my bones?',boneScenario});assert.ok(reply.text.split(/\s+/).length<=35);assert.doesNotMatch(reply.text,/[0-9]|\bsafe\b/i);
  }
});

test('technical measurements appear only after an explicit why, compare or medical-details request', context => {
  const db=memory(context);let reply=respond(db,{text:'How are my bones?'});const sessionId=reply.sessionId;
  for(const text of ['Why?','Compare the checks','Show medical details']) {
    reply=respond(db,{text,sessionId});assert.match(reply.text,/-3.00%/);assert.match(reply.text,/synthetic LSC/);assert.ok(reply.evidenceIds.length>=3);
  }
  reply=respond(db,{text:'How is my heart?',sessionId});assert.doesNotMatch(reply.text,/bpm/);
  reply=respond(db,{text:'Show medical details',sessionId});assert.match(reply.text,/68 bpm/);assert.match(reply.text,/not a diagnosis/);
});

test('friendly greetings, help, thanks, symptoms and Earth questions do not invent contact or assurance', context => {
  const db=memory(context);
  for(const text of ['Hello','How can you help?','Thanks','What should I do?','I feel dizzy','Have you contacted Earth?']) {
    const reply=respond(db,{text});assert.ok(reply.text.split(/\s+/).length<=35,reply.text);assert.doesNotMatch(reply.text,/\bsafe\b|clinically validated/i);assert.equal(db.listReviews().length,0);
  }
  assert.match(respond(db,{text:'Have you contacted Earth?'}).text,/haven’t contacted anyone/);
});

test('natural English keeps confirmation independent and negated actions have no side effects', context => {
  const db=memory(context);let reply=respond(db,{text:'How is my heart?'});const sessionId=reply.sessionId;
  reply=respond(db,{text:'Do not check again',sessionId});assert.equal(reply.state.performed,false);assert.equal(db.getEvidence().counts.events,0);
  reply=respond(db,{text:'Check again',sessionId});assert.equal(reply.action,'repeat-complete');assert.ok(reply.text.split(/\s+/).length<=35);
  reply=respond(db,{text:'Request review',sessionId});assert.ok(reply.pending);assert.equal(db.listReviews().length,0);
  reply=respond(db,{text:'Cancel',sessionId});assert.equal(reply.pending,null);
  reply=respond(db,{text:'Confirm save',sessionId});assert.equal(reply.action,'confirmation-unavailable');
  reply=respond(db,{text:'Request review',sessionId});reply=respond(db,{text:'Confirm save',sessionId});assert.equal(reply.saved,true);assert.equal(db.listReviews().length,1);
  reply=respond(db,{text:'Mute',sessionId});assert.equal(reply.muted,true);assert.match(reply.text,/Audio muted/);
});

// AI assistance: Anthropic Claude. Questions a judge is likely to try on the public demo.
test('diagnosis, treatment and emergency questions are declined or referred, never answered with a status', () => {
  const db=createDatabase({path:':memory:',seed:142});
  let sessionId;
  const ask = text => { const reply=respond(db,{text,sessionId}); sessionId=reply.sessionId; return reply; };
  for (const text of ['Can you diagnose me?','Do I have heart disease?','Do I have a heart condition?','What treatment should I take?','Should I take medication?','¿Tengo una enfermedad?']) {
    const reply=ask(text);
    assert.equal(reply.action,'decline',text); assert.match(reply.text,/cannot diagnose/); assert.match(reply.text,/onboard medical officer/);
  }
  for (const text of ['Is this a heart attack?','I have chest pain','¿Es un infarto?']) {
    const reply=ask(text);
    assert.equal(reply.action,'acknowledge',text); assert.match(reply.text,/tell your onboard medical officer now/);
  }
  assert.equal(ask('Show medical details').action,'explain');
  assert.equal(ask('How is my heart?').action,'status');
  assert.equal(db.listReviews().length,0,'no question saves a review');
  db.close();
});
