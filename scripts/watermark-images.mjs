// AI assistance: Anthropic Claude. See docs/SI-USAGE.md.
// Burns a visible "AI-generated image" watermark into each AI-generated illustration (required by the
// Space Apps SI rules) and exports a light WebP, using headless Chrome's canvas: no image libraries.
// Usage: node scripts/watermark-images.mjs [--short] [--scale=0.042] <source>:<output>:<maxWidth> [...more]
//        add --measure to print where the red (heart) and green (left hip) highlights sit in an image.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

// --short uses the short label and --scale=<fraction of width> sets the text size, for images shown small in the app.
const LABEL = process.argv.includes('--short') ? 'AI-generated image' : 'AI-generated image · ChatGPT (OpenAI)';
const SCALE = Number(process.argv.find(arg => arg.startsWith('--scale='))?.split('=')[1] ?? 0.021);
const jobs = process.argv.slice(2).filter(arg => !arg.startsWith('--')).map(arg => {
  const [source, output, width] = arg.split(':');
  assert.ok(source && output && Number(width) > 0, 'Use <source>:<output>:<maxWidth>');
  return {source, output, width:Number(width)};
});
const measure = process.argv.includes('--measure');
const browserPath = process.env.BROWSER_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
assert.ok(browserPath, 'Install Chrome or set BROWSER_PATH.');

async function until(read, what, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const value = await read(); if (value) return value; await delay(100); }
  throw new Error('Timed out waiting for ' + what);
}

const profile = await mkdtemp(join(await realpath(tmpdir()), 'astravital-watermark-'));
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
  '--user-data-dir=' + profile, 'about:blank'], {stdio:'ignore'});
let socket;
try {
  const [port, path] = (await until(() => readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => null), 'Chrome')).trim().split(/\r?\n/);
  socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((ok, fail) => { socket.onopen = ok; socket.onerror = fail; });
  let seq = 0; const pending = new Map();
  socket.onmessage = ({data}) => { const m = JSON.parse(data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); } };
  const call = (method, params = {}, sessionId) => new Promise((ok, fail) => { const id = ++seq; pending.set(id, {ok, fail}); socket.send(JSON.stringify({id, method, params, sessionId})); });
  const {targetId} = await call('Target.createTarget', {url:'about:blank'});
  const {sessionId} = await call('Target.attachToTarget', {targetId, flatten:true});
  const run = async expression => {
    const r = await call('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true}, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  for (const job of jobs) {
    const bytes = await readFile(job.source);
    const type = job.source.endsWith('.png') ? 'image/png' : job.source.endsWith('.jpg') ? 'image/jpeg' : 'image/webp';
    const result = await run(`(async () => {
      const image = new Image();
      image.src = 'data:${type};base64,${bytes.toString('base64')}';
      await image.decode();
      const scale = Math.min(1, ${job.width} / image.naturalWidth);
      const w = Math.round(image.naturalWidth * scale), h = Math.round(image.naturalHeight * scale);
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, w, h);
      let spots = null;
      if (${measure}) {
        const {data} = ctx.getImageData(0, 0, w, h);
        const red = {x:0, y:0, n:0}, green = {x:0, y:0, n:0};
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
          if (r > 170 && g < 120 && b < 120) { red.x += x; red.y += y; red.n++; }
          if (g > 150 && g > b + 30 && r < 200 && y > h * 0.36 && y < h * 0.5) { green.x += x; green.y += y; green.n++; }
        }
        const pct = s => s.n ? {x:+(100 * s.x / s.n / w).toFixed(1), y:+(100 * s.y / s.n / h).toFixed(1), pixels:s.n} : null;
        spots = {heart:pct(red), leftHip:pct(green)};
      }
      // Visible watermark, bottom right, on a dark pill so it stays legible on any background.
      const size = Math.max(13, Math.round(w * ${SCALE})), pad = Math.round(size * 0.6);
      ctx.font = '700 ' + size + 'px Helvetica, Arial, sans-serif';
      const label = ${JSON.stringify(LABEL)}, tw = ctx.measureText(label).width;
      const bx = w - tw - pad * 3, by = h - size - pad * 3;
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.beginPath(); ctx.roundRect(bx, by, tw + pad * 2, size + pad * 1.6, pad); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.textBaseline = 'top';
      ctx.fillText(label, bx + pad, by + pad * 0.8);
      return {w, h, spots, data:canvas.toDataURL('image/webp', 0.82).split(',')[1]};
    })()`);
    await writeFile(job.output, Buffer.from(result.data, 'base64'));
    const size = Buffer.from(result.data, 'base64').length;
    console.log(`${job.output}: ${result.w}×${result.h}, ${(size / 1024).toFixed(0)} KB` + (result.spots ? ' · ' + JSON.stringify(result.spots) : ''));
  }
} finally {
  socket?.close(); browser.kill();
  await rm(profile, {recursive:true, force:true}).catch(() => {});
}
