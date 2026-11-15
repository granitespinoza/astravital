// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {createServer} from 'node:http';
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
async function body(req,limit){
  let length=0;const chunks=[];
  for await(const chunk of req){length+=chunk.length;if(length>limit){const e=new Error('Request too large.');e.status=413;throw e;}chunks.push(chunk);}
  return Buffer.concat(chunks);
}
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}

export async function startApplication({port=0,host='127.0.0.1',dbPath=process.env.DB_PATH ?? resolve(root,'.runtime/demo.sqlite')}={}){
  await mkdir(resolve(dbPath,'..'),{recursive:true});
  const db=createDatabase({path:dbPath,seed:Number(process.env.SEED ?? 142)});
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
      const minute=Math.floor(Date.now()/60000);
      let count=limits.get(id);
      if(!count||count.minute!==minute){count={minute,n:0};limits.set(id,count);}
      if(limits.size>1000)limits.clear();
      if(url.pathname.startsWith('/api/')&&++count.n>120){send(res,429,{error:'Too many requests. Retry shortly.'});return;}
      if(req.method==='GET'&&url.pathname==='/health'){
        const voice=await voiceModule();
        const capabilities=voice?await voice.voiceCapabilities():{ready:false,reason:'Run npm run setup:voice.'};
        send(res,200,{ok:true,profile:'local',database:db.health(),voice:capabilities,simulatedData:true});return;
      }
      if(req.method==='GET'&&url.pathname==='/api/state'){send(res,200,db.getState(url.searchParams.get('domain')??'cardiovascular',url.searchParams.get('scenario')??undefined));return;}
      if(req.method==='GET'&&url.pathname==='/api/evidence'){send(res,200,db.getEvidence());return;}
      if(req.method==='GET'&&url.pathname==='/api/reviews'){send(res,200,db.listReviews());return;}
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
