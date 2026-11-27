(() => {
 'use strict';
 const API='https://script.google.com/macros/s/AKfycbxglgvt0uiZki_xGZ009fWPD-wtDnIQPELNgcyr9bQ-kih68_fUYiYu5Bjs5MhqVgI0/exec';
 const KEY='fahriu_chat_v1', MAX_AUDIO=1024*1024, MAX_SECONDS=60, $=id=>document.getElementById(id);
 let state,busy=false,storageOK=true,draftTimer,recorder,stream,recordTimer,recordStarted,previewURL,dbPromise,renderKey='',noticeReady=false,requestingMic=false;
 const audioURLs=new Map();
 try{state=JSON.parse(localStorage.getItem(KEY)||'null')}catch{storageOK=false}
 if(!state||!Array.isArray(state.queue)||!Array.isArray(state.messages))state={token:'',name:'',status:'',member:null,queue:[],messages:[],draft:''};
 // Existing queues belong to the last approved group on this device.
 if(state.member?.group){
  for(const item of state.queue)if(item.group===undefined)item.group=state.member.group;
 }
 const errors={INVALID_NAME:'Shkruaj emrin dhe mbiemrin, deri në 60 shkronja.',NOT_MEMBER:'Kërkoni hyrje në grup.',INVALID_TOKEN:'Hyrja në këtë pajisje nuk është e vlefshme. Kontaktoni organizatorin.',RATE_LIMIT:'Prisni pak. Mesazhi mbetet në pritje.',BUSY:'Shërbimi është i zënë. Provojmë përsëri së shpejti.',CONTACT_ADMIN:'Kontaktoni organizatorin për hyrje.',GROUP_CHANGED:'Grupi ka ndryshuar. Mesazhi mbetet në pajisje.',NO_GROUP:'Organizatori duhet t’ju caktojë grupin.',CHAT_UNAVAILABLE:'Chati nuk përgjigjet. Mesazhet mbeten në pritje.',INVALID_PHOTO:'Fotografia nuk u pranua. Kontakto organizatorin.',INVALID_AUDIO:'Audioja nuk u pranua. Ruhet në pritje; kontaktoni organizatorin.',AUDIO_NOT_FOUND:'Audioja nuk është më në dispozicion.',AUDIO_UNAVAILABLE:'Audioja nuk është më në dispozicion.'};
 let cameraStream,cameraRequest=0,photoURL,photoBusy=false;
 function feedback(text){$('feedback').textContent=text;$('joinFeedback').textContent=state.name?'':text}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;return true}catch{storageOK=false;feedback('Pajisja nuk mund t’i ruajë të dhënat. Mos e mbyllni faqen; mesazhet e reja nuk u ruajtën.');return false}}
 function random(bytes){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('')}
 function uuid(){const s=random(16);return s.slice(0,8)+'-'+s.slice(8,12)+'-4'+s.slice(13,16)+'-a'+s.slice(17,20)+'-'+s.slice(20)}
 function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(Error('Ruajtja e audios nuk mbështetet në këtë pajisje.'));return}const r=indexedDB.open('fahriu_chat_voice_v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('audio',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{dbPromise=null;reject(Error('Ruajtja e audios në pajisje dështoi.'))};r.onblocked=()=>reject(Error('Mbyllni dritaret e tjera të chatit dhe provoni përsëri.'))}))}
 async function audioStore(mode,id,blob){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('audio',mode),store=tx.objectStore('audio');let result;const r=blob?store.put({id,blob}):store.get(id);r.onsuccess=()=>{result=r.result};tx.oncomplete=()=>resolve(result?.blob||result);tx.onerror=()=>reject(Error('Audioja nuk u ruajt. Kontrolloni hapësirën në pajisje.'));tx.onabort=()=>reject(Error('Ruajtja e audios u ndërpre.'))})}
 async function getAudio(id){return audioStore('readonly',id)}
 async function putAudio(id,blob){return audioStore('readwrite',id,blob)}
 async function deleteAudio(id){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('audio','readwrite');tx.objectStore('audio').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Audioja nuk u fshi nga pajisja.'))})}
 function audioBase64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Audioja nuk mund të lexohet.'));r.readAsDataURL(blob)})}
 function decodedAudio(data,mime){const raw=atob(data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:mime})}
 async function api(action,extra={}){const body=new URLSearchParams({action,token:state.token,...extra});const c=new AbortController(),timeout=setTimeout(()=>c.abort(),45000);try{const r=await fetch(API,{method:'POST',body,signal:c.signal,credentials:'omit',cache:'no-store'});if(!r.ok)throw Error('CHAT_UNAVAILABLE');const d=await r.json();if(!d.ok)throw Error(d.error||'CHAT_UNAVAILABLE');return d}finally{clearTimeout(timeout)}}
 function apply(d){const wasActive=state.status==='active';state.status=d.status;state.member=d.member||state.member;if(d.status!=='active'){state.messages=[];state.visits=[];closeCamera();for(const url of audioURLs.values())URL.revokeObjectURL(url);audioURLs.clear()}if(Array.isArray(d.visits))state.visits=d.visits;if(d.messages){notifyNew(d.messages);state.messages=d.messages}save();if(wasActive!==(state.status==='active'))showPhoto().catch(e=>{$('photoStatus').textContent=e.message})}
 function notifyNew(messages){const old=new Set(state.messages.map(m=>m.id));const unseen=messages.filter(m=>!old.has(m.id)&&m.memberId!==state.member?.id);if(noticeReady&&state.notifications&&unseen.length&&'Notification'in window&&Notification.permission==='granted'){
  const title=unseen.length===1?'Mesazh i ri · Fahriu Travel':unseen.length+' mesazhe të reja · Fahriu Travel';
  // No private message text is disclosed on the lock screen.
  if('serviceWorker'in navigator)navigator.serviceWorker.getRegistration().then(reg=>{if(reg)return reg.showNotification(title,{body:'Hap chatin për ta lexuar.',tag:'fahriu-chat',data:{url:'chat.html'}});new Notification(title,{body:'Hap chatin për ta lexuar.',tag:'fahriu-chat'})}).catch(()=>{});
 }noticeReady=true}
 function render(){
  $('connection').textContent=navigator.onLine?'Me internet · '+(state.status==='active'?'Bisedë private e grupit':'Hyrja miratohet nga organizatori'):'Pa internet · Mesazhet e reja ruhen në pritje';
  $('joinBox').hidden=!!state.name;$('memberBox').hidden=!state.name;
  $('membership').textContent=state.status==='active'?'Mirë se erdhe, '+state.name+'. Grupi: '+(state.member?.group||'Umra'):(state.name?state.name+' · Kërkesa për hyrje është në pritje të miratimit nga organizatori.':'');
  $('sendButton').textContent=state.status==='active'&&navigator.onLine?'Dërgo':'Ruaj në pritje';
  $('queueCount').textContent=state.queue.length?state.queue.length+' në pritje':'';
  $('notifications').textContent=state.notifications?'Çaktivizo njoftimet':'Aktivizo njoftimet';
  $('sendForm').hidden=state.status!=='active';
  const visits=$('visitList');visits.replaceChildren();
  $('groupVisits').hidden=state.status!=='active';
  if(state.status==='active'){
   for(const visit of state.visits||[]){
    const title=document.createElement('h3'),details=document.createElement('p');
    title.textContent=visit.title;details.textContent=visit.details;visits.append(title,details);
   }
   if(!(state.visits||[]).length){const empty=document.createElement('p');empty.textContent='Ende nuk ka vizita të publikuara për grupin.';visits.append(empty)}
  }
  const messages=state.status==='active'?state.messages:[];
  const pending=(state.status==='active'?state.queue:[]).filter(q=>q.group===(state.member?.group||'')).filter(q=>!messages.some(m=>m.id===q.id)).map(q=>({...q,name:state.name||'Ti',pending:true}));
  const signature=JSON.stringify([messages,pending]);if(signature===renderKey)return;renderKey=signature;
  $('empty').hidden=!!(messages.length+pending.length);const log=$('messages');log.replaceChildren();
  for(const m of [...messages,...pending]){
   const el=document.createElement('article');el.className='message'+(m.pending?' pending own':m.memberId===state.member?.id?' own':'');const name=document.createElement('h3'),text=document.createElement('p'),meta=document.createElement('small');name.textContent=m.name;text.textContent=m.kind==='audio'?'Mesazh zanor'+(m.duration?' · '+Math.round(m.duration)+' sekonda':''):m.kind==='photo'?'Fotografi':m.body;
   const date=new Date(m.createdAt);meta.textContent=(Number.isNaN(date.valueOf())?'':date.toLocaleString('sq-AL',{timeZone:'Asia/Riyadh'})+' · Ora e Mekës · ')+(m.pending?'Në pritje':'Dërguar');el.append(name,text);
   if(m.kind==='audio'){const box=document.createElement('div'),button=document.createElement('button');box.className='voiceMessage';button.type='button';button.className='secondary';button.textContent='Hap audion';button.onclick=async()=>{button.disabled=true;try{let blob=await getAudio(m.id);if(!blob){if(!navigator.onLine)throw Error('Kjo audio ende nuk është ruajtur në pajisje. Hapeni një herë me internet.');const d=await api('chat_audio',{id:m.id});if(!/^audio\//.test(d.mime||'')||typeof d.audioBase64!=='string'||d.audioBase64.length>Math.ceil(MAX_AUDIO*4/3)+8)throw Error('Audioja nuk është e vlefshme.');blob=decodedAudio(d.audioBase64,d.mime);await putAudio(m.id,blob)}const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.src=audioURLs.get(m.id)||URL.createObjectURL(blob);audioURLs.set(m.id,audio.src);box.replaceChildren(audio);audio.play().catch(()=>{})}catch(e){feedback(errors[e.message]||e.message);button.disabled=false}};box.append(button);el.append(box)}
   if(m.kind==='photo'){
    const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Hap fotografinë';
    button.onclick=async()=>{
     button.disabled=true;
     try{
      let blob=await getAudio(m.id);
      if(!blob){
       if(!navigator.onLine)throw Error('Hape fotografinë një herë me internet.');
       const d=await api('chat_audio',{id:m.id,kind:'photo'});
       if(d.mime!=='image/jpeg'||typeof d.audioBase64!=='string'||d.audioBase64.length>Math.ceil(MAX_AUDIO/3)*4)throw Error('Fotografia nuk është e vlefshme.');
       blob=decodedAudio(d.audioBase64,d.mime);await putAudio(m.id,blob);
      }
      if(state.status!=='active'||!button.isConnected)return;
      const img=document.createElement('img');img.className='chatPhoto';img.alt='Fotografi nga '+m.name;
      img.src=audioURLs.get(m.id)||URL.createObjectURL(blob);audioURLs.set(m.id,img.src);button.replaceWith(img);
     }catch(e){feedback(e.message==='AUDIO_UNAVAILABLE'?'Fotografia nuk është në dispozicion.':e.message);button.disabled=false}
    };
    el.append(button);
   }
   el.append(meta);log.append(el);
  }
 }
 async function sync(){if(busy||!state.name||!navigator.onLine||!storageOK)return;busy=true;try{
  let d=await api('chat_join',{name:state.name});apply(d);render();if(d.status!=='active')return;
  const group=state.member?.group||'';
  for(const q of state.queue.filter(item=>item.group===group)){
   const payload={id:q.id,body:q.body||'',group};if(q.kind==='audio'||q.kind==='photo'){const blob=await getAudio(q.id);if(!blob)throw Error('Skedari në pritje mungon në pajisje.');Object.assign(payload,{kind:q.kind,mime:q.mime,audioBase64:await audioBase64(blob),duration:q.duration})}
   const ack=await api('chat_send',payload);if(ack.status!=='active'||!ack.message){apply(ack);return}const before=state.queue;state.queue=state.queue.filter(x=>x.id!==q.id);if(!state.messages.some(m=>m.id===ack.message.id))state.messages.push(ack.message);if(!save()){state.queue=before;return}render();await new Promise(r=>setTimeout(r,2100));
  }
  apply(await api('chat_sync'));feedback(state.queue.some(item=>item.group!==group)?'Mesazhet në pritje për grupin e mëparshëm ruhen në pajisje.':'Përditësuar: '+new Date().toLocaleTimeString('sq-AL'));
 }catch(e){if(['NOT_MEMBER','INVALID_TOKEN','NO_GROUP'].includes(e.message))apply({status:'pending'});feedback(errors[e.message]||'Lidhja nuk u krye. '+(e.name==='AbortError'?'':'')+'Mesazhet mbeten në pritje.')}finally{busy=false;render()}}
 function canQueue(){if(state.queue.length>=100){feedback('Ka 100 mesazhe në pritje. Lidheni pajisjen me internet para se të shtoni të tjera.');return false}return true}
 async function showPreview(){if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;$('voicePreview').hidden=true;if(state.voiceDraft){const blob=await getAudio(state.voiceDraft.id);if(!blob)throw Error('Audioja e papërfunduar nuk u gjet në pajisje. Regjistrojeni përsëri.');previewURL=URL.createObjectURL(blob);$('previewAudio').src=previewURL;$('voicePreview').hidden=false;$('voiceStatus').textContent='Audio e ruajtur në pajisje · '+Math.round(state.voiceDraft.duration)+' sekonda. Dëgjoje para dërgimit.'} $('recordVoice').disabled=!!state.voiceDraft}
 async function stageAudio(blob,duration){if(blob.size===0||blob.size>MAX_AUDIO||!Number.isFinite(duration)||duration<=0||duration>MAX_SECONDS+0.5)throw Error('Regjistrimi duhet të jetë deri në 60 sekonda dhe 1 MB.');if(!/^audio\/(webm|ogg|mp4|x-m4a|mpeg|wav|x-wav)(;.*)?$/i.test(blob.type))throw Error('Formati i regjistrimit nuk mbështetet në këtë pajisje. Provo një shfletues të përditësuar.');const draft={id:uuid(),kind:'audio',mime:blob.type.replace(/^audio\/x-m4a/i,'audio/mp4'),duration:Math.min(MAX_SECONDS,duration),createdAt:new Date().toISOString()};await putAudio(draft.id,blob);state.voiceDraft=draft;if(!save()){state.voiceDraft=null;return}await showPreview()}
 function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop();clearInterval(recordTimer);$('stopVoice').hidden=true}
 function closeCamera(){
  cameraRequest++;
  cameraStream?.getTracks().forEach(track=>track.stop());
  cameraStream=null;
  $('cameraVideo').srcObject=null;
  $('cameraBox').hidden=true;
  $('openCamera').disabled=false;
 }
 async function showPhoto(){
  if(photoURL)URL.revokeObjectURL(photoURL);
  photoURL=null;$('previewPhoto').removeAttribute?.('src');$('photoPreview').hidden=true;
  if(!state.photoDraft||state.status!=='active')return;
  const blob=await getAudio(state.photoDraft.id);
  if(!blob)throw Error('Fotografia e ruajtur mungon në pajisje.');
  photoURL=URL.createObjectURL(blob);$('previewPhoto').src=photoURL;$('photoPreview').hidden=false;
 }
 async function stagePhoto(source,width,height){
  if(photoBusy||state.photoDraft||state.status!=='active')return;
  if(!width||!height)throw Error('Fotografia nuk mund të lexohet.');
  photoBusy=true;
  try{
   const canvas=document.createElement('canvas'),scale=Math.min(1,1280/Math.max(width,height));
   canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(source,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.82));
   if(!blob||!blob.size||blob.size>MAX_AUDIO)throw Error('Fotografia duhet të jetë deri në 1 MB pas kompresimit.');
   const draft={id:uuid(),kind:'photo',mime:'image/jpeg',createdAt:new Date().toISOString()};
   await putAudio(draft.id,blob);state.photoDraft=draft;
   if(!save()){state.photoDraft=null;await deleteAudio(draft.id);return}
   await showPhoto();
  }finally{photoBusy=false}
 }
 $('photoFile').onchange=async()=>{
  const input=$('photoFile'),file=input.files[0];input.value='';
  if(!file||state.photoDraft)return;
  let url;
  try{
   if(file.size>30*1024*1024)throw Error('Zgjidh një fotografi deri në 30 MB.');
   url=URL.createObjectURL(file);
   const image=new Image();image.src=url;await image.decode();
   await stagePhoto(image,image.naturalWidth,image.naturalHeight);
  }catch(e){$('photoStatus').textContent=e.message}finally{if(url)URL.revokeObjectURL(url)}
 };
 $('openCamera').onclick=async()=>{
  if(state.status!=='active'||state.photoDraft||cameraStream)return;
  if(!navigator.mediaDevices?.getUserMedia){$('photoStatus').textContent='Kamera nuk mbështetet këtu. Zgjidh një fotografi nga pajisja ose hap chatin në shfletues.';return}
  $('openCamera').disabled=true;const request=++cameraRequest;
  try{
   const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
   if(request!==cameraRequest||document.hidden||state.status!=='active'){media.getTracks().forEach(track=>track.stop());return}
   cameraStream=media;$('cameraVideo').srcObject=media;$('cameraBox').hidden=false;
  }catch{if(request===cameraRequest){closeCamera();$('photoStatus').textContent='Kamera nuk u hap. Kontrollo lejen ose zgjidh një fotografi nga pajisja.'}}
 };
 $('closeCamera').onclick=closeCamera;
 $('takePhoto').onclick=async()=>{
  const video=$('cameraVideo');
  try{await stagePhoto(video,video.videoWidth,video.videoHeight);closeCamera()}
  catch(e){$('photoStatus').textContent=e.message}
 };
 $('sendPhoto').onclick=async()=>{
  const draft=state.photoDraft;if(!draft||photoBusy||state.status!=='active'||!canQueue())return;
  photoBusy=true;
  try{
   if(!await getAudio(draft.id))throw Error('Fotografia mungon në pajisje.');
   state.photoDraft=null;state.queue.push({...draft,group:state.member?.group||''});
   if(!save()){state.queue.pop();state.photoDraft=draft;return}
   await showPhoto();$('photoStatus').textContent='Fotografia u ruajt në pritje.';render();sync();
  }catch(e){$('photoStatus').textContent=e.message}finally{photoBusy=false}
 };
 $('discardPhoto').onclick=async()=>{
  const draft=state.photoDraft;if(!draft||photoBusy)return;
  photoBusy=true;
  try{
   state.photoDraft=null;if(!save()){state.photoDraft=draft;return}
   await showPhoto();await deleteAudio(draft.id);$('photoStatus').textContent='';
  }catch(e){$('photoStatus').textContent=e.message}finally{photoBusy=false}
 };
 $('recordVoice').onclick=async()=>{if(state.status!=='active'||state.voiceDraft||requestingMic||recorder?.state==='recording')return;if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){$('voiceStatus').textContent='Regjistrimi nuk mbështetet këtu. Hapni chatin në Chrome përmes HTTPS dhe lejoni mikrofonin.';return}requestingMic=true;$('recordVoice').disabled=true;$('voiceStatus').textContent='Lejo mikrofonin për të folur.';try{await db();stream=await navigator.mediaDevices.getUserMedia({audio:true});if(document.hidden){stream.getTracks().forEach(t=>t.stop());throw Error('Faqja u mbyll para regjistrimit.')}requestingMic=false;const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:32000});let chunks=[],size=0;recordStarted=Date.now();recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;if(size>MAX_AUDIO)stopRecording()}};recorder.onerror=()=>{$('voiceStatus').textContent='Regjistrimi dështoi. Provo përsëri me mikrofon.';stopRecording()};recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const duration=Math.min(MAX_SECONDS,(Date.now()-recordStarted)/1000);$('recordVoice').disabled=false;try{await stageAudio(new Blob(chunks,{type:recorder.mimeType||mime||'audio/webm'}),duration)}catch(e){$('voiceStatus').textContent=e.message}};recorder.start(500);$('voiceStatus').textContent='Po të dëgjoj · 0 / 60 sekonda';$('recordVoice').disabled=true;$('stopVoice').hidden=false;recordTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-recordStarted)/1000);$('voiceStatus').textContent='Duke regjistruar · '+seconds+' / 60 sekonda';if(seconds>=MAX_SECONDS)stopRecording()},250)}catch(e){requestingMic=false;stream?.getTracks().forEach(t=>t.stop());$('recordVoice').disabled=!!state.voiceDraft;clearInterval(recordTimer);$('stopVoice').hidden=true;$('voiceStatus').textContent=e.name==='NotAllowedError'?'Lejo mikrofonin nga cilësimet e aplikacionit ose të shfletuesit dhe provo përsëri.':'Mikrofoni nuk u hap. Kontrollo lejen e mikrofonit dhe provo përsëri.'}};
 $('stopVoice').onclick=stopRecording;
 $('sendVoice').onclick=async()=>{if(state.status!=='active'||!state.voiceDraft||!canQueue())return;$('sendVoice').disabled=true;try{if(!await getAudio(state.voiceDraft.id))throw Error('Audioja nuk u gjet në pajisje.');const draft=state.voiceDraft;state.queue.push({...draft,body:'',group:state.member?.group||''});state.voiceDraft=null;if(!save()){state.queue.pop();state.voiceDraft=draft;return}await showPreview();$('voiceStatus').textContent='Audioja u ruajt në pritje. Dërgohet kur hyrja miratohet dhe ka internet.';render();sync()}catch(e){feedback(e.message)}finally{$('sendVoice').disabled=false}};
 $('discardVoice').onclick=async()=>{const previous=state.voiceDraft;state.voiceDraft=null;if(!save()){state.voiceDraft=previous;return}await showPreview();if(previous)try{await deleteAudio(previous.id)}catch(e){feedback(e.message)}$('voiceStatus').textContent='Audioja u hoq nga përgatitja. Mund të regjistroni përsëri.'};
 $('notifications').onclick=async()=>{if(state.notifications){state.notifications=false;save();render();return}if(!('Notification'in window)){ $('notificationStatus').textContent='Kjo pajisje nuk mbështet njoftime nga shfletuesi.';return}try{const permission=await Notification.requestPermission();state.notifications=permission==='granted';save();$('notificationStatus').textContent=state.notifications?'Njoftimet janë aktive kur chati është i hapur dhe ka internet. Njoftimet kur aplikacioni është i mbyllur nuk janë aktivizuar.':'Njoftimet nuk u lejuan. Mund t’i aktivizoni nga cilësimet e shfletuesit.';render()}catch{$('notificationStatus').textContent='Njoftimet nuk u aktivizuan në këtë pajisje.'}};
 $('body').value=state.draft||'';$('body').addEventListener('input',()=>{closeCamera();state.draft=$('body').value;clearTimeout(draftTimer);draftTimer=setTimeout(save,200)});
 $('joinForm').addEventListener('submit',e=>{e.preventDefault();try{const chosen=$('name').value.trim();if(!/^[\p{L}\p{M}][\p{L}\p{M} .’'-]* [\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u.test(chosen.replace(/\s+/g,' '))){feedback('Shkruaj emrin dhe mbiemrin.');return}state.name=chosen;if(!state.token)state.token=random(32);state.status='pending';if(save()){render();sync()}}catch{feedback('Për hyrjen e sigurt, hapeni chatin në shfletuesin e përditësuar.')}});
 $('sendForm').addEventListener('submit',e=>{e.preventDefault();const body=$('body').value.trim();if(state.status!=='active'||!body||body.length>2000||!canQueue())return;try{state.queue.push({id:uuid(),body,group:state.member?.group||'',createdAt:new Date().toISOString()});state.draft='';if(!save()){state.queue.pop();state.draft=body;return}$('body').value='';feedback('Mesazhi u ruajt në pritje.');render();sync()}catch{feedback('Mesazhi nuk u ruajt. Hapeni chatin në një shfletues të përditësuar.')}});
 $('refresh').addEventListener('click',()=>{if(!storageOK)save();sync()});addEventListener('online',()=>{render();sync()});addEventListener('offline',render);document.addEventListener('visibilitychange',()=>{if(document.hidden)closeCamera();else sync()});setInterval(()=>{if(!document.hidden)sync()},15000);
 addEventListener('pagehide',()=>{closeCamera();state.draft=$('body').value;save();if(recorder?.state==='recording')stopRecording()});try{localStorage.removeItem?.('fahriu_chat_roster_v1')}catch{}render();showPhoto().catch(e=>{$('photoStatus').textContent=e.message});showPreview().catch(e=>{$('voiceStatus').textContent=e.message;$('discardVoice').hidden=false;$('voicePreview').hidden=false});sync();
 if('serviceWorker'in navigator&&location.protocol==='https:'&&location.hostname!=='appassets.androidplatform.net')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
