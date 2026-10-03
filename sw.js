/* MoneyNest SW v3 — own address (Cloudflare Pages). Resilient install, network-first pages with offline fallback,
   cache-first assets, deletes ONLY its own old caches, cleans "redirected" page responses (Cloudflare pretty URLs). */
var CACHE='moneynest-v3';
var FILES=['./','./manifest.json','./icon-192.png','./icon-512.png','./privacy_policy.html'];
function cleanNav(r){ if(!r||!r.redirected) return r; return r.blob().then(function(b){return new Response(b,{status:r.status,statusText:r.statusText,headers:r.headers});}); }
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FILES.map(function(p){ return fetch(new Request(p,{cache:'reload'})).then(function(r){ if(r&&r.ok) return c.put(p,r); }).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k.indexOf('moneynest-')===0 && k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch',function(e){
  var req=e.request; if(req.method!=='GET') return;
  var url=new URL(req.url); if(url.origin!==self.location.origin) return;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(function(r){ if(r&&r.ok){ var cp=r.clone(); caches.open(CACHE).then(function(c){c.put('./',cp);}); } return r; })
      .catch(function(){ return caches.match('./').then(function(r){ return cleanNav(r) || new Response('<h2 style="font-family:sans-serif;text-align:center;margin-top:40vh">אין חיבור — נסה שוב</h2>',{headers:{'content-type':'text/html; charset=utf-8'}}); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){
    var net=fetch(req).then(function(r){ if(r&&r.ok){ var cp=r.clone(); caches.open(CACHE).then(function(c){c.put(req,cp);}); } return r; }).catch(function(){ return hit; });
    return hit||net;
  }));
});
