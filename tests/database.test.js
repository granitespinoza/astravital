// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createDatabase} from '../server/database.mjs';

function memory(context) {const db=createDatabase({path:':memory:'});context.after(()=>db.close());return db;}

test('SQLite seed is persistent and idempotent across reopen without resetting reviews', () => {
  const directory=mkdtempSync(join(tmpdir(),'astravital-db-')),path=join(directory,'demo.sqlite');
  let db;
  try {
    db=createDatabase({path});const before=db.getEvidence().counts;
    db.repeatReading({scenario:'deviation'});db.requestReview({domain:'cardiovascular',scenario:'deviation',confirmed:true,requestId:'persistent-review'});
    const after=db.getEvidence().counts;db.close();db=createDatabase({path});
    assert.deepEqual(db.getEvidence().counts,after);assert.equal(db.listReviews().length,1);
    assert.equal(db.getState('heart').performed,true);assert.equal(db.getState('heart').requested,true);
    assert.equal(after.silver,before.silver+1);assert.equal(after.quarantine,1);assert.equal(db.health().storage,'sqlite');
  } finally {db?.close();rmSync(directory,{recursive:true,force:true});}
});

test('medallion lineage connects Gold to Silver to raw Bronze and isolates quarantine', context => {
  const db=memory(context),evidence=db.getEvidence();
  assert.equal(evidence.counts.gold,13);assert.equal(evidence.counts.quarantine,1);
  const bronze=new Set(evidence.bronze.map(row=>row.id)),silver=new Set(evidence.silver.map(row=>row.id));
  assert.ok(evidence.silver.every(row=>bronze.has(row.bronzeId)));
  for(const state of evidence.gold) {assert.equal(state.simulated,true);assert.ok(state.rules.length>0);assert.ok(state.evidenceIds.every(id=>silver.has(id)));}
  const rejected=evidence.quarantine[0];assert.ok(bronze.has(rejected.bronzeId));assert.ok(!evidence.silver.some(row=>row.bronzeId===rejected.bronzeId));
  assert.equal(db.getState('bone').decision.significance,'exceeds-measurement-lsc');
  assert.equal(db.getState('bone','mismatch').decision.comparable,false);
  assert.equal(db.getState('bone','missing-lsc').decision.significance,'not-established');
});

test('heart repeat freezes the original baseline and creates only one durable event', context => {
  const db=memory(context),before=db.getState('cardiovascular');
  const first=db.repeatReading({scenario:'deviation'}),second=db.repeatReading({scenario:'deviation'});
  assert.equal(first.duplicate,false);assert.equal(second.duplicate,true);
  assert.deepEqual(first.state.decision.baseline,before.decision.baseline);
  assert.equal(first.state.reading.value,73);assert.equal(first.state.state,'alert');
  assert.equal(db.getEvidence().counts.events,1);
  assert.throws(()=>db.repeatReading({scenario:'missing'}),/valid resting deviation/);
});

test('reviews require a separate true confirmation and are idempotent by request and episode', context => {
  const db=memory(context);
  for(const confirmed of [undefined,false,'true',1])assert.throws(()=>db.requestReview({domain:'bone',confirmed,requestId:'bone-review'}),/Explicit independent confirmation/);
  assert.equal(db.listReviews().length,0);
  assert.throws(()=>db.requestReview({domain:'heart',confirmed:true,requestId:'heart-without-repeat'}),/does not support/);
  const first=db.requestReview({domain:'bone',confirmed:true,requestId:'bone-review'});
  assert.equal(first.saved,true);assert.equal(first.review.delivery,'local-only');
  assert.equal(db.requestReview({domain:'bone',confirmed:true,requestId:'bone-review'}).duplicate,true);
  assert.equal(db.requestReview({domain:'bone',confirmed:true,requestId:'another-id-same-episode'}).review.id,'bone-review');
  assert.equal(db.listReviews().length,1);
  db.repeatReading();assert.throws(()=>db.requestReview({domain:'heart',confirmed:true,requestId:'bone-review'}),/another episode/);
  assert.throws(()=>db.requestReview({domain:'bone',scenario:'mismatch',confirmed:true,requestId:'bad-pair'}),/does not support/);
});
