const SHELL_CACHE="pokeca-shell-v4";
const RUNTIME_CACHE="pokeca-runtime-v4";
const SHELL=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k.startsWith("pokeca-shell-")&&k!==SHELL_CACHE).map(k=>caches.delete(k))
      .concat(keys.filter(k=>k.startsWith("pokeca-runtime-")&&k!==RUNTIME_CACHE).map(k=>caches.delete(k)))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    try{
      const res=await fetch(req);
      if(res && res.ok && new URL(req.url).origin===location.origin){
        const runtime=await caches.open(RUNTIME_CACHE);
        runtime.put(req,res.clone()).catch(()=>{});
      }
      return res;
    }catch(err){
      if(req.mode==="navigate"){
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
      throw err;
    }
  })());
});
