// AI assistance: OpenAI Codex. Input safety and opt-in real local ASR checks.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {inspectWav, transcribeWav, voiceCapabilities, voiceManifest} from '../scripts/transcribe.mjs';

function wav(seconds = 1, sample = 1) {
  const length = Math.round(seconds * 16000) * 2;
  const buffer = Buffer.alloc(44 + length);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(length, 40);
  for (let i = 44; i < buffer.length; i += 2) buffer.writeInt16LE(sample, i);
  return buffer;
}

test('PCM duration is measured from samples, not untrusted metadata', () => {
  assert.deepEqual(inspectWav(wav(1.25, 123)), {audioDurationMs: 1250, rms: 123});
});
test('rejects truncated RIFF, chunk overflow, wrong encoding and sample rate', () => {
  const overflow = wav(); overflow.writeUInt32LE(0xFFFFFFFF, 40);
  const format = wav(); format.writeUInt16LE(3, 20);
  const stereo = wav(); stereo.writeUInt16LE(2, 22);
  const rate = wav(); rate.writeUInt32LE(48000, 24);
  for (const buffer of [Buffer.alloc(0), wav().subarray(0, 44), overflow, format, stereo, rate]) {
    assert.throws(() => inspectWav(buffer), {code: 'INVALID_WAV'});
  }
});
test('bounds capture duration and rejects silent input without native inference', async () => {
  assert.throws(() => inspectWav(wav(0.1)), {code: 'INVALID_WAV'});
  assert.throws(() => inspectWav(wav(31)), {code: 'INVALID_WAV'});
  await assert.rejects(transcribeWav(wav(1, 0)), {code: 'NO_SPEECH'});
  await assert.rejects(transcribeWav(wav(1), {language: '--help'}), {code: 'UNSUPPORTED_LANGUAGE'});
});
test('model registry pins multilingual weights, hash and attribution', () => {
  assert.equal(voiceManifest.license, 'MIT');
  for (const model of Object.values(voiceManifest.models)) {
    assert.match(model.sha256, /^[a-f0-9]{64}$/);
    assert.equal(model.multilingual, true);
  }
  assert.match(voiceManifest.licenseText, /Copyright \(c\) 2022 OpenAI/);
});
test('capabilities distinguish engine and verified model readiness', async () => {
  const health = await voiceCapabilities();
  assert.equal(health.engine, 'whisper.cpp');
  assert.equal(typeof health.binaryInstalled, 'boolean');
  assert.equal(typeof health.modelReady, 'boolean');
  assert.equal(health.ready, health.binaryInstalled && health.modelReady);
});
test('real Spanish ASR on local synthetic speech, not a human microphone test', {skip: process.env.RUN_VOICE_INTEGRATION !== '1'}, async () => {
  const result = await transcribeWav(await readFile(new URL('../data/voice-test-es.wav', import.meta.url)), {language: 'es'});
  assert.equal(result.engine, 'whisper.cpp');
  assert.equal(result.language, 'es');
  assert.match(result.text.toLowerCase(), /revis/);
  assert.match(result.text.toLowerCase(), /m[eé]dic/);
  assert.ok(result.durationMs > 0);
  console.log('Synthetic speech ASR:', JSON.stringify(result));
});
