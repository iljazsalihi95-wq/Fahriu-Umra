const CACHE='fahriu-public-v1';
const FILES=['./','./index.html','./njoftime.html','./udhezuesi-umres.html','./vizitat-historike.html','./offline.js','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('fahriu-public-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const base=new URL('./',self.location.href);
 if(!FILES.some(file=>new URL(file,base).pathname===url.pathname)||url.search)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
  return response;
 }).catch(()=>caches.match(event.request).then(cached=>cached||new Response('Kjo faqe nuk është ruajtur për përdorim pa internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}))));
});