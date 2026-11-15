// AI assistance: OpenAI Codex and Anthropic Claude. See docs/SI-USAGE.md.
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
await build({entryPoints:['app/view3d.js'],bundle:true,minify:true,format:'esm',target:['es2022'],outfile:'app/view3d.bundle.js',legalComments:'eof'});
console.log('Local Three.js scene bundled. No runtime CDN.');
// Web demo: export seed-142 states from the real database, then bundle the same dialogue policy for the browser.
execFileSync(process.execPath, ['--no-warnings', 'scripts/export-demo.mjs'], {stdio: 'inherit'});
await build({entryPoints:['app/web-demo.js'],bundle:true,minify:true,format:'esm',target:['es2022'],outfile:'app/web-demo.bundle.js',legalComments:'eof'});
console.log('Web demo bundled: same dialogue policy, runs without a server.');
