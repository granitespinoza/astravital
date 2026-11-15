// AI assistance: OpenAI Codex. Additive SQLite storage; no migration or external transport.
import {createMessage,changeMessage,visibleMessages} from '../app/case-messages.js';
export function createCaseMessages(database,transaction,clock) {
  database.exec('CREATE TABLE IF NOT EXISTS case_messages (id TEXT PRIMARY KEY, payload_json TEXT NOT NULL)');
  const all=()=>database.prepare('SELECT payload_json FROM case_messages ORDER BY rowid').all().map(row=>JSON.parse(row.payload_json));
  return input => transaction(()=>{
    const entries=all(), context={crewId:input.crewId,domain:input.domain,evidenceId:input.evidenceId};
    if (input.action==='list') return visibleMessages(entries,context,input.actor);
    let entry;
    if (input.action==='send') {
      const row=database.prepare('SELECT domain,normalized_json FROM silver WHERE id=?').get(input.evidenceId ?? '');
      const valid=row && row.domain===input.domain && JSON.parse(row.normalized_json).crewId===input.crewId;
      entry=createMessage(input,{context:valid?context:null,previous:entries.find(item=>item.id===input.requestId),at:new Date(clock()).toISOString()}).entry;
    } else {
      const previous=entries.find(item=>item.id===input.id && item.crewId===input.crewId && item.domain===input.domain);
      if (!previous) throw Object.assign(new Error('Message not found.'),{status:404});
      entry=changeMessage(previous,input,new Date(clock()).toISOString());
    }
    database.prepare('INSERT INTO case_messages VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json').run(entry.id,JSON.stringify(entry));
    return JSON.parse(database.prepare('SELECT payload_json FROM case_messages WHERE id=?').get(entry.id).payload_json);
  });
}
