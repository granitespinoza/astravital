// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decide, policy, RULE} from '../app/engine.js';
import {sample, scenarios} from '../app/scenarios.js';
import {expectedEvent} from '../app/workflow.js';
import {getBoneScenario, boneScenarios, BONE_CONTRACT_ID} from '../app/bone-data.js';
import {assessBone} from '../app/bone.js';
import {createMission} from './mission.mjs';
import {createCaseMessages} from './case-messages.mjs';

const defaults = {cardiovascular:'deviation', bone:'change'};
const parse = value => JSON.parse(value);
const json = value => JSON.stringify(value);
function fail(message, code = 'invalid-request') { const error = new Error(message); error.code = code; throw error; }
function domainName(domain) { const result = domain === 'heart' ? 'cardiovascular' : domain; if (!Object.hasOwn(defaults, result)) fail('Unknown health domain.'); return result; }
function scenarioName(domain, scenario) { const result = scenario ?? defaults[domain]; if (!Object.hasOwn(domain === 'bone' ? boneScenarios : scenarios, result)) fail('Unknown domain scenario.'); return result; }

export function createDatabase({path = fileURLToPath(new URL('../.runtime/demo.sqlite', import.meta.url)), seed = 142, mission = false,
  clock = Date.now, reportId} = {}) {
  const now = () => new Date(clock()).toISOString();
  if (seed !== 142) fail('Only the documented seed 142 is supported by these fixtures.');
  if (path !== ':memory:') mkdirSync(dirname(path), {recursive:true});
  const database = new DatabaseSync(path);
  database.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bronze (id TEXT PRIMARY KEY, domain TEXT NOT NULL, scenario TEXT NOT NULL, raw_json TEXT NOT NULL, source_json TEXT NOT NULL, ingested_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quarantine (id TEXT PRIMARY KEY, bronze_id TEXT NOT NULL REFERENCES bronze(id), reasons_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS silver (id TEXT PRIMARY KEY, bronze_id TEXT UNIQUE NOT NULL REFERENCES bronze(id), domain TEXT NOT NULL, scenario TEXT NOT NULL, observation_id TEXT NOT NULL, observed_at TEXT NOT NULL, normalized_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS gold (id TEXT PRIMARY KEY, domain TEXT NOT NULL, scenario TEXT NOT NULL, snapshot_json TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(domain,scenario));
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, domain TEXT NOT NULL, scenario TEXT NOT NULL, kind TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(domain,scenario,kind));
    CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, domain TEXT NOT NULL, scenario TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(domain,scenario));
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, context_json TEXT NOT NULL, updated_at TEXT NOT NULL);`);
  const version = database.prepare("SELECT value FROM metadata WHERE key='schema-version'").get();
  if (version && version.value !== '1') { database.close(); fail('Unsupported database schema version.'); }
  database.prepare('INSERT OR IGNORE INTO metadata VALUES (?,?)').run('schema-version', '1');
  database.prepare('INSERT OR IGNORE INTO metadata VALUES (?,?)').run('seed', String(seed));
  if (database.prepare("SELECT value FROM metadata WHERE key='seed'").get().value !== String(seed)) { database.close(); fail('Existing database uses a different seed.'); }
  function transaction(work) { database.exec('BEGIN IMMEDIATE'); try { const value = work(); database.exec('COMMIT'); return value; } catch (error) { database.exec('ROLLBACK'); throw error; } }
  const getReview = (domain,scenario) => { const row = database.prepare('SELECT payload_json FROM reviews WHERE domain=? AND scenario=?').get(domain,scenario); return row ? parse(row.payload_json) : null; };
  const observations = (domain,scenario) => database.prepare('SELECT id,observation_id,normalized_json FROM silver WHERE domain=? AND scenario=? ORDER BY observed_at,id').all(domain,scenario).map(row => ({id:row.id, observation:parse(row.normalized_json)}));
  function insertObservation(domain,scenario,raw,generator = domain === 'bone' ? 'bone-fixture-v1' : 'heart-fixture-v1') {
    const id = `bronze:${domain}:${scenario}:${raw.id ?? 'invalid'}`;
    database.prepare('INSERT OR IGNORE INTO bronze VALUES (?,?,?,?,?,?)').run(id,domain,scenario,json(raw),json({generator,seed,simulated:true}),now());
    const reasons = [];
    if (!raw || raw.simulated !== true || typeof raw.id !== 'string' || typeof raw.crewId !== 'string') reasons.push('invalid-identity-or-simulation');
    if (domain === 'cardiovascular') {
      if (raw.indicator !== 'heart_rate' || raw.unit !== '/min' || !Number.isFinite(raw.observedAt) || !['rest','activity'].includes(raw.context) || !['ok','suspect','device-fault'].includes(raw.quality) || typeof raw.source !== 'string' || (raw.quality !== 'device-fault' && (!Number.isFinite(raw.value) || raw.value <= 0))) reasons.push('invalid-heart-contract');
    } else if (raw.contractId !== BONE_CONTRACT_ID || raw.domain !== 'bone' || raw.indicator !== 'areal_bmd' || raw.method !== 'DXA' || raw.unit !== 'g/cm2' || !Number.isFinite(raw.value) || raw.value <= 0 || !Number.isFinite(Date.parse(raw.observedAt)) || !raw.region || !raw.side || !raw.calibrationId || !['ok','suspect','device-fault'].includes(raw.quality) || !raw.source || raw.source.type !== 'synthetic') reasons.push('invalid-bone-contract');
    if (reasons.length) { database.prepare('INSERT OR IGNORE INTO quarantine VALUES (?,?,?)').run('quarantine:' + id,id,json(reasons)); return; }
    const acquired = domain === 'cardiovascular' ? new Date(raw.observedAt).toISOString() : raw.observedAt;
    database.prepare('INSERT OR IGNORE INTO silver VALUES (?,?,?,?,?,?,?)').run('silver:' + id,id,domain,scenario,raw.id,acquired,json(raw));
  }
  function refresh(domain,scenario) {
    const rows = observations(domain,scenario);
    const review = getReview(domain,scenario);
    let snapshot;
    if (domain === 'cardiovascular') {
      const settings = policy();
      const history = rows.filter(row => row.observation.id.startsWith('history-')).map(row => row.observation);
      const initial = rows.find(row => row.observation.id === 'current')?.observation ?? null;
      const clock = sample(scenario).now;
      const first = decide(initial,history,clock,settings);
      const performed = Boolean(database.prepare("SELECT id FROM events WHERE domain=? AND scenario=? AND kind='repeat'").get(domain,scenario));
      const current = performed ? rows.find(row => row.observation.id === 'repeat-' + scenario)?.observation ?? null : initial;
      const decision = decide(current,history,clock,settings,performed ? first.baseline : null);
      const evidenceRows = rows.filter(row => row.observation.id === current?.id || row.observation.id === initial?.id || decision.baseline?.ids.includes(row.observation.id));
      snapshot = {state:decision.level ?? decision.quality, label:(decision.level ?? decision.quality).toUpperCase(), quality:decision.quality, reading:decision.quality === 'ok' ? current : null, current, baseline:decision.baseline, history, decision, evidenceIds:evidenceRows.map(row=>row.id), rules:[{id:RULE,...settings}], performed};
    } else {
      const history = rows.map(row => row.observation);
      const decision = assessBone(history);
      snapshot = {state:decision.status, label:decision.status.toUpperCase().replaceAll('-',' '), quality:decision.comparable ? 'ok' : decision.status === 'no-measurement' ? 'missing' : 'not-comparable', reading:decision.comparable ? decision.current : null, current:decision.current, baseline:decision.baseline, history, decision, evidenceIds:rows.map(row=>row.id), rules:[{id:'Comparable DXA aBMD change v0.1',lscPercent:decision.lscPercent, precisionBasis:decision.lscPercent === null ? null : decision.baseline?.precision?.basis,precisionAssessmentId:decision.lscPercent === null ? null : decision.baseline?.precision?.assessmentId}], performed:false};
    }
    const id = `gold:${domain}:${scenario}`;
    snapshot = {id,domain,scenario,...snapshot,simulated:true,requested:Boolean(review),review};
    database.prepare('INSERT INTO gold VALUES (?,?,?,?,?) ON CONFLICT(domain,scenario) DO UPDATE SET snapshot_json=excluded.snapshot_json,updated_at=excluded.updated_at').run(id,domain,scenario,json(snapshot),now());
    return snapshot;
  }
  transaction(() => {
    for (const scenario of Object.keys(scenarios)) { const data = sample(scenario); for (const row of [...data.history,...(data.current ? [data.current] : [])]) insertObservation('cardiovascular',scenario,row); }
    for (const scenario of Object.keys(boneScenarios)) for (const row of getBoneScenario(scenario).records) insertObservation('bone',scenario,row);
    const invalid = {...sample('normal').current,id:'invalid-unit-example',unit:'unknown-unit'};
    insertObservation('cardiovascular','quarantine-example',invalid);
    for (const [domain,ids] of [['cardiovascular',Object.keys(scenarios)],['bone',Object.keys(boneScenarios)]]) for (const scenario of ids) refresh(domain,scenario);
  });
  const api = {
    health() { return {ok:true,storage:'sqlite',schemaVersion:1,seed,simulated:true,counts:api.getEvidence().counts}; },
    getState(domain='cardiovascular',scenario) { domain=domainName(domain);scenario=scenarioName(domain,scenario);return parse(database.prepare('SELECT snapshot_json FROM gold WHERE domain=? AND scenario=?').get(domain,scenario).snapshot_json); },
    getEvidence() {
      const bronze = database.prepare('SELECT * FROM bronze ORDER BY id').all().map(row=>({id:row.id,domain:row.domain,scenario:row.scenario,raw:parse(row.raw_json),source:parse(row.source_json),ingestedAt:row.ingested_at}));
      const quarantine = database.prepare('SELECT * FROM quarantine ORDER BY id').all().map(row=>({id:row.id,bronzeId:row.bronze_id,reasons:parse(row.reasons_json)}));
      const silver = database.prepare('SELECT * FROM silver ORDER BY id').all().map(row=>({id:row.id,bronzeId:row.bronze_id,domain:row.domain,scenario:row.scenario,observation:parse(row.normalized_json)}));
      const gold = database.prepare('SELECT * FROM gold ORDER BY id').all().map(row=>parse(row.snapshot_json));
      return {seed,counts:{bronze:bronze.length,quarantine:quarantine.length,silver:silver.length,gold:gold.length,events:database.prepare('SELECT count(*) AS n FROM events').get().n,reviews:database.prepare('SELECT count(*) AS n FROM reviews').get().n},bronze,quarantine,silver,gold};
    },
    listReviews() { return database.prepare('SELECT payload_json FROM reviews ORDER BY created_at,id').all().map(row=>parse(row.payload_json)); },
    repeatReading({scenario='deviation'}={}) { scenario=scenarioName('cardiovascular',scenario);return transaction(()=>{
      const before=refresh('cardiovascular',scenario);
      if (before.performed) return {saved:true,duplicate:true,state:before};
      if (!['watch','alert'].includes(before.decision.level)) fail('A valid resting deviation is required before a repeat.','repeat-unavailable');
      const event=expectedEvent(scenario,'repeat');
      insertObservation('cardiovascular',scenario,event.reading);
      database.prepare('INSERT INTO events VALUES (?,?,?,?,?,?)').run('cardiovascular:' + event.id,'cardiovascular',scenario,'repeat',json(event),now());
      return {saved:true,duplicate:false,state:refresh('cardiovascular',scenario)};
    }); },
    requestReview({domain,scenario,confirmed,requestId}={}) {
      if (confirmed !== true) fail('Explicit independent confirmation is required.','confirmation-required');
      domain=domainName(domain);scenario=scenarioName(domain,scenario);
      if (typeof requestId !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(requestId)) fail('A stable requestId is required.');
      return transaction(()=>{
        const existing=database.prepare('SELECT domain,scenario,payload_json FROM reviews WHERE id=?').get(requestId);
        if (existing && (existing.domain!==domain || existing.scenario!==scenario)) fail('requestId already belongs to another episode.','request-id-conflict');
        const previous=existing ? parse(existing.payload_json) : getReview(domain,scenario);
        if (previous) return {saved:true,duplicate:true,review:previous,state:refresh(domain,scenario)};
        const state=refresh(domain,scenario);
        const eligible=domain==='cardiovascular' ? state.performed && ['watch','alert'].includes(state.decision.level) : state.decision.comparable && state.decision.significance==='exceeds-measurement-lsc';
        if (!eligible) fail('Current evidence does not support this review workflow.','review-unavailable');
        const review={id:requestId,requestId,domain,scenario,stateId:state.id,evidenceIds:state.evidenceIds,decision:state.decision,simulated:true,status:'requested',delivery:'local-only',createdAt:now()};
        database.prepare('INSERT INTO reviews VALUES (?,?,?,?,?)').run(requestId,domain,scenario,json(review),review.createdAt);
        const payload=domain==='cardiovascular' ? expectedEvent(scenario,'request') : {id:`bone:${scenario}:request`,domain,scenario,kind:'request',evidenceIds:state.evidenceIds,simulated:true};
        database.prepare('INSERT OR IGNORE INTO events VALUES (?,?,?,?,?,?)').run(`${domain}:${scenario}:request`,domain,scenario,'request',json(payload),now());
        return {saved:true,duplicate:false,review,state:refresh(domain,scenario)};
      });
    },
    getSession(id) { const row=database.prepare('SELECT context_json FROM sessions WHERE id=?').get(id);return row ? parse(row.context_json) : null; },
    saveSession(id,context) { database.prepare('INSERT INTO sessions VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET context_json=excluded.context_json,updated_at=excluded.updated_at').run(id,json(context),now()); },
    close() { database.close(); },
  };
  api.caseMessages = createCaseMessages(database,transaction,clock);
  api.mission = mission ? createMission({database,transaction,insertObservation,observations,seed,clock,reportId,
    boneState:() => api.getState('bone')}) : null;
  return api;
}
