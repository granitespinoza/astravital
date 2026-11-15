// AI assistance: OpenAI Codex. Setup is the only network-enabled TTS operation.
import {mkdir,rename,rm,stat,copyFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ttsManifest,ttsCapabilities,hashTtsFile} from './synthesize.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function setupTts(){for(const file of ttsManifest.files){const target=resolve(root,file.local);await mkdir(dirname(target),{recursive:true});try{if((await stat(target)).size===file.bytes&&await hashTtsFile(target)===file.sha256)continue;}catch{}
 const temp=target+'.part-'+process.pid;
 try{if(file.remote){const response=await fetch(`${ttsManifest.source}/resolve/${ttsManifest.revision}/${file.remote}`,{signal:AbortSignal.timeout(300000)});if(!response.ok||!response.body)throw new Error(`TTS download failed: ${response.status}`);await pipeline(Readable.fromWeb(response.body),createWriteStream(temp,{flags:'wx',mode:0o600}));}else await copyFile(resolve(root,file.packageSource),temp);
 if((await stat(temp)).size!==file.bytes||await hashTtsFile(temp)!==file.sha256)throw new Error('TTS artifact size/SHA-256 mismatch.');await rename(temp,target);
 }finally{await rm(temp,{force:true});}}
 return ttsCapabilities();}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){(process.argv.includes('--doctor')?ttsCapabilities():setupTts()).then(result=>{console.log(JSON.stringify(result,null,2));if(!result.ready)process.exitCode=1;}).catch(error=>{console.error(error.message);process.exitCode=1;});}
