/* ── AppNest · Cloudflare Pages fix (Oct 2026) ──
   Cloudflare redirects *.html to clean URLs (/index.html -> /). Chrome refuses a
   "redirected" response that a Service Worker hands to a page load (ERR_FAILED).
   This strips the redirect flag from every response the SW fetches or reads from cache. */
(function(){
  var NB={101:1,204:1,205:1,304:1};
  function clean(r){
    if(!r||!r.redirected||NB[r.status])return r;
    return r.blob().then(function(b){return new Response(b,{status:r.status,statusText:r.statusText,headers:r.headers});});
  }
  var _fetch=self.fetch.bind(self);
  self.fetch=function(input,init){
    if(input&&typeof input==='object'&&input.mode==='navigate')input=input.url;
    return _fetch(input,init).then(clean);
  };
  var cm=Cache.prototype.match;
  Cache.prototype.match=function(){return cm.apply(this,arguments).then(clean);};
  var sm=CacheStorage.prototype.match;
  CacheStorage.prototype.match=function(){return sm.apply(this,arguments).then(clean);};
})();

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
