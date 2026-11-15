// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile,stat,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDatabase} from './database.mjs';
import {respond} from './assistant.mjs';
const root = fileURLToPath(new URL('../',import.meta.url));
const assets = resolve(root,'app');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.wav':'audio/wav','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};

async function voiceModule(){
  try{return await import('../scripts/transcribe.mjs');}
  catch(error){if(error.code==='ERR_MODULE_NOT_FOUND')return null;throw error;}
}
// AI assistance: Anthropic Claude wired the local Kokoro voice (scripts/synthesize.mjs) into the API.
async function ttsModule(){
  try{return await import('../scripts/synthesize.mjs');}
  catch(error){if(error.code==='ERR_MODULE_NOT_FOUND')return null;throw error;}
}
async function body(req,limit){
  let length=0;const chunks=[];
  for await(const chunk of req){length+=chunk.length;if(length>limit){const e=new Error('Request too large.');e.status=413;throw e;}chunks.push(chunk);}
  return Buffer.concat(chunks);
}
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}

const missionAssets = new Set(['/mission.html','/mission.css','/mission.js','/health-status.js','/experience.css',
  '/overpass-regular.woff2','/overpass-bold.woff2','/fira-sans-bold.woff2','/case-messages.js','/case-thread.js','/case-thread.css']);
const loopback = address => ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);

export async function startApplication({port=0,host='127.0.0.1',dbPath=process.env.DB_PATH ?? resolve(root,'.runtime/demo.sqlite'),mission=false,lanAddress}={}){
  await mkdir(resolve(dbPath,'..'),{recursive:true});
  const db=createDatabase({path:dbPath,seed:Number(process.env.SEED ?? 142),mission});
  const pairs = new Map(db.mission?.getCmo().crew.map(member => [randomBytes(24).toString('hex'),member.crewId]));
  const limits=new Map();
  let asrBusy=false;
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Referrer-Policy','same-origin');
      res.setHeader('Permissions-Policy','microphone=(self), camera=()');
      const origin=req.headers.origin;
      if(req.method==='POST' && origin && new URL(origin).origin!==`http://${req.headers.host}`){send(res,403,{error:'Cross-origin writes are disabled.'});return;}
      const id=req.socket.remoteAddress ?? 'local';
      if (mission) {
        const local = loopback(id);
        const hostName = new URL('http://' + req.headers.host).hostname;
        if (local ? !['127.0.0.1','localhost','[::1]'].includes(hostName)
          : !lanAddress || req.socket.localAddress !== lanAddress || hostName !== lanAddress) {
          send(res,403,{error:'Use the configured mission address.'});return;
        }
        if (url.pathname.startsWith('/api/mission/')) {
          const route = req.method + ' ' + url.pathname.slice('/api/mission/'.length);
          if (route === 'GET ping') { send(res,200,{ok:true,simulated:true});return; }
          const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{48})$/)?.[1];
          const crewId = pairs.get(token);
          if (route === 'POST messages' && crewId) {
            const input=JSON.parse((await body(req,8000)).toString('utf8'));
            send(res,200,db.caseMessages({...input,crewId,sender:'crew',actor:'crew'}));return;
          }
          if (route === 'GET crew' || route === 'POST readings') {
            if (!crewId) { send(res,401,{error:'Open a current crew link from the CMO console.'});return; }
            const value = route === 'GET crew' ? db.mission.getCrew(crewId)
              : db.mission.ingest(crewId, JSON.parse((await body(req,2048)).toString('utf8')));
            send(res,200,value);return;
          }
          if (!local || req.headers.authorization) { send(res,403,{error:'Open CMO and Ground on the mission laptop.'});return; }
          if (route === 'GET cmo') {
            const address = lanAddress ?? '127.0.0.1';
            const links = [...pairs].map(([key,id]) => ({id,url:`http://${address}:${server.address().port}/mission.html#crew=${key}`}));
            send(res,200,{...db.mission.getCmo(),links,lanEnabled:Boolean(lanAddress),reviewCount:db.listReviews().length});return;
          }
          if (route === 'GET ground') { send(res,200,db.mission.getGround());return; }
          const action = {'POST ack':'acknowledge','POST reports':'queueReport','POST report-state':'updateReport',
            'POST ground-action':'saveGroundAction'}[route];
          if (!action) { send(res,404,{error:'Unknown mission route.'});return; }
          const input = JSON.parse((await body(req,2048)).toString('utf8'));
          send(res,200,db.mission[action](input));return;
        }
        if (!local) {
          if (req.method === 'GET' && url.pathname === '/') {
            res.writeHead(302,{Location:'/mission.html','Cache-Control':'no-store'});res.end();return;
          }
          if (!missionAssets.has(url.pathname)) {send(res,403,{error:'This surface is available only on the mission laptop.'});return;}
        }
      }
      const minute=Math.floor(Date.now()/60000);
      let count=limits.get(id);
      if(!count||count.minute!==minute){count={minute,n:0};limits.set(id,count);}
      if(limits.size>1000)limits.clear();
      if(url.pathname.startsWith('/api/')&&++count.n>120){send(res,429,{error:'Too many requests. Retry shortly.'});return;}
      if(req.method==='GET'&&url.pathname==='/health'){
        const voice=await voiceModule();
        const capabilities=voice?await voice.voiceCapabilities():{ready:false,reason:'Run npm run setup:voice.'};
        const tts=await ttsModule();
        const speech=tts?await tts.ttsCapabilities():{ready:false,reason:'PACKAGE_MISSING'};
        send(res,200,{ok:true,profile:'local',database:db.health(),voice:capabilities,tts:speech,simulatedData:true,...(mission ? {mission:true} : {})});return;
      }
      if(req.method==='GET'&&url.pathname==='/api/state'){send(res,200,db.getState(url.searchParams.get('domain')??'cardiovascular',url.searchParams.get('scenario')??undefined));return;}
      if(req.method==='GET'&&url.pathname==='/api/evidence'){send(res,200,db.getEvidence());return;}
      if(req.method==='GET'&&url.pathname==='/api/reviews'){send(res,200,db.listReviews());return;}
      if(req.method==='POST'&&url.pathname==='/api/messages'){
        if(!loopback(id) || req.headers.authorization){send(res,403,{error:'Use your paired crew link or the mission laptop.'});return;}
        const input=JSON.parse((await body(req,8000)).toString('utf8'));
        send(res,200,db.caseMessages(input));return;
      }
      if(req.method==='POST'&&url.pathname==='/api/assistant'){
        const input=JSON.parse((await body(req,16000)).toString('utf8'));
        if(typeof input.text!=='string'||!input.text.trim()||input.text.length>1000)throw new Error('Provide a message up to 1000 characters.');
        send(res,200,await respond(db,{text:input.text,sessionId:typeof input.sessionId==='string'?input.sessionId:undefined}));return;
      }
      if(req.method==='POST'&&url.pathname==='/api/reviews'){
        const input=JSON.parse((await body(req,16000)).toString('utf8'));
        send(res,200,db.requestReview(input));return;
      }
      if(req.method==='POST'&&url.pathname==='/api/transcribe'){
        if(asrBusy){send(res,409,{error:'Another voice turn is being processed. Wait for the response.'});return;}
        const voice=await voiceModule();
        if(!voice){send(res,503,{error:'Local recognition is not installed. Run npm run setup:voice.'});return;}
        const input=await body(req,2_000_000);
        asrBusy=true;
        try{const result=await voice.transcribeWav(input,{language:url.searchParams.get('language')==='en'?'en':'es'});send(res,200,result);}
        finally{asrBusy=false;}
        return;
      }
      if(req.method==='POST'&&url.pathname==='/api/speak'){
        // Reads aloud a sentence Astra already produced; it never generates content.
        const tts=await ttsModule();
        if(!tts){send(res,503,{error:'Local voice output is not installed.',code:'PACKAGE_MISSING'});return;}
        const input=JSON.parse((await body(req,4000)).toString('utf8'));
        try{
          const wav=await tts.synthesize(input.text);
          res.writeHead(200,{'Content-Type':'audio/wav','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
          res.end(wav);
        }catch(error){send(res,error.status ?? 503,{error:error.message,code:error.code ?? 'TTS_FAILED'});}
        return;
      }
      if(url.pathname.startsWith('/api/')){send(res,404,{error:'Unknown API route.'});return;}
      if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'Method not allowed.'});return;}
      const relative=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
      const path=resolve(assets,relative);
      if(!path.startsWith(assets+sep)||!types[extname(path)]){send(res,404,{error:'Not found.'});return;}
      const info=await stat(path);
      if(!info.isFile())throw Object.assign(new Error('Not found.'),{status:404});
      const content=await readFile(path);
      res.writeHead(200,{'Content-Type':types[extname(path)],'Cache-Control':'no-cache'});
      res.end(req.method==='HEAD'?undefined:content);
    }catch(error){
      const status=error.status ?? (error.code==='ENOENT'?404:400);
      if(!res.headersSent)send(res,status,{error:status===404?'Not found.':error.message});
      else res.end();
    }
  });
  server.once('close',()=>db.close());
  await new Promise((accept,reject)=>{server.once('error',reject);server.listen(port,host,accept);});
  return server;
}
