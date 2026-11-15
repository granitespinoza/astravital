// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const assets = new URL('../app/', import.meta.url);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

export async function startServer(port = 0) {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const path = pathname === '/' ? 'index.html' : pathname.slice(1);
    const type = types[extname(path)];

    if (!type || !/^[a-z][\w.-]*$/.test(path)) {
      response.writeHead(404).end();
      return;
    }

    try {
      const file = await readFile(new URL(path, assets));
      response.writeHead(200, {
        'Content-Type': type + '; charset=utf-8',
        'Cache-Control': 'no-cache',
      }).end(file);
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const portFlag = process.argv.indexOf('--port');
  const port = portFlag === -1 ? 4173 : Number(process.argv[portFlag + 1]);
  const server = await startServer(port);
  console.log('ASTRAVITAL http://127.0.0.1:' + server.address().port + '/');
}
