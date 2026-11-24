const CACHE='fahriu-travel-audio-v4';
const CORE=['./','./index.html','./offline.js','./udhezuesi-umres.html','./vizitat-historike.html','./chat.html','./chat.css','./chat.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./vizitat.html','./medine.html','./mekke.html','./taif.html','./udhezuesi.html','./bileta-lira.html','./nusuk.html','./programi-live.html','./dua-dhiker.html','./momente-umra.html','./grupi-ardhshem.html','./ekipi-organizues.html','./njoftime.html'];
const PATHS=CORE.map(p=>new URL(p,self.location.href).pathname);
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fahriu-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin||url.search)return;
 let path=url.pathname;
 if(!PATHS.includes(path)&&PATHS.includes(path+'.html'))path+='.html';
 if(!PATHS.includes(path))return;
 const canonical=new URL(path,self.location.origin).href;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok&&r.type==='basic'){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(canonical,copy)))}return r}).catch(()=>caches.match(canonical).then(r=>r||new Response('Faqja nuk është ruajtur për përdorim pa internet.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}}))));
});

self.addEventListener('notificationclick',event=>{event.notification.close();const target=new URL(event.notification.data?.url||'chat.html',self.location.href);if(target.origin!==self.location.origin)return;event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const client=clients.find(c=>new URL(c.url).pathname===target.pathname);if(client)return client.focus();return self.clients.openWindow(target.href)}))});
