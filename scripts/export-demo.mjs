// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// Exports the seed-142 states computed by the real local database, so the browser web demo
// can run the same dialogue policy (server/assistant.mjs) without a server. Synthetic data only.
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createDatabase} from '../server/database.mjs';

const db = createDatabase({path: ':memory:', seed: 142});
const base = {cardiovascular: db.getState('cardiovascular'), bone: db.getState('bone')};
const {seed, counts} = db.getEvidence();
const performed = db.repeatReading({scenario: base.cardiovascular.scenario}).state;
const heart = db.requestReview({domain: 'cardiovascular', scenario: base.cardiovascular.scenario, confirmed: true, requestId: 'web-demo-heart'});
const bone = db.requestReview({domain: 'bone', scenario: base.bone.scenario, confirmed: true, requestId: 'web-demo-bone'});
db.close();

const snapshot = {
  generatedBy: 'scripts/export-demo.mjs',
  note: 'Synthetic seed-142 states computed by server/database.mjs for the browser web demo. Not NASA or patient data.',
  seed,
  simulated: true,
  states: {
    cardiovascular: {base: base.cardiovascular, performed, requested: heart.state},
    bone: {base: base.bone, requested: bone.state},
  },
  reviews: {cardiovascular: heart.review, bone: bone.review},
  evidence: {seed, counts},
};
const out = fileURLToPath(new URL('../app/demo-snapshot.json', import.meta.url));
writeFileSync(out, JSON.stringify(snapshot, null, 1) + '\n');
console.log(`Web demo snapshot: heart ${base.cardiovascular.scenario}/${base.cardiovascular.state}, bone ${base.bone.scenario}/${base.bone.state}.`);
