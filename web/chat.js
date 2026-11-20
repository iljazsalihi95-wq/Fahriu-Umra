(() => {
 'use strict';
 const API='https://script.google.com/macros/s/AKfycbxglgvt0uiZki_xGZ009fWPD-wtDnIQPELNgcyr9bQ-kih68_fUYiYu5Bjs5MhqVgI0/exec';
 const KEY='fahriu_chat_v1', $=id=>document.getElementById(id);
 let state, busy=false, storageOK=true, draftTimer;
 try {state=JSON.parse(localStorage.getItem(KEY)||'null')} catch {storageOK=false}
 if(!state||!Array.isArray(state.queue)||!Array.isArray(state.messages))state={token:'',name:'',status:'',member:null,queue:[],messages:[],draft:''};
 const errors={INVALID_NAME:'Shkruani emrin me 2–60 shkronja.',NOT_MEMBER:'Kërkoni hyrje në grup.',INVALID_TOKEN:'Hyrja në këtë pajisje nuk është e vlefshme. Kontaktoni organizatorin.',RATE_LIMIT:'Prisni pak. Mesazhi mbetet në pritje.',BUSY:'Shërbimi është i zënë. Provojmë përsëri së shpejti.',CONTACT_ADMIN:'Kontaktoni organizatorin për hyrje.',NO_GROUP:'Organizatori duhet t’ju caktojë grupin.',CHAT_UNAVAILABLE:'Chati nuk përgjigjet. Mesazhet mbeten në pritje.'};
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{storageOK=false;$('feedback').textContent='Pajisja nuk mund t’i ruajë të dhënat. Mos e mbyllni faqen; mesazhet e reja nuk u ruajtën.';return false}}
 function random(bytes){const a=new Uint8Array(bytes);crypto.getRandomValues(a);return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('')}
 function uuid(){const s=random(16);return s.slice(0,8)+'-'+s.slice(8,12)+'-4'+s.slice(13,16)+'-a'+s.slice(17,20)+'-'+s.slice(20)}
 async function api(action,extra={}){const body=new URLSearchParams({action,token:state.token,...extra});const c=new AbortController(),timeout=setTimeout(()=>c.abort(),20000);try{const r=await fetch(API,{method:'POST',body,signal:c.signal,credentials:'omit',cache:'no-store'});if(!r.ok)throw Error('CHAT_UNAVAILABLE');const d=await r.json();if(!d.ok)throw Error(d.error||'CHAT_UNAVAILABLE');return d}finally{clearTimeout(timeout)}}
 function apply(d){state.status=d.status;state.member=d.member||state.member;if(d.messages)state.messages=d.messages;save()}
 function render(){
  $('connection').textContent=navigator.onLine?'Me internet · '+(state.status==='active'?'Bisedë private e grupit':'Hyrja miratohet nga organizatori'):'Pa internet · Mesazhet e reja ruhen në pritje';
  $('joinBox').hidden=!!state.name;$('memberBox').hidden=!state.name;
  $('membership').textContent=state.status==='active'?'Mirë se erdhe, '+state.name+'. Grupi: '+(state.member?.group||'Umra'):(state.name?state.name+' · Kërkesa për hyrje është në pritje të miratimit nga organizatori.':'');
  $('sendButton').textContent=state.status==='active'&&navigator.onLine?'Dërgo':'Ruaj në pritje';
  $('queueCount').textContent=state.queue.length?state.queue.length+' në pritje':'';
  const messages=state.status==='active'?state.messages:[];
  const pending=state.queue.filter(q=>!messages.some(m=>m.id===q.id)).map(q=>({...q,name:state.name||'Ti',pending:true}));
  $('empty').hidden=!!(messages.length+pending.length);const log=$('messages');log.replaceChildren();
  for(const m of [...messages,...pending]){const el=document.createElement('article');el.className='message'+(m.pending?' pending own':m.memberId===state.member?.id?' own':'');const name=document.createElement('h3'),text=document.createElement('p'),meta=document.createElement('small');name.textContent=m.name;text.textContent=m.body;const date=new Date(m.createdAt);meta.textContent=(Number.isNaN(date.valueOf())?'':date.toLocaleString('sq-AL',{timeZone:'Asia/Riyadh'})+' · Ora e Mekës · ')+(m.pending?'Në pritje':'Dërguar');el.append(name,text,meta);log.append(el)}
 }
 async function sync(){if(busy||!state.name||!navigator.onLine||!storageOK)return;busy=true;try{
  let d=await api('chat_join',{name:state.name});apply(d);render();if(d.status!=='active')return;
  for(const q of [...state.queue]){const ack=await api('chat_send',{id:q.id,body:q.body});if(ack.status!=='active'||!ack.message){apply(ack);return}state.queue=state.queue.filter(x=>x.id!==q.id);if(!state.messages.some(m=>m.id===ack.message.id))state.messages.push(ack.message);if(!save())return;render();await new Promise(r=>setTimeout(r,2100))}
  apply(await api('chat_sync'));$('feedback').textContent='Përditësuar: '+new Date().toLocaleTimeString('sq-AL');
 }catch(e){$('feedback').textContent=errors[e.message]||'Lidhja nuk u krye. Mesazhet mbeten në pritje.'}finally{busy=false;render()}}
 $('body').value=state.draft||'';
 $('body').addEventListener('input',()=>{state.draft=$('body').value;clearTimeout(draftTimer);draftTimer=setTimeout(save,200)});
 $('joinForm').addEventListener('submit',e=>{e.preventDefault();try{state.name=$('name').value.trim();if(state.name.length<2)return;if(!state.token)state.token=random(32);state.status='pending';if(save()){render();sync()}}catch{$('feedback').textContent='Për hyrjen e sigurt, hapeni chatin në shfletuesin e përditësuar.'}});
 $('sendForm').addEventListener('submit',e=>{e.preventDefault();const body=$('body').value.trim();if(!body)return;if(body.length>2000)return;if(state.queue.length>=100){$('feedback').textContent='Ka 100 mesazhe në pritje. Lidheni pajisjen me internet para se të shtoni të tjera.';return}try{const message={id:uuid(),body,createdAt:new Date().toISOString()};state.queue.push(message);state.draft='';if(!save()){state.queue.pop();state.draft=body;return}$('body').value='';$('feedback').textContent='Mesazhi u ruajt në pritje.';render();sync()}catch{$('feedback').textContent='Mesazhi nuk u ruajt. Hapeni chatin në një shfletues të përditësuar.'}});
 $('refresh').addEventListener('click',sync);addEventListener('online',()=>{render();sync()});addEventListener('offline',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});setInterval(()=>{if(!document.hidden)sync()},15000);
 addEventListener('pagehide',()=>{state.draft=$('body').value;save()});render();sync();
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
