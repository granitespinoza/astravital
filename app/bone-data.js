// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
export const BONE_CONTRACT_ID = 'astravital.bone-measurement.v1';
export const BONE_DOMAIN_ID = 'bone';
export const boneScenarios = Object.freeze({missing:'No bone measurement', change:'Comparable measurement change', stable:'Within assumed precision', mismatch:'Incompatible sides', 'missing-lsc':'Precision basis unavailable'});

export function getBoneScenario(id = 'change') {
  if (!Object.hasOwn(boneScenarios, id)) throw new Error('Unknown bone scenario.');
  const seed = 142;
  let state = seed >>> 0;
  const random = () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  const value = Math.round((0.99 + random() * 0.02) * 100) / 100;
  const make = (suffix, observedAt, measured) => ({
    contractId:BONE_CONTRACT_ID, domain:BONE_DOMAIN_ID, id:'bone-' + suffix,
    crewId:'crew-03', indicator:'areal_bmd', region:'total_hip', side:'left', method:'DXA', unit:'g/cm2',
    value:measured, observedAt, calibrationId:'dxa-demo-cal-01', quality:'ok',
    precision:{lscPercent:2.5, assessmentId:'synthetic-precision-01', basis:'synthetic assumption'},
    source:{type:'synthetic', generator:'bone-fixture-v1', seed}, simulated:true,
  });
  const records = id === 'missing' ? [] : [make('baseline', '2026-05-15T07:05:00Z', value), make('current', '2026-11-15T07:05:00Z', Number((value + (id === 'stable' ? -0.01 : -0.03)).toFixed(3)))];
  if (id === 'mismatch') records[1].side = 'right';
  if (id === 'missing-lsc') for (const record of records) record.precision = null;
  return {id, label:boneScenarios[id], seed, origin:'synthetic bone fixture v1', records};
}
