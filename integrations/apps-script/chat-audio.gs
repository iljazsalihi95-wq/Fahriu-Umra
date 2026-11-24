// Replace the existing ftChat_ and ftChatMessage_ functions with this file.
// Also add 'chat_audio' to the doPost chat action allowlist.
// Uses the existing spreadsheet scope only. Chat_Audio is never served publicly.
function ftChat_(p) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return {ok:false,error:'BUSY'};
  try {
    var action = String(p.action || '').toLowerCase();
    if (['chat_join','chat_sync','chat_send','chat_audio'].indexOf(action) < 0) return {ok:false,error:'INVALID_ACTION'};
    var token = String(p.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) return {ok:false,error:'INVALID_TOKEN'};
    var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,token).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2)}).join('');
    var ss = SpreadsheetApp.openById(FT_MASTER.SPREADSHEET_ID);
    var members = ftChatSheet_(ss,'Chat_Anetaret',['id','token_hash','emri','grupi','aktiv','krijuar']);
    var rows = members.getDataRange().getValues(), member = null;
    for (var i=1;i<rows.length;i++) if(rows[i][1]===hash){member=rows[i];break;}
    var cache = CacheService.getScriptCache();
    if(action==='chat_join' && !member){
      var name = String(p.name||'').trim();
      if(name.length<2 || name.length>60) return {ok:false,error:'INVALID_NAME'};
      if(rows.length>300) return {ok:false,error:'CONTACT_ADMIN'};
      var count=Number(cache.get('ft_chat_join_count')||0);
      if(count>=30) return {ok:false,error:'BUSY'};
      cache.put('ft_chat_join_count',String(count+1),3600);
      member=[Utilities.getUuid(),hash,name,'umra-2026',false,new Date().toISOString()];
      ftChatWrite_(members,member);
    }
    if(!member) return {ok:false,error:'NOT_MEMBER'};
    var active=member[4]===true || ['true','po'].indexOf(String(member[4]).toLowerCase())>=0;
    if(!active) return {ok:true,status:'pending',member:{id:member[0],name:member[2]}};
    var group=String(member[3]||'');
    if(!group) return {ok:false,error:'NO_GROUP'};
    var messages=ftChatSheet_(ss,'Chat_Mesazhet',['id','grupi','anetari','emri','teksti','krijuar','lloji','mime','sekonda','audio_key']);
    var data=messages.getDataRange().getValues();
    if(action==='chat_audio'){
      var wanted=String(p.id||''), found=null;
      for(var a=1;a<data.length;a++) if(data[a][0]===wanted && data[a][1]===group){found=data[a];break;}
      if(!found || found[6]!=='audio' || !found[9]) return {ok:false,error:'AUDIO_UNAVAILABLE'};
      var audio=ss.getSheetByName('Chat_Audio');
      if(!audio) return {ok:false,error:'AUDIO_UNAVAILABLE'};
      var chunks=audio.getDataRange().getValues().slice(1).filter(function(r){return r[0]===found[9] && r[1]===group;}).sort(function(x,y){return Number(x[2])-Number(y[2]);});
      if(!chunks.length) return {ok:false,error:'AUDIO_UNAVAILABLE'};
      for(var c=0;c<chunks.length;c++) if(Number(chunks[c][2])!==c) return {ok:false,error:'AUDIO_UNAVAILABLE'};
      return {ok:true,status:'active',mime:found[7],audioBase64:chunks.map(function(r){return String(r[3]);}).join('')};
    }
    if(action==='chat_send'){
      var id=String(p.id||''), body=String(p.body||'').trim();
      var kind=String(p.kind||'text');
      if(!/^[a-f0-9-]{36}$/.test(id) || ['text','audio'].indexOf(kind)<0) return {ok:false,error:'INVALID_MESSAGE'};
      for(var j=1;j<data.length;j++) if(data[j][0]===id){
        if(data[j][1]!==group || data[j][2]!==member[0]) return {ok:false,error:'INVALID_MESSAGE'};
        return {ok:true,status:'active',message:ftChatMessage_(data[j])};
      }
      var mime='', duration=0, encoded='';
      if(kind==='text'){
        if(!body || body.length>2000) return {ok:false,error:'INVALID_MESSAGE'};
      } else {
        mime=String(p.mime||'').toLowerCase();duration=Number(p.duration);
        if(!/^audio\/(webm|mp4|ogg|mpeg|wav|x-wav)(;\s*codecs=[a-z0-9., -]+)?$/.test(mime) || !isFinite(duration) || duration<=0 || duration>60) return {ok:false,error:'INVALID_AUDIO'};
        encoded=String(p.audioBase64||'');
        if(!encoded || encoded.length>1398104 || encoded.length%4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return {ok:false,error:'INVALID_AUDIO'};
        var bytes;
        try {bytes=Utilities.base64Decode(encoded);} catch(e){return {ok:false,error:'INVALID_AUDIO'};}
        if(!bytes.length || bytes.length>1048576 || !ftChatAudioSignature_(bytes,mime)) return {ok:false,error:'INVALID_AUDIO'};
        body='';
      }
      var key='ft_chat_send_'+member[0];
      if(cache.get(key)) return {ok:false,error:'RATE_LIMIT'};
      var audioKey='';
      if(kind==='audio'){
        var storage=ftChatSheet_(ss,'Chat_Audio',['audio_key','grupi','pjesa','base64']);
        if(storage.getLastRow()>100000) return {ok:false,error:'CONTACT_ADMIN'};
        audioKey=Utilities.getUuid();
        var pieces=[];
        for(var offset=0;offset<encoded.length;offset+=36000) pieces.push([audioKey,group,pieces.length,encoded.slice(offset,offset+36000)]);
        storage.getRange(storage.getLastRow()+1,1,pieces.length,4).setNumberFormat('@').setValues(pieces);
      }
      // Commit the visible message only after all audio chunks have been written.
      var row=[id,group,member[0],member[2],body,new Date().toISOString(),kind,mime,duration,audioKey];
      ftChatWrite_(messages,row);
      cache.put(key,'1',2);
      return {ok:true,status:'active',message:ftChatMessage_(row)};
    }
    return {ok:true,status:'active',member:{id:member[0],name:member[2],group:group},messages:data.slice(1).filter(function(r){return r[1]===group;}).slice(-200).map(ftChatMessage_)};
  } catch(err){return {ok:false,error:'CHAT_UNAVAILABLE'};} finally {lock.releaseLock();}
}
function ftChatSheet_(ss,name,headers){
  var sh=ss.getSheetByName(name);
  if(!sh){sh=ss.insertSheet(name);sh.appendRow(headers);sh.setFrozenRows(1);}
  else if(sh.getLastColumn()<headers.length) sh.getRange(1,1,1,headers.length).setValues([headers]);
  return sh;
}
function ftChatWrite_(sheet,row){
  sheet.getRange(sheet.getLastRow()+1,1,1,row.length).setNumberFormat('@').setValues([row.map(function(v){return typeof v==='string' && /^[=+@-]/.test(v)?"'"+v:v;})]);
}
function ftChatMessage_(r){return {id:r[0],memberId:r[2],name:r[3],body:r[4],createdAt:r[5] instanceof Date?r[5].toISOString():String(r[5]),kind:r[6]||'text',mime:r[7]||'',duration:Number(r[8])||0};}
function ftChatAudioSignature_(bytes,mime){
  var b=bytes.map(function(x){return (x+256)%256;});
  function text(start,n){return String.fromCharCode.apply(null,b.slice(start,start+n));}
  if(mime.indexOf('audio/webm')===0) return b[0]===26 && b[1]===69 && b[2]===223 && b[3]===163;
  if(mime.indexOf('audio/ogg')===0) return text(0,4)==='OggS';
  if(mime.indexOf('audio/mp4')===0) return text(4,4)==='ftyp';
  if(mime.indexOf('audio/mpeg')===0) return text(0,3)==='ID3' || (b[0]===255 && (b[1]&224)===224);
  return text(0,4)==='RIFF' && text(8,4)==='WAVE';
}
