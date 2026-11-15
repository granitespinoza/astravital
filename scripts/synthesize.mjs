// AI assistance: OpenAI Codex. Isolated local Kokoro synthesis; no cloud fallback.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream,readFileSync} from 'node:fs';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export const ttsManifest=JSON.parse(readFileSync(new URL('../models/tts-manifest.json',import.meta.url),'utf8'));
let busy=false,verifiedKey=null,verified=false;
export class TtsError extends Error{constructor(code,message,status=503){super(message);this.code=code;this.status=this.statusCode=status;}}
export async function hashTtsFile(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
export async function ttsCapabilities(){
 let installed=false;try{import.meta.resolve('kokoro-js');import.meta.resolve('@huggingface/transformers');installed=true;}catch{}
 let modelReady=false;
 try{const infos=await Promise.all(ttsManifest.files.map(file=>stat(resolve(root,file.local))));const key=infos.map(s=>`${s.size}:${s.mtimeMs}:${s.ctimeMs}`).join('|');
  if(key===verifiedKey)modelReady=verified;else{modelReady=true;for(let i=0;i<infos.length;i++){const file=ttsManifest.files[i];if(infos[i].size!==file.bytes||await hashTtsFile(resolve(root,file.local))!==file.sha256){modelReady=false;break;}}verifiedKey=key;verified=modelReady;}
 }catch{}
 return{ready:installed&&modelReady,installed,modelReady,engine:'kokoro',voice:'af_heart',language:'en-US',localOnly:true,maxCharacters:500,reason:!installed?'PACKAGE_MISSING':!modelReady?'MODEL_MISSING_OR_INVALID':null};
}
export const capabilities=ttsCapabilities;
export function validateTtsText(text){if(typeof text!=='string'||!text.trim()||text.length>500||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))throw new TtsError('INVALID_TTS_TEXT','Provide 1–500 characters of plain text.',400);return text.trim();}
export async function synthesize(text){
 text=validateTtsText(text);if(busy)throw new TtsError('TTS_BUSY','Another reply is being synthesized.',429);busy=true;
 try{if(!(await ttsCapabilities()).ready)throw new TtsError('TTS_NOT_READY','Run node scripts/setup-tts.mjs first.');
  return await new Promise((accept,reject)=>{
   const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--worker'],{stdio:['pipe','pipe','pipe'],windowsHide:true,env:{...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'}});
   const chunks=[];let bytes=0,settled=false;const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):accept(value);};
   const timer=setTimeout(()=>{child.kill('SIGKILL');finish(new TtsError('TTS_TIMEOUT','Local speech synthesis timed out.',504));},90000);
   child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>16000000){child.kill('SIGKILL');finish(new TtsError('TTS_OUTPUT_LIMIT','Speech output exceeded its limit.'));}else chunks.push(chunk);});
   child.stderr.resume();child.on('error',()=>finish(new TtsError('TTS_FAILED','Local speech synthesis could not start.')));
   child.on('close',code=>{const buffer=Buffer.concat(chunks);if(code!==0||buffer.toString('ascii',0,4)!=='RIFF')finish(new TtsError('TTS_FAILED','Local speech synthesis failed.'));else finish(null,buffer);});
   child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({text}));
  });
 }finally{busy=false;}
}
async function worker(){
 console.log=()=>{};console.warn=()=>{};
 // This process is disposable. Disallow fetch even if an upstream loader tries a remote fallback.
 globalThis.fetch=async()=>{throw new Error('Network disabled during local synthesis.');};
 const {env,StyleTextToSpeech2Model,AutoTokenizer}=await import('@huggingface/transformers');
 env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.useFSCache=false;
 const {KokoroTTS}=await import('kokoro-js');
 const local=resolve(root,'.runtime/tts-model');
 const [model,tokenizer]=await Promise.all([StyleTextToSpeech2Model.from_pretrained(local,{local_files_only:true,dtype:'q8',device:'cpu',session_options:{intraOpNumThreads:4,interOpNumThreads:1}}),AutoTokenizer.from_pretrained(local,{local_files_only:true})]);
 const input=[];for await(const chunk of process.stdin)input.push(chunk);
 const text=validateTtsText(JSON.parse(Buffer.concat(input).toString()).text);
 const audio=await new KokoroTTS(model,tokenizer).generate(text,{voice:'af_heart',speed:0.97});
 process.stdout.write(Buffer.from(audio.toWav()));
 await model.dispose();
}
if(process.argv[2]==='--worker'&&resolve(process.argv[1])===fileURLToPath(import.meta.url))worker().catch(()=>{process.exitCode=1;});
