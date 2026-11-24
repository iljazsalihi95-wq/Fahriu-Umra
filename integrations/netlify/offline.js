(()=>{'use strict';
 const banner=document.createElement('div');banner.setAttribute('role','status');banner.style.cssText='padding:10px 16px;background:#173d30;color:#fff;font:16px/1.5 system-ui;text-align:center';
 const update=()=>{banner.hidden=navigator.onLine;banner.textContent='Pa internet · Po lexoni përmbajtjen e ruajtur. Njoftimet e reja kërkojnë lidhje.';};
 document.body.prepend(banner);update();addEventListener('online',update);addEventListener('offline',update);
 if(location.protocol==='https:'&&location.hostname!=='appassets.androidplatform.net'&&'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{banner.hidden=false;banner.textContent='Ruajtja për përdorim pa internet nuk u aktivizua. Provoni sërish me internet.';});
})();