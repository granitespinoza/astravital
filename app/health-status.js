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

export function healthStatusText(state) {
  const {icon, code, label} = healthStatus(state);
  return `${icon} ${code} · ${label}`;
}
