// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {voiceCapabilities} from './transcribe.mjs';
import {DatabaseSync} from 'node:sqlite';
const db=new DatabaseSync(':memory:');db.close();
const voice=await voiceCapabilities();
console.log(JSON.stringify({node:process.versions.node,sqlite:true,voice,next:voice.ready?'Run npm run demo, then enable microphone in the browser.':'Run npm run setup:voice.'},null,2));
if(!voice.ready)process.exitCode=1;
