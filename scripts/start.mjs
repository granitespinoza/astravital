// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {startApplication} from '../server/http.mjs';
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) throw new Error('Use Node.js 22.13 or newer.');
const port = Number(process.env.PORT ?? 4173);
const server = await startApplication({port,host:process.env.HOST ?? '127.0.0.1'});
console.log(`ASTRAVITAL http://${process.env.HOST ?? '127.0.0.1'}:${server.address().port}/`);
console.log('Synthetic seed 142 · SQLite Bronze/Silver/Gold · local voice capability at /health');
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => {server.close();server.closeAllConnections();});
