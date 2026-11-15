// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
const states = {
  ok: {code:'OK', level:'stable', icon:'✓', label:'Within reference'},
  watch: {code:'WATCH', level:'check', icon:'△', label:'Check again'},
  alert: {code:'ALERT', level:'review', icon:'!', label:'Review change'},
};

export function healthStatus(state) {
  return Object.hasOwn(states,state) ? states[state] : {
    code:state?.replaceAll('-', ' ').toUpperCase() ?? 'MISSING',
    level:'unknown', icon:'○', label:'No recent data',
  };
}

// AI assistance: Anthropic Claude. One wording for the repeat outcome in the CMO and Earth doctor views.
// "Confirmed ALERT" always means two consecutive ALERT readings in the same direction.
export function repeatOutcome({repeated, confirmedAlert} = {}) {
  if (confirmedAlert) return 'Confirmed ALERT: two consecutive ALERT readings in the same direction, against the same frozen reference.';
  if (repeated) return 'The repeat check used the same frozen reference and the deviation persisted in the same direction. A second consecutive ALERT would confirm it.';
  return null;
}

export function healthStatusText(state) {
  const {icon, code, label} = healthStatus(state);
  return `${icon} ${code} · ${label}`;
}
