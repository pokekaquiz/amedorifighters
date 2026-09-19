const SHELL_CACHE="pokeca-shell-v5";
const RUNTIME_CACHE="pokeca-runtime-v5";
const USER_CACHE="pokeca-user-offline-v4-all";
const SHELL=["./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c=>c.addAll(SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys
        .filter(k=>
          (k.startsWith("pokeca-shell-") && k!==SHELL_CACHE) ||
          (k.startsWith("pokeca-runtime-") && k!==RUNTIME_CACHE)
        )
        .map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

async function cacheFreshIndex(response){
  if(!response || !response.ok)return;
  const cache=await caches.open(SHELL_CACHE);
  const canonical=new Request(new URL("./index.html",self.registration.scope));
  await cache.put(canonical,response.clone());
}

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;

  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  // HTML navigation is NETWORK FIRST so GitHub updates appear immediately.
  if(req.mode==="navigate" || url.pathname.endsWith("/index.html")){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:"no-store"});
        await cacheFreshIndex(fresh);
        return fresh;
      }catch(err){
        return (await caches.match(new Request(new URL("./index.html",self.registration.scope))))
          || (await caches.match("./"))
          || Response.error();
      }
    })());
    return;
  }

  // Images/assets remain CACHE FIRST for offline speed.
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
    }catch(err){
      return Response.error();
    }
  })());
});
