// AI assistance: OpenAI Codex. Software workflow tests on seed-142 synthetic data, not clinical validation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDatabase} from '../server/database.mjs';
import {browserMessages,messageContext,MESSAGE_KEY} from '../app/case-messages.js';
const at=()=> '2026-11-15T20:00:00.000Z';
function input(context,extra={}){return {...context,action:'send',sender:'crew',recipient:'ground',text:'Please review this synthetic measurement.',requestId:'message-1',confirmed:true,...extra};}
function memory(t){const db=createDatabase({path:':memory:'});t.after(()=>db.close());return db;}
function context(db){return messageContext(db.getState(),'cardiovascular','crew');}
test('case messages require final confirmation, bounded text and matching crew/domain evidence',t=>{
 const db=memory(t),ctx=context(db),draft=input(ctx);
 for(const confirmed of [undefined,false,'true'])assert.throws(()=>db.caseMessages({...draft,confirmed}),/confirm/i);
 for(const text of ['',' ', 'x'.repeat(1001)])assert.throws(()=>db.caseMessages({...draft,text}),/1–1000/);
 assert.throws(()=>db.caseMessages({...draft,crewId:'crew-02'}),/evidence/i);
 assert.throws(()=>db.caseMessages({...draft,domain:'bone'}),/evidence/i);
 assert.throws(()=>db.caseMessages({...draft,sender:'astra'}),/participant/i);
 assert.deepEqual(db.caseMessages({...ctx,action:'list',actor:'crew'}),[]);
});
test('queued contents are withheld from the recipient until explicit simulated receipt; reviews are recipient-only',t=>{
 const db=memory(t),ctx=context(db),message=db.caseMessages(input(ctx));
 assert.equal(message.status,'queued');
 assert.equal(db.caseMessages({...ctx,action:'list',actor:'ground'})[0].text,null);
 assert.equal(db.caseMessages({...ctx,action:'list',actor:'crew'})[0].text,message.text);
 assert.throws(()=>db.caseMessages({...ctx,id:message.id,action:'review',actor:'ground',confirmed:true}),/receipt/i);
 assert.throws(()=>db.caseMessages({...ctx,id:message.id,action:'receive',actor:'crew',confirmed:true}),/recipient/i);
 const receive={...ctx,id:message.id,action:'receive',actor:'ground',confirmed:true};
 assert.equal(db.caseMessages(receive).status,'received');
 assert.equal(db.caseMessages(receive).events.length,2);
 assert.equal(db.caseMessages({...ctx,action:'list',actor:'ground'})[0].text,message.text);
 const reviewed=db.caseMessages({...receive,action:'review'});assert.equal(reviewed.status,'reviewed');
 assert.equal(db.caseMessages({...receive,action:'review'}).events.length,3);
 assert.deepEqual(db.caseMessages({...ctx,crewId:'crew-02',action:'list',actor:'ground'}),[]);
});
test('message retries retain one record after SQLite restart and reject changed content',()=>{
 const dir=mkdtempSync(join(tmpdir(),'astravital-messages-')),path=join(dir,'demo.sqlite');let db;
 try{db=createDatabase({path});const ctx=context(db),draft=input(ctx,{recipient:'cmo'});assert.equal(db.caseMessages(draft).status,'onboard');db.close();
 db=createDatabase({path});db.caseMessages(draft);assert.equal(db.caseMessages({...ctx,action:'list',actor:'cmo'}).length,1);
 assert.throws(()=>db.caseMessages({...draft,text:'Changed retry'}),/different message/);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
test('browser conversations share fresh storage, survive recreation, keep delivery truthful and do not include internal notes',async t=>{
 const db=memory(t),ctx=context(db);const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const store=browserMessages({storage,clock:at});const draft=input(ctx);
 const first=await store.request(draft,ctx);assert.equal(first.localOnly,true);assert.equal(first.status,'local');
 const other=browserMessages({storage,clock:at});await other.request(input(ctx,{requestId:'doctor-reply',sender:'ground',recipient:'crew',text:'I am reviewing the attached evidence.'}),ctx);
 await store.request(draft,ctx);assert.equal((await store.request({...ctx,action:'list',actor:'crew'},ctx)).length,2);
 assert.ok(JSON.parse(values.get(MESSAGE_KEY)).every(entry=>!Object.hasOwn(entry,'note')));
 await assert.rejects(store.request({...ctx,id:first.id,action:'receive',actor:'ground',confirmed:true},ctx),/cannot be marked/);
 const reviewed=await store.request({...ctx,id:first.id,action:'review',actor:'ground',confirmed:true},ctx);assert.equal(reviewed.status,'reviewed');assert.equal(reviewed.localOnly,true);
 storage.setItem=()=>{throw new Error('Storage denied');};
 await assert.rejects(store.request(input(ctx,{requestId:'failed-message'}),ctx),/Storage denied/);
 assert.equal((await other.request({...ctx,action:'list',actor:'crew'},ctx)).length,2);
});
