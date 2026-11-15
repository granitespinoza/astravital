// AI assistance: OpenAI Codex. Downloads official, hash-pinned Whisper weights.
import {execFile} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {mkdir, rename, rm, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import {findWhisperBinary, sha256File, voiceCapabilities, voiceManifest} from './transcribe.mjs';

const run = promisify(execFile);
const directory = fileURLToPath(new URL('../models/', import.meta.url));

export async function downloadModel(name = voiceManifest.defaultModel) {
  if (!Object.hasOwn(voiceManifest.models, name)) throw new Error('Choose --model base or tiny.');
  const model = voiceManifest.models[name];
  await mkdir(directory, {recursive: true});
  const target = join(directory, model.file);
  try { if ((await stat(target)).size === model.bytes && await sha256File(target) === model.sha256) return target; } catch {}
  const temporary = target + '.part-' + process.pid;
  try {
    const url = `${voiceManifest.source}/resolve/${voiceManifest.revision}/${model.file}`;
    const response = await fetch(url, {signal: AbortSignal.timeout(300000)});
    if (!response.ok || !response.body) throw new Error(`Model download failed: HTTP ${response.status}.`);
    let bytes = 0;
    const limiter = new Transform({transform(chunk, encoding, callback) {
      bytes += chunk.length;
      callback(bytes > model.bytes ? new Error('Model exceeds pinned size.') : null, chunk);
    }});
    await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(temporary, {flags: 'wx', mode: 0o600}));
    if (bytes !== model.bytes || await sha256File(temporary) !== model.sha256) throw new Error('Model SHA-256/size mismatch; download discarded.');
    await rename(temporary, target);
    return target;
  } finally { await rm(temporary, {force: true}); }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/setup-voice.mjs [--model base|tiny] [--install-binary] [--doctor]\nDefault: download and verify base. --install-binary explicitly installs whisper-cpp with Homebrew. --doctor is read-only. Set WHISPER_MODEL=tiny to use tiny; WHISPER_CPP_BIN overrides the binary.');
    return;
  }
  if (args.includes('--doctor')) {
    const capability = await voiceCapabilities();
    if (capability.binaryInstalled) {
      try { await run(await findWhisperBinary(), ['--help'], {timeout: 10000}); capability.binaryRunnable = true; }
      catch { capability.binaryRunnable = false; capability.ready = false; capability.reason = 'BINARY_NOT_RUNNABLE'; }
    }
    console.log(JSON.stringify(capability, null, 2));
    if (!capability.ready) process.exitCode = 1;
    return;
  }
  if (args.includes('--install-binary') && !await findWhisperBinary()) {
    await run('brew', ['install', 'whisper-cpp'], {timeout: 600000, maxBuffer: 8 * 1024 * 1024, env: {...process.env, HOMEBREW_NO_AUTO_UPDATE: '1', HOMEBREW_NO_INSTALL_CLEANUP: '1'}});
  }
  const modelFlag = args.indexOf('--model');
  const name = modelFlag === -1 ? voiceManifest.defaultModel : args[modelFlag + 1];
  if (!name) throw new Error('A model name must follow --model.');
  const target = await downloadModel(name);
  console.log(`Verified ${name}: ${target}\nLicense: MIT (OpenAI), retained in models/manifest.json.\nSHA-256: ${voiceManifest.models[name].sha256}`);
  if (!await findWhisperBinary()) {
    console.error('Model ready; whisper-cli is missing. Run brew install whisper-cpp or set WHISPER_CPP_BIN.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
