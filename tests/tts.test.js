// AI assistance: OpenAI Codex. Real synthesis is opt-in and never uses a network fallback.
import assert from 'node:assert/strict';
import test from 'node:test';
import {synthesize,validateTtsText,ttsCapabilities,ttsManifest} from '../scripts/synthesize.mjs';
test('TTS bounds plain text before loading the model',async()=>{for(const text of ['',null,'a'.repeat(501),'hello\0'])await assert.rejects(synthesize(text),{code:'INVALID_TTS_TEXT'});assert.equal(validateTtsText(' Hello. '),'Hello.');});
test('TTS manifest pins artifacts, license and local voice',()=>{assert.equal(ttsManifest.license,'Apache-2.0');assert.equal(ttsManifest.voice,'af_heart');for(const file of ttsManifest.files)assert.match(file.sha256,/^[a-f0-9]{64}$/);});
test('TTS readiness distinguishes installed dependency and verified weights',async()=>{const health=await ttsCapabilities();assert.equal(health.ready,health.installed&&health.modelReady);assert.equal(health.localOnly,true);});
test('real Kokoro synthesis with offline network guard', {skip:process.env.RUN_TTS_INTEGRATION!=='1'},async()=>{const wav=await synthesize('I am Astra, your onboard assistant. You stay in control.');assert.ok(Buffer.isBuffer(wav));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.ok(wav.length>24000);console.log('Real local Kokoro WAV bytes:',wav.length);});
