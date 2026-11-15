// AI assistance: OpenAI Codex. Shared case-message contract; no medical inference or external delivery.
export const MESSAGE_KEY = 'astravital-case-messages-v1';
export const roleNames = {crew:'Astronaut',cmo:'Onboard medical officer',ground:'Earth doctor (simulated)'};
const reject = (text, status = 400) => { throw Object.assign(new Error(text),{status}); };
const idValid = value => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,160}$/.test(value);
export function caseKey(context) { return context.crewId + ':' + context.domain; }
export function messageContext(member,domain,role) {
  const state=domain==='bone'?(member.bone??(member.domain==='bone'?member:null)):member;
  const current=state?.current??state?.reading??state?.decision?.current;
  const evidenceId=state?.latestEvidenceId??state?.evidenceIds?.find(id=>current?.id && id.endsWith(':'+current.id));
  return {crewId:member.crewId??current?.crewId??'crew-03',name:member.name??'Alex Morgan',domain,role,evidenceId,
    summary:domain==='bone' ? state?.decision?.message??'Please review the available bone measurements.' :
      (state?.reading?`${role==='crew'?'My':'The attached'} resting pulse measurement is ${state.reading.value} bpm. `:'')+(state?.decision?.reason??'Please review the attached evidence.')};
}
export function messageLabel(message) {
  if (message.localOnly) return message.status === 'reviewed' ? 'Reviewed locally · Not delivered' : 'Saved locally · Not delivered';
  if (message.status === 'reviewed') return 'Reviewed by doctor · simulation';
  if (message.status === 'received') return message.recipient === 'ground' ? 'Received by ground system · simulation' : 'Received onboard · simulation';
  if (message.status === 'queued') return message.recipient === 'ground' ? 'Queued for Earth · simulation' : 'Queued for onboard receipt · simulation';
  return 'Saved onboard';
}
export function createMessage(input, {context,previous,at,localOnly = false}) {
  if (input?.confirmed !== true) reject('Review the final message and confirm saving it.');
  if (!idValid(input.requestId)) reject('A stable message request ID is required.');
  if (!Object.hasOwn(roleNames,input.sender) || !Object.hasOwn(roleNames,input.recipient) || input.sender === input.recipient) reject('Choose a different participant as the recipient.');
  if (typeof input.text !== 'string' || !input.text.trim() || input.text.length > 1000) reject('Write a message of 1–1000 characters.');
  if (!/^crew-0[1-4]$/.test(input.crewId) || !['cardiovascular','bone'].includes(input.domain)) reject('Choose an available crew case.');
  const entry = {id:input.requestId,crewId:input.crewId,domain:input.domain,evidenceId:input.evidenceId,
    sender:input.sender,recipient:input.recipient,text:input.text.trim(),assisted:input.assisted === true};
  if (previous) {
    if (Object.keys(entry).some(key => entry[key] !== previous[key])) reject('This request ID already belongs to a different message.',409);
    return {entry:previous,duplicate:true};
  }
  if (!context || context.crewId !== entry.crewId || context.domain !== entry.domain || !entry.evidenceId || context.evidenceId !== entry.evidenceId) reject('The case evidence changed or is unavailable. Reopen the message preview.',409);
  return {entry:{...entry,createdAt:at,localOnly,status:localOnly ? 'local' : [entry.sender,entry.recipient].includes('ground') ? 'queued' : 'onboard',
    events:[{kind:localOnly ? 'saved-locally' : entry.sender==='ground'?'saved-ground-simulation':'saved-onboard',actor:entry.sender,at}]},duplicate:false};
}
export function changeMessage(entry,input,at) {
  if (input?.confirmed !== true || !['receive','review'].includes(input.action)) reject('Confirm a supported message action.');
  if (input.actor !== entry.recipient) reject('Only the recipient can record this action.',403);
  if (input.action === 'receive' && entry.localOnly) reject('Browser-only messages cannot be marked as delivered.');
  if (input.action === 'receive' && entry.status !== 'queued') return entry;
  if (input.action === 'review' && !['cmo','ground'].includes(input.actor)) reject('Only the medical reviewer can mark a message reviewed.',403);
  if (input.action === 'review' && entry.status === 'queued') reject('Simulate receipt before recording a review.');
  if (input.action === 'review' && entry.status === 'reviewed') return entry;
  return {...entry,status:input.action === 'receive' ? 'received' : 'reviewed',events:[...entry.events,{kind:input.action,actor:input.actor,at}]};
}
export function visibleMessages(entries,context,viewer) {
  return entries.filter(entry => caseKey(entry) === caseKey(context)).map(entry =>
    entry.status === 'queued' && entry.sender !== viewer ? {...entry,text:null,assisted:false} : entry);
}
export function browserMessages({storage,clock = () => new Date().toISOString()} = {}) {
  const backend=()=>storage??globalThis.localStorage;
  const read = () => { const entries=JSON.parse(backend().getItem(MESSAGE_KEY) ?? '[]'); if (!Array.isArray(entries)) reject('Message storage is unreadable.'); return entries; };
  return {
    async request(input,context) {
      const run = () => {
        const entries=read();
        if (input.action === 'list') return visibleMessages(entries,context,input.actor);
        let entry;
        if (input.action === 'send') entry=createMessage(input,{context,previous:entries.find(item=>item.id===input.requestId),at:clock(),localOnly:true}).entry;
        else {
          const previous=entries.find(item=>item.id===input.id && caseKey(item)===caseKey(context));
          if (!previous) reject('Message not found.',404);
          entry=changeMessage(previous,input,clock());
        }
        const next=entries.filter(item=>item.id!==entry.id).concat(entry);
        backend().setItem(MESSAGE_KEY,JSON.stringify(next));
        const saved=read().find(item=>item.id===entry.id);
        if (JSON.stringify(saved)!==JSON.stringify(entry)) reject('The message could not be verified in storage. Retry with the same request.');
        return saved;
      };
      return typeof window!=='undefined' && globalThis.navigator?.locks ? navigator.locks.request(MESSAGE_KEY,run) : run();
    },
  };
}
