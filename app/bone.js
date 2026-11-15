// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {BONE_CONTRACT_ID, BONE_DOMAIN_ID} from './bone-data.js';
export {BONE_CONTRACT_ID, BONE_DOMAIN_ID};
const keys = ['crewId', 'region', 'side', 'method', 'unit', 'calibrationId'];
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const time = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace('.000Z','Z') === value.replace('.000Z','Z');

export function assessBone(records) {
  const result = {domain:BONE_DOMAIN_ID, contractId:BONE_CONTRACT_ID, comparable:false, baseline:null, current:null, percentChange:null, significance:'not-established', message:'No bone measurement is available.', reasons:[], region:null, simulated:true, status:'no-measurement', lscPercent:null};
  if (!Array.isArray(records) || records.length === 0) return {...result, reasons:['no-measurements']};
  const invalid = records.some(record => !record || record.contractId !== BONE_CONTRACT_ID || record.domain !== BONE_DOMAIN_ID || record.indicator !== 'areal_bmd' || record.method !== 'DXA' || record.unit !== 'g/cm2' || record.simulated !== true || record.quality !== 'ok' || !Number.isFinite(record.value) || record.value <= 0 || !time(record.observedAt) || !nonempty(record.id) || keys.some(key => !nonempty(record[key])) || !record.source || record.source.type !== 'synthetic' || !nonempty(record.source.generator) || !Number.isInteger(record.source.seed));
  if (invalid) return {...result, status:'not-comparable', message:'Invalid, flagged or unsupported measurement metadata prevents comparison.', reasons:['invalid-measurement']};
  if (new Set(records.map(record => record.id)).size !== records.length) return {...result, status:'not-comparable', message:'Duplicate measurement IDs prevent an unambiguous comparison.', reasons:['duplicate-measurement-id']};
  const ordered = records.toSorted((a,b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const current = ordered.at(-1);
  if (ordered.length < 2) return {...result, current, region:current.region, message:'A previous comparable bone measurement is required.', reasons:['baseline-missing']};
  const baseline = ordered[0];
  const shared = {...result, baseline, current, region:current.region};
  const mismatches = keys.filter(key => ordered.some(record => record[key] !== baseline[key])).map(key => 'mismatched-' + key);
  if (ordered.some((record,index) => index > 0 && Date.parse(record.observedAt) <= Date.parse(ordered[index-1].observedAt))) mismatches.push('invalid-chronology');
  if (mismatches.length) return {...shared, status:'not-comparable', message:'Measurements are not comparable: ' + mismatches.join(', ') + '.', reasons:mismatches};
  const percentChange = (current.value - baseline.value) / baseline.value * 100;
  if (!Number.isFinite(percentChange)) return {...shared, status:'not-comparable', message:'Change exceeded a finite numeric range.', reasons:['numeric-range']};
  const precision = baseline.precision;
  const validPrecision = precision && Number.isFinite(precision.lscPercent) && precision.lscPercent > 0 && nonempty(precision.assessmentId) && nonempty(precision.basis) && ordered.every(record => record.precision && record.precision.lscPercent === precision.lscPercent && record.precision.assessmentId === precision.assessmentId && record.precision.basis === precision.basis);
  if (!validPrecision) return {...shared, comparable:true, percentChange, status:'precision-unknown', message:'A numerical change is observed, but its significance is not established without a coherent measurement LSC basis.', reasons:['missing-or-inconsistent-precision']};
  // Equality stays within the assumed precision boundary; tolerate only rounding error.
  const magnitude = Math.abs(percentChange);
  const tolerance = Number.EPSILON * 32 * Math.max(1, magnitude, precision.lscPercent);
  const exceeds = magnitude - precision.lscPercent > tolerance;
  return {...shared, comparable:true, percentChange, lscPercent:precision.lscPercent,
    significance:exceeds ? 'exceeds-measurement-lsc' : 'within-measurement-lsc',
    status:exceeds ? 'change-observed' : 'within-precision', reasons:[],
    message:exceeds ? 'The numerical measurement change exceeds the explicitly assumed synthetic LSC. It does not establish disease, porosity or fracture risk.' : 'The measurement change stays within the explicitly assumed synthetic LSC. This is not a statement of clinical bone health.'};
}
