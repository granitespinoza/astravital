// AI assistance: OpenAI Codex. Local ASR integration; see docs/SI-USAGE.md.
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream, constants, readFileSync} from 'node:fs';
import {access, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {delimiter, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const run = promisify(execFile);
const modelDirectory = fileURLToPath(new URL('../models/', import.meta.url));
export const voiceManifest = JSON.parse(readFileSync(join(modelDirectory, 'manifest.json'), 'utf8'));
export const voicePolicy = Object.freeze({maxSeconds: 30, maxBytes: 1000000, sampleRate: 16000, channels: 1, bits: 16, timeoutMs: 90000});
let modelCache;
let active = false;

export class VoiceError extends Error {
  constructor(code, message, status = 422) {
    super(message); this.name = 'VoiceError'; this.code = code; this.status = status; this.statusCode = status;
  }
}

export async function findWhisperBinary() {
  const override = process.env.WHISPER_CPP_BIN;
  const candidates = override ? [override] : [
    '/opt/homebrew/bin/whisper-cli', '/usr/local/bin/whisper-cli',
    ...(process.env.PATH || '').split(delimiter).filter(Boolean).map(directory => join(directory, 'whisper-cli')),
  ];
  for (const candidate of candidates) {
    try { await access(candidate, constants.X_OK); if ((await stat(candidate)).isFile()) return resolve(candidate); } catch {}
  }
  return null;
}

export async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export function selectedVoiceModel() {
  const name = process.env.WHISPER_MODEL || voiceManifest.defaultModel;
  const model = Object.hasOwn(voiceManifest.models, name) && voiceManifest.models[name];
  if (!model) throw new VoiceError('MODEL_SELECTION', 'Use WHISPER_MODEL=base or tiny.', 503);
  return {name, ...model, path: join(modelDirectory, model.file)};
}

export async function voiceCapabilities() {
  const binary = await findWhisperBinary();
  let model;
  try { model = selectedVoiceModel(); } catch (error) {
    return {engine: 'whisper.cpp', installed: Boolean(binary), binaryInstalled: Boolean(binary), modelReady: false, ready: false, reason: error.code};
  }
  let verified = false;
  try {
    const info = await stat(model.path);
    const key = `${model.path}:${info.size}:${info.mtimeMs}:${info.ctimeMs}`;
    if (modelCache?.key === key) verified = modelCache.verified;
    else {
      verified = info.isFile() && info.size === model.bytes && await sha256File(model.path) === model.sha256;
      modelCache = {key, verified};
    }
  } catch {}
  return {
    engine: 'whisper.cpp', installed: Boolean(binary), binaryInstalled: Boolean(binary), modelReady: verified,
    ready: Boolean(binary) && verified, model: model.name, multilingual: true, license: 'MIT', localOnly: true,
    languages: ['es', 'en', 'auto'], input: 'WAV PCM16 mono 16000 Hz', maxSeconds: voicePolicy.maxSeconds,
    reason: !binary ? 'BINARY_MISSING' : !verified ? 'MODEL_MISSING_OR_INVALID' : null,
  };
}
export const voiceHealth = voiceCapabilities;

// Strict RIFF parsing prevents malformed/truncated input reaching the native decoder.
export function inspectWav(buffer) {
  const invalid = message => { throw new VoiceError('INVALID_WAV', message); };
  if (!Buffer.isBuffer(buffer) || buffer.length < 44) invalid('A complete WAV buffer is required.');
  if (buffer.length > voicePolicy.maxBytes) throw new VoiceError('AUDIO_TOO_LARGE', 'Record at most 30 seconds.', 413);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE' || buffer.readUInt32LE(4) + 8 !== buffer.length) invalid('Invalid RIFF/WAVE length or header.');
  let format;
  let samples;
  let position = 12;
  while (position + 8 <= buffer.length) {
    const id = buffer.toString('ascii', position, position + 4);
    const bytes = buffer.readUInt32LE(position + 4);
    const start = position + 8;
    if (start + bytes > buffer.length) invalid('Truncated WAV chunk.');
    if (id === 'fmt ') {
      if (format || bytes < 16) invalid('Invalid or duplicate format chunk.');
      format = {encoding: buffer.readUInt16LE(start), channels: buffer.readUInt16LE(start + 2), rate: buffer.readUInt32LE(start + 4), byteRate: buffer.readUInt32LE(start + 8), blockAlign: buffer.readUInt16LE(start + 12), bits: buffer.readUInt16LE(start + 14)};
    }
    if (id === 'data') { if (samples) invalid('Duplicate audio data chunk.'); samples = buffer.subarray(start, start + bytes); }
    position = start + bytes + bytes % 2;
  }
  if (position !== buffer.length || !format || !samples?.length || samples.length % 2) invalid('Missing or malformed WAV chunks.');
  if (format.encoding !== 1 || format.channels !== 1 || format.rate !== 16000 || format.bits !== 16 || format.byteRate !== 32000 || format.blockAlign !== 2) invalid('Use WAV PCM16, mono, 16000 Hz.');
  const audioDurationMs = samples.length / 32;
  if (audioDurationMs < 200 || audioDurationMs > voicePolicy.maxSeconds * 1000) invalid('Audio must last between 0.2 and 30 seconds.');
  let energy = 0;
  for (let i = 0; i < samples.length; i += 2) { const sample = samples.readInt16LE(i); energy += sample * sample; }
  return {audioDurationMs, rms: Math.sqrt(energy / (samples.length / 2))};
}

export async function transcribeWav(buffer, {language = 'es'} = {}) {
  if (!['es', 'en', 'auto'].includes(language)) throw new VoiceError('UNSUPPORTED_LANGUAGE', 'Use es, en or auto.');
  const audio = inspectWav(buffer);
  if (audio.rms === 0) throw new VoiceError('NO_SPEECH', 'No speech detected.');
  if (active) throw new VoiceError('ASR_BUSY', 'Another recording is being transcribed. Try again shortly.', 429);
  active = true;
  let directory;
  const started = performance.now();
  try {
    const capability = await voiceCapabilities();
    if (!capability.ready) throw new VoiceError('ASR_NOT_READY', 'Run node scripts/setup-voice.mjs and check --doctor.', 503);
    directory = await mkdtemp(join(tmpdir(), 'astravital-voice-'));
    const audioPath = join(directory, 'recording.wav');
    const outputPath = join(directory, 'transcript');
    await writeFile(audioPath, buffer, {mode: 0o600});
    await run(await findWhisperBinary(), ['-m', selectedVoiceModel().path, '-f', audioPath, '-l', language, '-oj', '-of', outputPath, '-nt', '-np', '-ng', '-t', '4'], {timeout: voicePolicy.timeoutMs, maxBuffer: 1024 * 1024, windowsHide: true});
    const result = JSON.parse(await readFile(outputPath + '.json', 'utf8'));
    const text = (result.transcription || []).map(segment => segment.text || '').join(' ').replace(/\[(?:BLANK_AUDIO|SILENCE|NO_SPEECH)\]/gi, '').replace(/\s+/g, ' ').trim();
    if (!text) throw new VoiceError('NO_SPEECH', 'No speech detected.');
    return {text, language: result.result?.language || language, engine: 'whisper.cpp', durationMs: Math.round(performance.now() - started)};
  } catch (error) {
    if (error instanceof VoiceError) throw error;
    // Never expose captured audio, transcript, model path or native process output in errors.
    throw new VoiceError(error.killed ? 'ASR_TIMEOUT' : 'ASR_FAILED', error.killed ? 'Transcription timed out. Try a shorter recording.' : 'Local transcription failed. Check the voice setup.', error.killed ? 504 : 503);
  } finally {
    try { if (directory) await rm(directory, {recursive: true, force: true}); } finally { active = false; }
  }
}
