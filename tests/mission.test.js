// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startApplication} from '../server/http.mjs';
import {createDatabase} from '../server/database.mjs';

test('two mission clients share validated readings, CMO acknowledgements and simulated reports across restart', async t => {
  const directory = await mkdtemp(join(tmpdir(),'astravital-mission-'));
  const dbPath = join(directory,'mission.sqlite');
  let server;
  async function start() { server = await startApplication({dbPath,mission:true}); }
  async function stop() {
    if (!server) return;
    const running = server;
    server = undefined;
    await new Promise((resolve,reject) => {
      running.close(error => error ? reject(error) : resolve());
      running.closeAllConnections();
    });
  }
  t.after(async () => {
    await stop();
    await rm(directory,{recursive:true,force:true});
  });
  await start();

  async function call(path, {token,data} = {}) {
    const headers = token ? {Authorization:'Bearer ' + token} : {};
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch('http://127.0.0.1:' + server.address().port + path, {
      headers, method:data === undefined ? 'GET' : 'POST', body:JSON.stringify(data),
    });
    return {status:response.status, data:await response.json()};
  }
  const base = '/api/mission/';
  const cmo = await call(base + 'cmo');
  const crewId = 'crew-03';
  const token = new URLSearchParams(new URL(cmo.data.links.find(link => link.id === crewId).url).hash.slice(1)).get('crew');
  assert.equal(cmo.data.crew.length,4);
  assert.equal((await call(base + 'crew')).status,401);
  assert.equal((await call(base + 'cmo',{token})).status,403);
  assert.equal((await call(base + 'ground',{token})).status,403);
  const initial = await call(base + 'crew',{token});
  assert.equal(initial.data.crewId,crewId);
  assert.equal(initial.data.reading,null);

  const packet = {packetId:'a'.repeat(32),value:initial.data.profiles.elevated,simulated:true};
  assert.equal((await call(base + 'readings',{token,data:{...packet,simulated:false}})).status,400);
  const first = await call(base + 'readings',{token,data:packet});
  assert.equal(first.status,200);
  assert.equal(first.data.state.decision.level,'watch');
  assert.equal((await call(base + 'readings',{token,data:packet})).data.duplicate,true);
  assert.equal((await call(base + 'readings',{token,data:{...packet,value:packet.value+1}})).status,409);
  const next = await call(base + 'readings',{token,data:{...packet,packetId:'b'.repeat(32),value:initial.data.profiles.high}});
  assert.equal(next.data.state.decision.level,'alert');
  assert.deepEqual(next.data.state.decision.baseline.ids,first.data.state.decision.baseline.ids);
  const retrieved = (await call(base + 'cmo')).data.crew.find(member => member.crewId === crewId);
  assert.equal(retrieved.missionDay,2);
  assert.equal(retrieved.latestEvidenceId,next.data.packetEvidenceId);
  const evidence = (await call('/api/evidence')).data;
  assert.equal(evidence.gold.find(row => row.crewId === crewId).latestEvidenceId,retrieved.latestEvidenceId);
  assert.equal(evidence.bronze.filter(row => row.source.generator === 'mission-phone-v1').length,2);

  assert.equal((await call(base + 'ack',{data:{crewId,evidenceId:first.data.packetEvidenceId,confirmed:true}})).status,409);
  const ack = {crewId,evidenceId:retrieved.latestEvidenceId,confirmed:true};
  const accepted = await call(base + 'ack',{data:ack});
  assert.ok(accepted.data.acknowledgedAt);
  assert.equal((await call(base + 'ack',{data:ack})).data.acknowledgedAt,accepted.data.acknowledgedAt);

  const report = await call(base + 'reports',{data:{kind:'weekly'}});
  assert.equal(report.data.status,'queued');
  const queued = (await call(base + 'ground')).data;
  assert.equal(queued.reports[0].crew,null);
  assert.deepEqual(queued.crew,[]);
  assert.equal((await call(base + 'report-state',{data:{id:report.data.id,action:'review'}})).status,409);
  await call(base + 'report-state',{data:{id:report.data.id,action:'deliver'}});
  const ground = (await call(base + 'ground')).data;
  assert.equal(ground.crew.find(member => member.crewId === crewId).latestEvidenceId,retrieved.latestEvidenceId);
  assert.equal(ground.inbox[0].priority,'watch');
  const note = {crewId,action:'note',note:'Check consistency in the next report.',confirmed:true,requestId:'http-ground-note'};
  assert.equal((await call(base + 'ground-action',{token,data:note})).status,403);
  assert.equal((await call(base + 'ground-action',{data:note})).data.entry.note,note.note);
  await call(base + 'report-state',{data:{id:report.data.id,action:'review'}});

  await stop();
  await start();
  assert.equal((await call(base + 'crew',{token})).status,401);
  assert.equal((await call(base + 'ground')).data.reports[0].status,'reviewed');
  assert.ok((await call(base + 'ground')).data.crew.find(member => member.crewId === crewId)
    .timeline.some(event => event.id === note.requestId));
  const persisted = (await call(base + 'cmo')).data.crew.find(member => member.crewId === crewId);
  assert.equal(persisted.acknowledgedAt,accepted.data.acknowledgedAt);
  assert.equal(persisted.latestEvidenceId,retrieved.latestEvidenceId);
  assert.equal((await call('/api/state')).data.scenario,'deviation');
});

test('Ground releases frozen reports on the simulated clock, ranks alerts, and preserves local actions', async t => {
  const directory = await mkdtemp(join(tmpdir(),'astravital-ground-'));
  const path = join(directory,'mission.sqlite');
  let moment = Date.UTC(2026,10,15);
  const options = {path,mission:true,clock:() => moment};
  let db = createDatabase(options);
  t.after(async () => { db.close(); await rm(directory,{recursive:true,force:true}); });
  let mission = db.mission;
  let packet = 0;
  function ingest(id, profile) {
    const value = mission.getCrew(id).profiles[profile];
    moment += 1000;
    const input = {packetId:(++packet).toString(16).padStart(32,'0'),value,simulated:true};
    const first = mission.ingest(id,input);
    const counts = db.getEvidence().counts;
    const retry = mission.ingest(id,input);
    assert.equal(retry.duplicate,true);
    assert.equal(retry.packetEvidenceId,first.packetEvidenceId);
    assert.equal(retry.state.missionDay,first.state.missionDay);
    assert.throws(() => mission.ingest(id,{...input,value:value+1}),/different value/);
    assert.deepEqual(db.getEvidence().counts,counts);
    return first.state;
  }
  ingest('crew-01','elevated');
  ingest('crew-02','steady');
  ingest('crew-03','high');
  const reading = ingest('crew-03','high');
  mission.acknowledge({crewId:reading.crewId,evidenceId:reading.latestEvidenceId,confirmed:true});
  const report = mission.queueReport({kind:'weekly'});
  assert.ok(report.delayMinutes >= 3 && report.delayMinutes <= 22);
  assert.equal(mission.getGround().reports[0].crew,null);
  ingest('crew-03','steady');
  moment = Date.parse(report.dueAt) - 1;
  assert.equal(mission.getGround().crew.length,0);
  moment += 1;
  const {crew,inbox,reports} = mission.getGround();
  assert.equal(reports[0].status,'delivered');
  assert.equal(reports[0].deliveredAt,report.dueAt);
  assert.deepEqual(inbox.map(entry => [entry.crewId,entry.priority]),[
    ['crew-03','alert'],['crew-01','watch'],['crew-02','info'],['crew-04','info'],
  ]);
  assert.match(inbox[0].threshold,/≥ 3/);
  const alex = crew.find(member => member.crewId === reading.crewId);
  assert.equal(alex.latestEvidenceId,reading.latestEvidenceId);
  assert.equal(alex.history.length,14);
  assert.equal(alex.repeated,true);
  assert.deepEqual(alex.bone,db.getState('bone'));
  assert.ok(crew.filter(member => member !== alex).every(member => member.bone === null));
  assert.ok(alex.evidence.gold.every(record => record.evidenceIds.every(id =>
    alex.evidence.silver.some(entry => entry.id === id && alex.evidence.bronze.some(raw => raw.id === entry.bronzeId)))));
  assert.ok(['packet','cmo-ack','report-received'].every(kind => alex.timeline.some(event => event.kind === kind)));

  const note = {crewId:alex.crewId,action:'note',note:'Review context with the crew.',requestId:'ground-note',confirmed:true};
  const consult = {crewId:alex.crewId,action:'teleconsult',requestId:'ground-consult',confirmed:true};
  const ack = {crewId:alex.crewId,action:'acknowledge',evidenceId:alex.latestEvidenceId,requestId:'ground-ack',confirmed:true};
  assert.throws(() => mission.saveGroundAction({...note,confirmed:false}),/Confirm/);
  assert.throws(() => mission.saveGroundAction({...ack,evidenceId:'wrong'}),/current WATCH or ALERT/);
  assert.equal(mission.saveGroundAction(ack).entry.kind,'ground-ack');
  assert.equal(mission.saveGroundAction(note).entry.note,note.note);
  assert.equal(mission.saveGroundAction(note).duplicate,true);
  assert.throws(() => mission.saveGroundAction({...note,note:'Different content'}),/different Ground action/);
  const savedConsult = mission.saveGroundAction(consult);
  assert.equal(savedConsult.entry.delivery,'local-only');
  assert.deepEqual(mission.saveGroundAction(consult),{...savedConsult,duplicate:true});
  mission.updateReport({id:report.id,action:'review'});
  db.close();
  db = createDatabase(options);
  mission = db.mission;
  const persisted = mission.getGround().crew.find(member => member.crewId === alex.crewId);
  assert.equal(persisted.groundAcknowledged,true);
  assert.ok(['note','teleconsult','report-reviewed'].every(kind => persisted.timeline.some(event => event.kind === kind)));
  assert.equal(persisted.timeline.filter(event => event.kind === 'teleconsult').length,1);
});
