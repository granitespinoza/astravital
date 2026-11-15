// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {build} from 'esbuild';
await build({entryPoints:['app/view3d.js'],bundle:true,minify:true,format:'esm',target:['es2022'],outfile:'app/view3d.bundle.js',legalComments:'eof'});
console.log('Local Three.js scene bundled. No runtime CDN.');
