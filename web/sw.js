const CACHE='fahriu-travel-v7';
const CORE=['./','./index.html','./offline.js','./udhezuesi-umres.html','./vizitat-historike.html','./chat.html','./chat.css','./chat.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./vizitat.html','./medine.html','./mekke.html','./taif.html','./udhezuesi.html','./bileta-lira.html','./nusuk.html','./programi-live.html','./dua-dhiker.html','./momente-umra.html','./grupi-ardhshem.html','./ekipi-organizues.html','./njoftime.html'];
CORE.push(...Array.from({length:22},(_,index)=>'./media/umra/'+(index+1)+'.png'));
CORE.push(
 './media/visits/008f710d50c9785f.webp',
 './media/visits/16e9222852ecdd17.webp',
 './media/visits/2d2704008b22058d.webp',
 './media/visits/31cc5ff503be943e.webp',
 './media/visits/3e12d7de236ecb5e.webp',
 './media/visits/4a2b2b027961d45f.webp',
 './media/visits/52155de1dbb7e050.webp',
 './media/visits/5aa48f27f64e3e14.webp',
 './media/visits/637273a04d803854.webp',
 './media/visits/92307bace4199094.webp',
 './media/visits/9f9aedc0406674e4.webp',
 './media/visits/aadd3e462eb43eba.webp',
 './media/visits/c3ab873ef5401a5a.webp',
 './media/visits/efaefa378d793d36.webp'
);
const PATHS=CORE.map(p=>new URL(p,self.location.href).pathname);
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fahriu-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=='GET'||url.origin!==self.location.origin||(url.search&&e.request.mode!=='navigate'))return;
 let path=url.pathname;
 if(!PATHS.includes(path)&&PATHS.includes(path+'.html'))path+='.html';
 if(!PATHS.includes(path))return;
 const canonical=new URL(path,self.location.origin).href;
 e.respondWith(fetch(e.request).then(r=>{if(r.status>=500)throw Error('Unavailable');if(r.ok&&r.type==='basic'){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(canonical,copy)))}return r}).catch(()=>caches.match(canonical).then(r=>r||new Response('Faqja nuk është ruajtur për përdorim pa internet.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}}))));
});

self.addEventListener('notificationclick',event=>{event.notification.close();const target=new URL(event.notification.data?.url||'chat.html',self.location.href);if(target.origin!==self.location.origin)return;event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const client=clients.find(c=>new URL(c.url).pathname===target.pathname);if(client)return client.focus();return self.clients.openWindow(target.href)}))});
