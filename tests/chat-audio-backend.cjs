const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
class Sheet {
 constructor(){this.rows=[];}
 appendRow(r){this.rows.push([...r]);return this;}
 setFrozenRows(){}
 getLastColumn(){return Math.max(0,...this.rows.map(r=>r.length));}
 getLastRow(){return this.rows.length;}
 getDataRange(){return {getValues:()=>this.rows.map(r=>[...r])};}
 getRange(row,col,height,width){return {setNumberFormat(){return this;},setValues:(values)=>{assert.equal(values.length,height);values.forEach((r,i)=>{assert.equal(r.length,width);this.rows[row+i-1]||=[];r.forEach((x,j)=>this.rows[row+i-1][col+j-1]=x);});}};}
}
const sheets={},cached=new Map(),ss={getSheetByName:n=>sheets[n],insertSheet:n=>(sheets[n]=new Sheet())};
let locks=0;
const context=vm.createContext({console,FT_MASTER:{SPREADSHEET_ID:'test'},SpreadsheetApp:{openById:()=>ss},LockService:{getScriptLock:()=>({tryLock:()=>{locks++;return true;},releaseLock:()=>locks--})},CacheService:{getScriptCache:()=>({get:k=>cached.get(k),put:(k,v)=>cached.set(k,v)})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],getUuid:()=>crypto.randomUUID(),base64Decode:s=>[...Buffer.from(s,'base64')]}});
vm.runInContext(fs.readFileSync('integrations/apps-script/chat-audio.gs','utf8'),context);
const call=p=>JSON.parse(JSON.stringify(context.ftChat_(p)));
const token='a'.repeat(64),other='b'.repeat(64);
assert.equal(call({action:'chat_join',token,name:'Test Member'}).status,'pending');
assert.equal(call({action:'chat_send',token,id:crypto.randomUUID(),body:'No access'}).status,'pending');
assert.equal(sheets.Chat_Mesazhet,undefined);
sheets.Chat_Anetaret.rows[1][4]=true;
assert.equal(call({action:'chat_sync',token}).status,'active');
// Existing six-column history survives schema extension and is interpreted as text.
sheets.Chat_Mesazhet.rows.push(['old','umra-2026','member','Old name','Old message','2026-11-24']);
assert.equal(call({action:'chat_sync',token}).messages[0].kind,'text');
const bytes=Buffer.alloc(90000,42);bytes.set([26,69,223,163]);
const id=crypto.randomUUID(),payload={action:'chat_send',token,id,kind:'audio',mime:'audio/webm;codecs=opus',duration:34,audioBase64:bytes.toString('base64')};
const ack=call(payload);assert.equal(ack.ok,true);assert.equal(ack.message.kind,'audio');assert.equal(ack.message.duration,34);
assert.equal(sheets.Chat_Audio.rows.length,5);assert(sheets.Chat_Audio.rows.slice(1).every(r=>r[3].length<40000));
const replay=call(payload);assert.equal(replay.message.id,id);assert.equal(sheets.Chat_Audio.rows.length,5);assert.equal(sheets.Chat_Mesazhet.rows.length,3);
const download=call({action:'chat_audio',token,id});assert.equal(download.audioBase64,bytes.toString('base64'));assert.equal(download.mime,payload.mime);
call({action:'chat_join',token:other,name:'Other Group'});sheets.Chat_Anetaret.rows[2][4]=true;sheets.Chat_Anetaret.rows[2][3]='other-group';
assert.equal(call({action:'chat_audio',token:other,id}).error,'AUDIO_UNAVAILABLE');
assert.equal(call({action:'chat_sync',token:other}).messages.length,0);
assert.equal(call({...payload,token:other}).error,'INVALID_MESSAGE');
cached.clear();
assert.equal(call({...payload,id:crypto.randomUUID(),duration:61}).error,'INVALID_AUDIO');
assert.equal(call({...payload,id:crypto.randomUUID(),audioBase64:Buffer.from('<script>').toString('base64')}).error,'INVALID_AUDIO');
assert.equal(call({...payload,id:crypto.randomUUID(),audioBase64:Buffer.alloc(1048577).toString('base64')}).error,'INVALID_AUDIO');
const text=call({action:'chat_send',token,id:crypto.randomUUID(),body:'=formula'});assert.equal(text.ok,true);assert.equal(sheets.Chat_Mesazhet.rows.at(-1)[4],"'=formula");
assert.equal(call({action:'chat_send',token,id:crypto.randomUUID(),body:'too fast'}).error,'RATE_LIMIT');
cached.clear();
const imageId=crypto.randomUUID(),jpeg=Buffer.from([255,216,255,224,0,0,255,217]).toString('base64');
const image={action:'chat_send',token,id:imageId,kind:'photo',mime:'image/jpeg',audioBase64:jpeg};
assert.equal(call(image).message.kind,'photo');
const photoRows=sheets.Chat_Audio.rows.length;
assert.equal(call(image).message.id,imageId);
assert.equal(sheets.Chat_Audio.rows.length,photoRows);
assert.equal(call({action:'chat_audio',kind:'photo',token,id:imageId}).audioBase64,jpeg);
assert.equal(call({action:'chat_audio',kind:'photo',token:other,id:imageId}).error,'AUDIO_UNAVAILABLE');
assert.equal(call({action:'chat_audio',token,id:imageId}).error,'AUDIO_UNAVAILABLE');
assert.equal(call({...image,id:crypto.randomUUID(),audioBase64:'PHN2Zz4='}).error,'INVALID_PHOTO');
assert.equal(call({action:'chat_join',token:'c'.repeat(64),name:'NameOnly'}).error,'INVALID_NAME');
const visits=ss.insertSheet('Chat_Vizitat');
visits.appendRow(['grupi','titulli','detajet']);
visits.appendRow(['umra-2026','Takimi','08:00 · Ballina e hotelit']);
visits.appendRow(['other-group','Takimi tjetër','12:00']);
assert.deepEqual(call({action:'chat_sync',token}).visits,[{title:'Takimi',details:'08:00 · Ballina e hotelit'}]);
assert.deepEqual(call({action:'chat_sync',token:other}).visits,[{title:'Takimi tjetër',details:'12:00'}]);
sheets.Chat_Anetaret.rows[1][4]=false;
assert.equal(call({action:'chat_sync',token}).visits,undefined);
assert.equal(call({action:'chat_audio',kind:'photo',token,id:imageId}).audioBase64,undefined);
assert.equal(locks,0);
console.log('PASS: approval, legacy migration, audio chunks/reconstruction, idempotency, group isolation, validation, formula protection, throttle, private photos and visits');
