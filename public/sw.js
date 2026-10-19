const CACHE='ala-delivery-static-v1';
const SHELL=['/offline.html','/icons/ala-192.png','/icons/ala-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ala-delivery-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
async function remember(request,response){if(!response.ok)return response;const cache=await caches.open(CACHE);await cache.put(request,response.clone());const keys=await cache.keys();const extras=keys.filter(key=>!SHELL.includes(new URL(key.url).pathname));if(extras.length>100)await Promise.all(extras.slice(0,extras.length-100).map(key=>cache.delete(key)));return response;}
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){if(url.pathname==='/')event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));return;}
 // Somente arquivos estáticos. Dados do banco, admin, pedidos e pagamentos ficam na rede.
 if(/^\/(assets|icons|catalogo-zpedidos)\//.test(url.pathname))event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>remember(request,response))));
});
