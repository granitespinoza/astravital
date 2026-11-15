// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {getBoneScenario, boneScenarios} from '../app/bone-data.js';
import {assessBone} from '../app/bone.js';
const pair = () => getBoneScenario('change').records;
const close = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-10, `${actual} ~= ${expected}`);

test('seeded bone fixtures are deterministic, labeled and separated by months', () => {
  for (const id of Object.keys(boneScenarios)) {
    const fixture=getBoneScenario(id);
    assert.deepEqual(fixture,getBoneScenario(id));assert.equal(fixture.seed,142);
    assert.match(fixture.origin,/synthetic/);
    for(const row of fixture.records) { assert.equal(row.simulated,true);assert.equal(row.source.seed,142);assert.equal(row.unit,'g/cm2');assert.equal(row.method,'DXA'); }
  }
  const [baseline,current]=pair();assert.equal(baseline.value,1);assert.equal(current.value,0.97);
  assert.ok(Date.parse(current.observedAt)-Date.parse(baseline.observedAt)>150*86400000);
});

test('numerical measurement change is compared only with an explicit assumed LSC', () => {
  const source=pair(), before=JSON.stringify(source), result=assessBone(source);
  assert.equal(result.comparable,true);close(result.percentChange,-3);
  assert.equal(result.significance,'exceeds-measurement-lsc');assert.equal(result.lscPercent,2.5);
  assert.match(result.message,/does not establish disease/);assert.equal(JSON.stringify(source),before);
  assert.equal(assessBone(getBoneScenario('stable').records).significance,'within-measurement-lsc');
  const without=assessBone(getBoneScenario('missing-lsc').records);
  assert.equal(without.comparable,true);assert.equal(without.significance,'not-established');close(without.percentChange,-3);
});

test('LSC equality and positive/negative boundaries are handled without clinical labels', () => {
  for(const value of [0.975,1.025]) { const rows=pair();rows[1].value=value;assert.equal(assessBone(rows).significance,'within-measurement-lsc'); }
  for(const value of [0.9749,1.0251]) { const rows=pair();rows[1].value=value;assert.equal(assessBone(rows).significance,'exceeds-measurement-lsc'); }
  for(const change of [{lscPercent:0},{lscPercent:NaN},{assessmentId:''},{basis:''},{assessmentId:'different-basis'}]) {
    const rows=pair();rows[1].precision={...rows[1].precision,...change};const result=assessBone(rows);
    assert.equal(result.significance,'not-established');assert.equal(result.status,'precision-unknown');
  }
});

test('incompatible metadata, chronology and duplicate IDs cannot produce a comparison', () => {
  const changes=[{crewId:'other'},{region:'lumbar_spine'},{side:'right'},{method:'QCT'},{unit:'mg/cm3'},{calibrationId:'other'},{observedAt:'2026-02-30T07:05:00Z'},{observedAt:pair()[0].observedAt},{id:pair()[0].id}];
  for(const change of changes) {const rows=pair();Object.assign(rows[1],change);const result=assessBone(rows);assert.equal(result.comparable,false,JSON.stringify(change));assert.equal(result.percentChange,null);assert.equal(result.significance,'not-established');}
  const rows=pair();assert.deepEqual(assessBone(rows.toReversed()),assessBone(rows),'Input order is not measurement chronology');
});

test('missing, flagged, real or numerically invalid input is never treated as valid bone evidence', () => {
  assert.equal(assessBone([]).status,'no-measurement');assert.equal(assessBone([pair()[0]]).significance,'not-established');
  for(const change of [{quality:'suspect'},{simulated:false},{value:NaN},{value:Infinity},{value:0},{contractId:'unknown'},{source:null}]) {
    const rows=pair();Object.assign(rows[1],change);const result=assessBone(rows);assert.equal(result.comparable,false);assert.equal(result.percentChange,null);
  }
});
