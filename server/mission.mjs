// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {randomUUID} from 'node:crypto';
import {decide, policy, SOL} from '../app/engine.js';
import {ORIGIN, reading, seeded} from '../app/scenarios.js';
import {buildGround, groundAction} from '../app/ground-model.js';

const domain = 'cardiovascular';
const crew = [
  {id:'crew-01', name:'Jordan Lee', offset:-5},
  {id:'crew-02', name:'Riley Chen', offset:3},
  {id:'crew-03', name:'Alex Morgan', offset:0},
  {id:'crew-04', name:'Taylor Reed', offset:5},
];
const settings = policy();
const scenario = id => 'lan-' + id;

function reject(message, status = 400) {
  throw Object.assign(new Error(message), {status});
}

export function createMission({database, transaction, insertObservation, observations, seed, boneState, clock, reportId = randomUUID}) {
  const at = () => new Date(clock()).toISOString();
  database.exec(`
    CREATE TABLE IF NOT EXISTS mission_ack (
      evidence_id TEXT PRIMARY KEY REFERENCES silver(id), acknowledged_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mission_report (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL,
      snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL,
      delivered_at TEXT, reviewed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS mission_report_delay (
      id TEXT PRIMARY KEY REFERENCES mission_report(id), minutes INTEGER NOT NULL, due_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mission_ground_action (
      id TEXT PRIMARY KEY, payload_json TEXT NOT NULL
    );
  `);

  function getMember(id) {
    const member = crew.find(item => item.id === id);
    if (!member) reject('Unknown crew member.', 404);
    return member;
  }

  function snapshot(id, rows = observations(domain, scenario(id))) {
    const {id:crewId,name} = getMember(id);
    const history = rows.filter(row => row.observation.id.startsWith('history-'));
    const samples = rows.filter(row => row.observation.id.startsWith('packet-'));
    const latest = samples.at(-1);
    const current = latest?.observation;
    const reference = history.map(row => row.observation);
    const first = samples[0]?.observation;
    const frozen = first ? decide(first, reference, first.observedAt, settings).baseline : null;
    const decision = decide(current ?? null, reference, current?.observedAt ?? ORIGIN, settings, frozen);
    const prior = samples.at(-2)?.observation;
    const priorDecision = prior ? decide(prior, reference, prior.observedAt, settings, frozen) : null;
    const repeated = ['watch','alert'].includes(decision.level) && ['watch','alert'].includes(priorDecision?.level)
      && Math.sign(decision.z) === Math.sign(priorDecision.z);
    const baseline = decision.baseline?.n ? decision.baseline : null;
    const evidenceIds = [...history.filter(row => baseline?.ids.includes(row.observation.id)), ...(latest ? [latest] : [])].map(row => row.id);
    return {crewId,name,simulated:true,missionDay:samples.length,reading:current ?? null,decision,repeated,
      confirmedAlert:repeated && decision.level === 'alert' && priorDecision.level === 'alert',
      evidenceIds, latestEvidenceId:latest?.id ?? null,
      receivedAt:latest ? database.prepare(`
        SELECT bronze.ingested_at AS stamp FROM bronze JOIN silver ON silver.bronze_id=bronze.id WHERE silver.id=?
      `).get(latest.id).stamp : null,
      acknowledgedAt:latest ? database.prepare('SELECT acknowledged_at FROM mission_ack WHERE evidence_id=?').get(latest.id)?.acknowledged_at ?? null : null,
      recent:samples.slice(-8).map(row => ({evidenceId:row.id,value:row.observation.value,observedAt:row.observation.observedAt})),
    };
  }

  function reportMember(id, bone) {
    const rows = observations(domain, scenario(id));
    const member = snapshot(id,rows);
    const lower = member.reading?.observedAt - (settings.window - 1) * SOL;
    const history = member.reading ? rows.map(row => row.observation).filter(row => row.observedAt >= lower) : [];
    const packetEvents = database.prepare(`
      SELECT silver.id, bronze.ingested_at AS received, mission_ack.acknowledged_at AS acknowledged
      FROM silver JOIN bronze ON bronze.id=silver.bronze_id
      LEFT JOIN mission_ack ON mission_ack.evidence_id=silver.id
      WHERE silver.domain=? AND silver.scenario=? AND silver.observation_id LIKE 'packet-%'
      ORDER BY silver.observed_at DESC LIMIT 30`
    ).all(domain, scenario(id));
    const timeline = packetEvents.flatMap(row => [
      {id:row.id,kind:'packet',at:row.received,label:'Synthetic resting sample received onboard'},
      ...(row.acknowledged ? [{id:row.id + ':ack',kind:'cmo-ack',at:row.acknowledged,label:'CMO acknowledged the reading'}] : []),
    ]);
    const lineage = database.prepare(`
      SELECT bronze.id AS bronzeId, bronze.raw_json AS raw, bronze.source_json AS source,
        silver.id AS silverId,silver.normalized_json AS normalized
      FROM silver JOIN bronze ON bronze.id=silver.bronze_id WHERE silver.id=?`
    );
    const heartRecords = member.evidenceIds.map(key => lineage.get(key));
    const boneRecords = bone?.evidenceIds.map(key => lineage.get(key)) ?? [];
    const evidence = {
      bronze:[...heartRecords,...boneRecords].map(row => ({id:row.bronzeId,raw:JSON.parse(row.raw),source:JSON.parse(row.source)})),
      silver:[...heartRecords,...boneRecords].map(row => ({id:row.silverId,bronzeId:row.bronzeId,observation:JSON.parse(row.normalized)})),
      gold:[
        ...(member.latestEvidenceId ? [{id:'gold:' + scenario(id),decision:member.decision,evidenceIds:member.evidenceIds}] : []),
        ...(bone ? [{id:bone.id,decision:bone.decision,evidenceIds:bone.evidenceIds}] : []),
      ],
    };
    return {...member,history,bone,timeline,evidence};
  }

  function updateGold(id, state) {
    const key = scenario(id);
    database.prepare(`INSERT INTO gold VALUES (?,?,?,?,?)
      ON CONFLICT(domain,scenario) DO UPDATE SET snapshot_json=excluded.snapshot_json,updated_at=excluded.updated_at
    `).run('gold:' + key, domain, key, JSON.stringify(state), at());
    return state;
  }

  function referenceFor(member) {
    const random = seeded(seed + member.offset);
    return Array.from({length:14}, (_,index) => {
      const day = index - 13;
      const raw = reading('history-' + day, Math.round(57 + random()*8 + member.offset), ORIGIN + day*SOL);
      return {...raw,crewId:member.id,source:'Synthetic mission reference'};
    });
  }

  function seedHistory(member) {
    const key = scenario(member.id);
    if (observations(domain,key).length) return;
    // Fixed synthetic personal history. Each packet advances that member by one sol.
    for (const row of referenceFor(member)) insertObservation(domain,key,row,'mission-reference-v1');
  }

  function getCrew(id) {
    const member = getMember(id);
    const state = snapshot(id);
    const firstTime = ORIGIN + SOL;
    const sample = {...reading('preview',61 + member.offset,firstTime),crewId:id};
    const {mean,sd} = state.decision.baseline ?? decide(sample,referenceFor(member),firstTime,settings).baseline;
    const profiles = {steady:Math.round(mean),elevated:Math.ceil(mean + settings.watch*sd),high:Math.ceil(mean + (settings.alert + 1)*sd)};
    return {...state, profiles};
  }

  function receiveDueReports() {
    database.prepare(`UPDATE mission_report SET status='delivered',
      delivered_at=(SELECT due_at FROM mission_report_delay WHERE id=mission_report.id)
      WHERE status='queued' AND id IN (SELECT id FROM mission_report_delay WHERE due_at<=?)`).run(at());
  }

  function getReports() {
    receiveDueReports();
    return database.prepare(`SELECT mission_report.*, minutes, due_at FROM mission_report
      LEFT JOIN mission_report_delay USING (id) ORDER BY created_at DESC,mission_report.rowid DESC`).all().map(row => ({
      id:row.id, kind:row.kind, status:row.status, createdAt:row.created_at,
      deliveredAt:row.delivered_at, reviewedAt:row.reviewed_at,
      delayMinutes:row.minutes, dueAt:row.due_at,
      crew:row.status === 'queued' ? null : JSON.parse(row.snapshot_json),
    }));
  }

  function getGround() {
    const actions = database.prepare('SELECT payload_json FROM mission_ground_action').all().map(row => JSON.parse(row.payload_json));
    return buildGround(getReports(),actions);
  }

  return {
    getCrew,
    getGround,
    getCmo() { return {crew:crew.map(member => snapshot(member.id))}; },

    ingest(id, {packetId,value,simulated} = {}) {
      const member = getMember(id);
      if (simulated !== true || typeof packetId !== 'string' || !/^[a-f0-9]{32}$/.test(packetId) ||
          !Number.isInteger(value) || value < 35 || value > 150) {
        reject('Submit a valid synthetic resting sample and packet ID.');
      }
      return transaction(() => {
        seedHistory(member);
        const key = scenario(id);
        const rows = observations(domain,key);
        const observationId = 'packet-' + packetId;
        const existing = rows.find(row => row.observation.id === observationId);
        if (existing) {
          if (existing.observation.value !== value) reject('Packet ID already exists with a different value.',409);
          return {duplicate:true,packetEvidenceId:existing.id,state:getCrew(id)};
        }
        const latestPacket = rows.filter(row => row.observation.id.startsWith('packet-')).at(-1);
        const observedAt = (latestPacket?.observation.observedAt ?? ORIGIN) + SOL;
        const raw = reading(observationId,value,observedAt);
        insertObservation(domain,key,{...raw,crewId:id,source:'Synthetic crew browser simulator'},'mission-phone-v1');
        const state = updateGold(id,snapshot(id));
        return {duplicate:false,packetEvidenceId:state.latestEvidenceId,state:getCrew(id)};
      });
    },

    acknowledge({crewId,evidenceId,confirmed} = {}) {
      if (confirmed !== true) reject('Confirm the CMO acknowledgement.');
      return transaction(() => {
        const state = snapshot(crewId);
        if (!evidenceId || state.latestEvidenceId !== evidenceId) reject('The selected reading changed. Refresh and review the latest reading.',409);
        if (!['watch','alert'].includes(state.decision.level)) reject('Only WATCH or ALERT readings can be acknowledged.');
        database.prepare('INSERT OR IGNORE INTO mission_ack VALUES (?,?)').run(evidenceId,at());
        return updateGold(crewId,snapshot(crewId));
      });
    },

    getReports,

    queueReport({kind} = {}) {
      if (!['daily','weekly'].includes(kind)) reject('Select a daily or weekly training report.');
      return transaction(() => {
        const bone = boneState();
        const roster = crew.map(member => reportMember(member.id,bone.current?.crewId === member.id ? bone : null));
        if (!roster.some(member => member.reading)) reject('Receive a crew reading before queuing a report.');
        const id = reportId();
        const createdAt = at();
        const delayMinutes = 3 + (seed + database.prepare('SELECT count(*) AS n FROM mission_report').get().n) % 20;
        const dueAt = new Date(Date.parse(createdAt) + delayMinutes * 60000).toISOString();
        database.prepare('INSERT INTO mission_report VALUES (?,?,?,?,?,NULL,NULL)')
          .run(id,kind,'queued',JSON.stringify(roster),createdAt);
        database.prepare('INSERT INTO mission_report_delay VALUES (?,?,?)').run(id,delayMinutes,dueAt);
        return {id,kind,status:'queued',delayMinutes,dueAt};
      });
    },

    updateReport({id,action} = {}) {
      if (typeof id !== 'string' || !['deliver','review'].includes(action)) reject('Select a report action.');
      return transaction(() => {
        receiveDueReports();
        const report = database.prepare('SELECT status FROM mission_report WHERE id=?').get(id);
        if (!report) reject('Report not found.',404);
        if (action === 'deliver' && report.status === 'queued') {
          database.prepare("UPDATE mission_report SET status='delivered',delivered_at=? WHERE id=?").run(at(),id);
        } else if (action === 'review' && report.status === 'delivered') {
          database.prepare("UPDATE mission_report SET status='reviewed',reviewed_at=? WHERE id=?").run(at(),id);
        } else {
          reject('This report is no longer in the required state.',409);
        }
        return {id,status:action === 'deliver' ? 'delivered' : 'reviewed'};
      });
    },

    saveGroundAction(input) {
      return transaction(() => {
        const row = typeof input?.requestId === 'string'
          ? database.prepare('SELECT payload_json FROM mission_ground_action WHERE id=?').get(input.requestId) : null;
        const previous = row ? JSON.parse(row.payload_json) : null;
        const result = groundAction({crew:getGround().crew,previous,at:at()},input);
        if (!result.duplicate) database.prepare('INSERT INTO mission_ground_action VALUES (?,?)')
          .run(result.entry.id,JSON.stringify(result.entry));
        return result;
      });
    },
  };
}
