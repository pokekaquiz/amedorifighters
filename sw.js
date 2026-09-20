const SHELL_CACHE="pokeca-shell-v9";
const RUNTIME_CACHE="pokeca-runtime-v9";
const USER_CACHE="pokeca-user-offline-v7-all";
const SHELL=["./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(SHELL_CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>
        (k.startsWith("pokeca-shell-") && k!==SHELL_CACHE) ||
        (k.startsWith("pokeca-runtime-") && k!==RUNTIME_CACHE) ||
        (k.startsWith("pokeca-user-offline-") && k!==USER_CACHE)
      ).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  if(req.mode==="navigate" || url.pathname.endsWith("/index.html")){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:"no-store"});
        if(fresh && fresh.ok){
          const cache=await caches.open(SHELL_CACHE);
          cache.put(new Request(new URL("./index.html",self.registration.scope)),fresh.clone()).catch(()=>{});
        }
        return fresh;
      }catch(e){
        return (await caches.match(new Request(new URL("./index.html",self.registration.scope)))) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    try{
      const res=await fetch(req);
      if(res && res.ok){
        const runtime=await caches.open(RUNTIME_CACHE);
        runtime.put(req,res.clone()).catch(()=>{});
      }
      return res;
    }catch(e){
      return Response.error();
    }
  })());
});
