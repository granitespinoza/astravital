// AI assistance: OpenAI Codex. Human-reviewed messages, kept separate from internal medical notes.
import {caseKey,messageLabel,roleNames,MESSAGE_KEY} from './case-messages.js';
const el=(tag,text='',css='')=>{const n=document.createElement(tag);n.textContent=text;n.className=css;return n;};
const time=value=>new Date(value).toISOString().slice(0,16).replace('T',' ')+' UTC';
export function createCaseThread(host,{request,localOnly=false}) {
  const title=el('h2','Case conversation'), contextLine=el('p','','case-context');
  const boundary=el('p',localOnly?'Shared browser rehearsal · Saved locally · Not delivered. Open the doctor view in this browser to continue the case.':'Onboard record · Earth receipt is explicitly simulated. No external clinician is contacted.','case-hint');
  const list=el('ol','','case-message-list');list.setAttribute('aria-label','Case messages');
  const form=el('form'), label=el('label','Message to'), recipient=el('select');
  recipient.id=host.id+'-recipient';label.htmlFor=recipient.id;
  const textLabel=el('label','Your message'), text=el('textarea');
  text.id=host.id+'-text';textLabel.htmlFor=text.id;text.rows=3;text.maxLength=1000;text.placeholder='Write to your medical team…';
  const counter=el('small','Draft · 0 / 1000 characters');
  const actions=el('div','','case-actions'), draft=el('button','Use Astra summary'), preview=el('button','Review message');
  draft.type='button';preview.type='submit';actions.append(draft,preview);
  const confirm=el('section','','case-preview');confirm.hidden=true;confirm.setAttribute('aria-label','Confirm case message');
  const previewText=el('p'),previewContext=el('p','','case-hint'),save=el('button',localOnly?'Confirm save locally':'Confirm save'),cancel=el('button','Cancel');
  save.type=cancel.type='button';confirm.append(el('h3','Review before saving'),previewContext,previewText,save,cancel);
  const feedback=el('p','','case-feedback');feedback.setAttribute('role','status');
  form.append(label,recipient,textLabel,text,counter,actions);
  host.classList.add('case-thread');host.append(title,contextLine,boundary,list,form,confirm,feedback);
  let context, pending, retry, queuedContext, busy=false, generation=0, assisted=false;
  const drafts=new Map();
  const fingerprint=c=>JSON.stringify([c?.crewId,c?.domain,c?.evidenceId,c?.role]);
  const draftKey=c=>caseKey(c)+':'+c.role;
  function controls(){text.disabled=recipient.disabled=draft.disabled=preview.disabled=busy||!context?.evidenceId||Boolean(pending);save.disabled=cancel.disabled=busy;}
  function remember(){if(context)drafts.set(draftKey(context),{text:text.value,recipient:recipient.value,assisted});}
  function count(){counter.textContent=`Draft · ${text.value.length} / 1000 characters${assisted?' · Astra-assisted, review before saving':''}`;}
  function settled(){busy=false;controls();if(queuedContext){const next=queuedContext;queuedContext=null;view.render(next);}}
  text.oninput=()=>{assisted=false;retry=null;remember();count();};recipient.onchange=()=>{retry=null;remember();};
  function actionButton(entry,action,label){
    const button=el('button',label);button.type='button';
    button.onclick=async()=>{
      if(busy)return;busy=true;controls();button.disabled=true;
      const captured={...context};
      try{await request({...captured,action,id:entry.id,actor:captured.role,confirmed:true},captured);feedback.textContent=action==='receive'?'Receipt recorded in the simulation.':'Review recorded locally. This is not a medical instruction.';await refresh();}
      catch(error){feedback.textContent=error.message;}finally{settled();button.disabled=false;}
    };return button;
  }
  async function refresh(){
    if(!context)return;const captured={...context}, token=++generation;
    try{
      const entries=await request({...captured,action:'list',actor:captured.role},captured);
      if(token!==generation)return;
      list.replaceChildren(...entries.map(entry=>{
        const item=el('li','','case-message');item.dataset.sender=entry.sender;
        item.append(el('strong',roleNames[entry.sender]+' → '+roleNames[entry.recipient]),el('small',time(entry.createdAt)),
          el('p',entry.text??'Message content withheld until simulated receipt.'),el('p',messageLabel(entry),'case-status'));
        if(entry.assisted)item.append(el('small','Drafted with Astra · confirmed by '+roleNames[entry.sender]));
        const lineage=el('details');lineage.append(el('summary','Reference and message history'),el('p',entry.evidenceId));
        for(const event of entry.events)lineage.append(el('p',`${event.kind} · ${roleNames[event.actor]} · ${time(event.at)}`));
        item.append(lineage);
        if(entry.recipient===captured.role){
          if(entry.status==='queued'&&!entry.localOnly)item.append(actionButton(entry,'receive','Simulate message receipt'));
          else if(entry.status!=='reviewed'&&captured.role!=='crew')item.append(actionButton(entry,'review','Mark message reviewed'));
        }
        return item;
      }));
      if(!entries.length)list.append(el('li','No messages in this case yet. Internal medical notes are not sent here.','case-hint'));
    }catch(error){if(token===generation)feedback.textContent='Messages unavailable: '+error.message;}
  }
  draft.onclick=()=>{if(!context)return;text.value=context.summary??'Please review the measurements attached to this case.';assisted=true;retry=null;remember();count();text.focus();};
  form.onsubmit=event=>{
    event.preventDefault();if(busy||!context?.evidenceId)return;
    if(!text.value.trim()||text.value.length>1000){feedback.textContent='Write a message of 1–1000 characters.';text.focus();return;}
    const input={crewId:context.crewId,domain:context.domain,evidenceId:context.evidenceId,sender:context.role,recipient:recipient.value,text:text.value.trim(),assisted};
    const key=JSON.stringify(input);retry=retry?.key===key?retry:{key,requestId:crypto.randomUUID()};
    pending={...input,requestId:retry.requestId,context:fingerprint(context)};
    previewContext.textContent=`${context.name} · ${context.domain==='bone'?'Left hip':'Resting heart rate'} · To: ${roleNames[input.recipient]} · ${localOnly?'Local save only; not delivered.':'Saved onboard; any Earth receipt is simulated.'}`;
    previewText.textContent=input.text;confirm.hidden=false;feedback.textContent='Preview only · nothing has been saved.';controls();save.focus();
  };
  cancel.onclick=()=>{pending=null;confirm.hidden=true;feedback.textContent='Cancelled. No message was saved.';controls();text.focus();};
  save.onclick=async()=>{
    if(busy||!pending)return;
    if(pending.context!==fingerprint(context)){pending=null;confirm.hidden=true;feedback.textContent='The case changed. Review the message again.';controls();return;}
    busy=true;controls();
    try{
      const entry=await request({...pending,action:'send',confirmed:true},context);
      feedback.textContent=messageLabel(entry)+'.';pending=null;retry=null;confirm.hidden=true;text.value='';assisted=false;remember();count();await refresh();
    }catch(error){feedback.textContent=error.message+' Nothing new was confirmed. Retry keeps the same request ID.';}
    finally{settled();}
  };
  addEventListener('storage',event=>{if(event.key===MESSAGE_KEY)void refresh();});addEventListener('focus',()=>void refresh());
  const view = {
    render(next){
      if(busy){queuedContext=next;return;}
      const changed=fingerprint(context)!==fingerprint(next);
      if(changed){
        remember();if(pending)feedback.textContent='The case changed. The previous preview was cancelled; no message was saved.';
        pending=null;confirm.hidden=true;context={...next};
        const saved=drafts.get(draftKey(context));
        recipient.replaceChildren(...Object.entries(roleNames).filter(([role])=>role!==context.role).map(([role,name])=>new Option(name,role)));
        recipient.value=saved?.recipient??(context.role==='crew'?(localOnly?'ground':'cmo'):'crew');
        text.value=saved?.text??'';assisted=saved?.assisted??false;count();
      }else context={...next};
      contextLine.textContent=`${context.name} · ${context.domain==='bone'?'Left hip':'Resting heart rate'} · You are: ${roleNames[context.role]}`;
      if(!context.evidenceId)feedback.textContent='No source measurement is available for this case. Choose a measured domain.';
      controls();void refresh();
    },refresh,
    focus(){host.scrollIntoView({block:'start',behavior:'smooth'});text.focus({preventScroll:true});},
  };
  return view;
}
