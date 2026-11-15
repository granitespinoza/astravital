// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {networkInterfaces} from 'node:os';
import {startApplication} from '../server/http.mjs';

const addresses = Object.values(networkInterfaces()).flat()
  .filter(address => address.family === 'IPv4' && !address.internal)
  .map(address => address.address);
const lanAddress = process.argv[2];
if (process.argv.length > 3 || (lanAddress && !addresses.includes(lanAddress))) {
  console.error('Pass one IPv4 address currently assigned to this laptop:');
  console.error(addresses.join('\n') || 'No non-loopback IPv4 address was found.');
  process.exit(1);
}
const port = Number(process.env.PORT ?? 8766);
const server = await startApplication({port,host:lanAddress ? '0.0.0.0' : '127.0.0.1',mission:true,lanAddress});
const base = 'http://127.0.0.1:' + server.address().port;
console.log('ASTRAVITAL · SYNTHETIC MISSION');
console.log('Mission console: ' + base + '/mission.html');
console.log('Glasses experience: ' + base + '/');
if (lanAddress) console.log('Phone connection check: http://' + lanAddress + ':' + server.address().port + '/api/mission/ping');
else console.log('For a phone test, restart with: node scripts/start-mission.mjs <laptop IPv4>');
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { server.close(); server.closeAllConnections(); });
