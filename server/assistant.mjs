// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
// A bounded local dialogue policy grounded in SQLite snapshots, not a free-form LLM.
// Web Crypto keeps this exact dialogue policy runnable both in Node and in the browser web demo.
const randomUUID = () => globalThis.crypto.randomUUID();
const fold = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim().replace(/^astra(?:\s+|[,!:]\s*)/,'');
const confirms = new Set(['confirmar','confirmo','confirmo guardar','confirmar guardado','si confirmo','si, confirmo','confirm','confirm save','confirm review','yes confirm','yes, confirm']);
const signed = value => (value > 0 ? '+' : '') + value.toFixed(2);
const traceKey = state => JSON.stringify({domain:state.domain,scenario:state.scenario,evidenceIds:state.evidenceIds,state:state.state,performed:state.performed});

function describe(state, detail = 'status') {
  const data = state.decision;
  if (detail === 'status' || detail === 'current') {
    if (state.requested) return 'Your review request is saved here. It has not been delivered to a clinician or Earth. I can show the details whenever you need them.';
    if (state.domain === 'bone') {
      if (!data.current) return 'I don’t have a usable bone check to compare. Open the details to see what information is missing.';
      if (!data.comparable) return 'I can’t compare these bone checks reliably. Open the details to see which measurement information differs.';
      if (data.significance === 'not-established') return 'Your bone checks need a clear precision reference before I can interpret their change. Open the details to see what is missing.';
      if (data.significance === 'exceeds-measurement-lsc') return 'Your latest bone check shows a change worth reviewing. I can prepare the measurements for onboard medical review.';
      return 'Your latest bone check shows no change beyond the assumed measurement precision. I can show the comparison if you’d like.';
    }
    if (data.quality !== 'ok' || !state.reading) return 'I can’t assess your current heart reading. Check the source or history before trying again.';
    if (data.level === 'ok') return 'Your heart reading is within your usual range for this simulation. I can show the details if you’d like.';
    if (state.performed) return 'The repeat still differs from your usual range. I can prepare it for onboard review.';
    return 'Your heart reading has changed from your usual range. Check it again when you can pause your task.';
  }
  if (state.domain === 'bone') {
    if (!data.current) return 'No usable bone measurement is available. Heart rate and the body image cannot supply a bone measurement.';
    const region = data.current.region === 'total_hip' ? 'total hip' : data.current.region;
    const current = `Latest bone measurement: ${data.current.value.toFixed(3)} g/cm², ${region}, ${data.current.side} side, ${data.current.observedAt.slice(0,10)}, using ${data.current.method}.`;
    if (!data.comparable) return current + ' The pair is not comparable: ' + data.reasons.join(', ') + '. No health trend is inferred.';
    const change = `Measurement change: ${signed(data.percentChange)}%, from ${data.baseline.value.toFixed(3)} g/cm² on ${data.baseline.observedAt.slice(0,10)}.`;
    const precision = data.significance === 'not-established' ? 'Without a consistent LSC basis, significance is not established.' :
      data.significance === 'exceeds-measurement-lsc' ? `It exceeds the assumed synthetic LSC of ${data.lscPercent}%; this describes a measurement, not disease.` : `It stays within the assumed synthetic LSC of ${data.lscPercent}%; this does not establish clinical bone health.`;
    return current + ' ' + change + ' ' + precision + ' These are evaluations months apart, not continuous telemetry or a diagnosis of osteoporosis, porosity or fracture.';
  }
  if (data.quality !== 'ok' || !state.reading) return `Data quality is ${data.quality}. No current health value or deviation is assessed from unsuitable data. Check the source or history.`;
  return `Simulated resting heart rate: ${state.reading.value} bpm; ${state.label}. ` +
    (data.baseline && Number.isFinite(data.z) ? `Personal reference ${data.baseline.mean.toFixed(1)} ± ${data.baseline.sd.toFixed(1)} bpm, n=${data.baseline.n}; z=${signed(data.z)}. WATCH at |z|≥2 and ALERT at |z|≥3 are simulation settings. ` : '') +
    (state.performed ? 'The repeat keeps the original reference instead of absorbing the change. ' : 'A simulated repeat can check whether the deviation persists. ') + 'This is not a diagnosis and does not locate an injury or identify a cause.';
}

export function respond(db, {text = '', sessionId, scenario, boneScenario} = {}) {
  if (typeof text !== 'string' || text.length > 2000) throw new Error('A text message of at most 2000 characters is required.');
  const id = typeof sessionId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(sessionId) ? sessionId : randomUUID();
  const context = db.getSession(id) ?? {domain:'cardiovascular',scenarios:{cardiovascular:'deviation',bone:'change'},pending:null,muted:false};
  context.scenarios ??= {cardiovascular:'deviation',bone:'change'};
  const message = fold(text);
  const selected = /\b(huesos?|ose[oa]s?|bones?|dxa|densidad|cadera|hip)\b/.test(message) ? 'bone' : /\b(corazon|cardio(?:vascular)?|pulso|pulse|bpm|heart|cardiac)\b/.test(message) ? 'cardiovascular' : context.domain;
  if (selected !== context.domain) { context.domain = selected; context.pending = null; }
  if (boneScenario !== undefined) { db.getState('bone',boneScenario); if (context.scenarios.bone !== boneScenario) context.pending=null;context.scenarios.bone=boneScenario; }
  if (scenario !== undefined) { db.getState(context.domain,scenario);if(context.scenarios[context.domain]!==scenario)context.pending=null;context.scenarios[context.domain]=scenario; }
  let state = db.getState(context.domain,context.scenarios[context.domain]);
  const finish = (action, response, extra = {}) => {
    db.saveSession(id,context);
    return {sessionId:id,text:response,domain:context.domain,action,evidenceIds:[state.id,...state.evidenceIds],state,pending:context.pending ? {requestId:context.pending.requestId,domain:context.pending.domain,scenario:context.pending.scenario,expiresAt:context.pending.expiresAt} : null,muted:context.muted,simulated:true,...extra};
  };
  if (/\b(cancelar|cancela|cancel|no confirmes|no confirmar|no guardes|no guardar|do not save|don't save)\b/.test(message) || /\b(do not|don't|dont|no)\s+(confirm|save|request|repeat|check|guardar|confirmar|repetir|solicitar)\b/.test(message)) {
    context.pending=null;return finish('review-cancelled',"Cancelled. I did not save a new review request.");
  }
  if (/^(silencio|silenciar|mute|mute audio|apaga el audio|no quiero audio)$/.test(message)) { context.muted=true;return finish('mute',"Audio muted. Text and controls remain available."); }
  if (/^(activar audio|activa el audio|unmute|unmute audio)$/.test(message)) { context.muted=false;return finish('unmute',"Audio enabled by your choice."); }
  if (/\b(earth|tierra|ground control|doctors on earth)\b/.test(message)) return finish('status', 'Earth is unavailable in this simulation. I haven’t contacted anyone. I can help you prepare a local onboard review instead.');
  if (/^(hello|hi|hey|hola|good morning)(?:[,! ]+astra)?[!.?]*$/.test(message)) return finish('greeting', 'Hi, I’m Astra. I can help you understand your heart and bone readings. What would you like to check?');
  if (/^(thanks|thank you|thank you astra|gracias|muchas gracias)[!.?]*$/.test(message)) return finish('acknowledge', 'You’re welcome. I’m here when you want to check a reading or take the next step.');
  if (/\b(how can you help|what can you do|que puedes hacer|como puedes ayudar)\b/.test(message)) return finish('help', 'I can check heart or bone status, explain a change, compare measurements, or prepare an onboard review. Saving a request always needs your separate confirmation.');
  if (/\b(what should i do|what next|next step|que hago|que deberia hacer)\b/.test(message)) return finish('status', describe(state));
  if (/\b(i feel|i'm feeling|me siento|dizzy|maread\w*|pain|dolor)\b/.test(message)) return finish('acknowledge', 'I’m sorry you’re feeling unwell. Please tell your onboard medical officer. I can show your readings, but they can’t identify the cause.');
  const asksReview = /\b(solicit\w*\s+(?:una\s+)?revision|pedir\s+(?:una\s+)?revision|request\s+(?:a\s+)?review|human review)\b/.test(message);
  if (asksReview) {
    const eligible=state.domain==='cardiovascular' ? state.performed && ['watch','alert'].includes(state.decision.level) : state.decision.comparable && state.decision.significance==='exceeds-measurement-lsc';
    if (state.requested) return finish('status',"Your review request is already saved here. It has not been delivered to a clinician or Earth.");
    if (!eligible) return finish('review-unavailable',state.domain==='cardiovascular' ? "Check the reading again first. I’ll prepare a review after a valid repeat confirms the change." : "These measurements aren’t ready for this review workflow. Open the details to see what is missing or incompatible.");
    if (!context.pending || context.pending.fingerprint !== traceKey(state)) context.pending={requestId:randomUUID(),domain:context.domain,scenario:state.scenario,fingerprint:traceKey(state),expiresAt:Date.now()+5*60000};
    return finish('review-confirmation-required',"Save a request for onboard review? It stays here and is not delivered to a clinician or Earth. Say “Confirm save” or “Cancel” in a separate turn.");
  }
  if (confirms.has(message)) {
    const pending=context.pending;
    if (!pending) return finish('confirmation-unavailable',"There is no review request awaiting confirmation. Nothing was saved.");
    if (pending.expiresAt < Date.now() || pending.domain!==context.domain || pending.scenario!==state.scenario || pending.fingerprint!==traceKey(state)) { context.pending=null;return finish('confirmation-expired',"The context changed or confirmation expired. Request a review again; nothing was saved."); }
    try {
      const result=db.requestReview({domain:pending.domain,scenario:pending.scenario,confirmed:true,requestId:pending.requestId});
      state=result.state;context.pending=null;
      return finish('review-saved',"Saved and checked in the local record. Nothing has been delivered to a clinician or Earth.",{saved:true,review:result.review,duplicate:result.duplicate});
    } catch (error) { return finish('error',"I couldn’t verify the save. There is no success confirmation. You can confirm again or cancel.",{saved:false,errorCode:error.code ?? 'save-failed'}); }
  }
  if (/\b(repetir (?:la )?(?:lectura|medicion)|repite (?:la )?(?:lectura|medicion)|medir de nuevo|volver a medir|check again|repeat (?:reading|heart))\b/.test(message)) {
    context.pending=null;
    if(context.domain!=='cardiovascular')return finish('repeat-unavailable',"A bone check needs another compatible, dated measurement. It cannot be repeated like the simulated heart reading.");
    try { const result=db.repeatReading({scenario:state.scenario});state=result.state;return finish('repeat-complete',"Check repeated using the original reference. " + describe(state)); }
    catch(error) { return finish('repeat-unavailable',"I can’t repeat this reading. Check the source or history; I won’t replace missing measurements with an invented health result."); }
  }
  if (/\b(osteoporosis|porosidad|fractura|fracture|porosity|diagnostico|diagnose|tratamiento|treatment)\b/.test(message)) return finish('explain',"These synthetic measurements cannot diagnose osteoporosis, porosity or fractures, or prescribe treatment. I can explain what the measurements support.");
  if (/\b(por que|porque|explica\w*|why|explain|razon|causa|show medical details|medical details|detalles medicos)\b/.test(message)) return finish('explain',describe(state,'explain'));
  if (/\b(compara\w*|compare|cambio|diferencia|antes|tendencia)\b/.test(message)) return finish('compare',describe(state,'compare'));
  if (/\b(actual|ahora|current|latest|ultimo|valor)\b/.test(message)) return finish('status',describe(state,'current'));
  if (/\b(estado|status|como estoy|how am i|huesos?|bones?|corazon|heart|pulse|pulso)\b/.test(message) ) return finish('status',describe(state));
  return finish('clarify',"I can check heart or bone status, explain a change, compare measurements, or prepare a review. Saving needs your separate confirmation.");
}
