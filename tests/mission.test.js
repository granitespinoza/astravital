// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startApplication} from '../server/http.mjs';

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
  assert.equal((await call(base + 'ground')).data.reports[0].crew,null);
  assert.equal((await call(base + 'report-state',{data:{id:report.data.id,action:'review'}})).status,409);
  await call(base + 'report-state',{data:{id:report.data.id,action:'deliver'}});
  assert.equal((await call(base + 'ground')).data.reports[0].crew.find(member => member.crewId === crewId).latestEvidenceId,retrieved.latestEvidenceId);
  await call(base + 'report-state',{data:{id:report.data.id,action:'review'}});

  await stop();
  await start();
  assert.equal((await call(base + 'crew',{token})).status,401);
  assert.equal((await call(base + 'ground')).data.reports[0].status,'reviewed');
  const persisted = (await call(base + 'cmo')).data.crew.find(member => member.crewId === crewId);
  assert.equal(persisted.acknowledgedAt,accepted.data.acknowledgedAt);
  assert.equal(persisted.latestEvidenceId,retrieved.latestEvidenceId);
  assert.equal((await call('/api/state')).data.scenario,'deviation');
});
