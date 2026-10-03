// ══════════════════════════════════════════════════════════════════════════
//  GDAR · SERVICE WORKER
//
//  Hace que el sistema se pueda instalar en el celular como app y que abra
//  rápido. NO intenta trabajar sin señal: si no hay red, muestra la última
//  versión vista, nada más.
//
//  Reglas, pensadas para que NUNCA se quede pegado en una versión vieja:
//
//    · Lo que NO es de este dominio (Supabase, las librerías de CDN, las
//      fuentes) pasa de largo: el service worker ni lo toca. Así ningún dato
//      ni ninguna sesión se sirve de caché.
//    · Solo se atiende GET. Nada de guardar respuestas de escritura.
//    · index.html y la navegación: PRIMERO LA RED. Si responde, esa se usa y
//      se guarda; si no hay red, recién ahí sale la copia guardada. Por eso un
//      cambio subido a GitHub se ve en la siguiente carga con señal.
//    · js, css e imágenes: primero la caché, porque sus URL llevan ?v=N. Al
//      subir una versión nueva cambia la URL y se descarga sola.
//
//  Para forzar que todos los equipos renueven todo, se sube _CACHE_V.
// ══════════════════════════════════════════════════════════════════════════

const _CACHE_V = 'gdar-v1';

// Al instalar no se precarga nada: el sistema son 61 scripts y precargarlos
// haría eterna la instalación en una conexión de obra. Se va guardando lo que
// se usa, que termina siendo lo mismo tras la primera vuelta.
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Al activarse, se borra el caché de versiones anteriores
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(n => n !== _CACHE_V).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

function esEstatico(url) {
  return /\.(?:js|css|png|jpe?g|gif|svg|webp|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // solo lectura

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // Supabase y CDN: de largo

  // Navegación e index.html → primero la red, para no servir una versión vieja
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(_CACHE_V);
        cache.put(req, res.clone());
        return res;
      } catch (err) {
        const cacheada = await caches.match(req);
        return cacheada || new Response(
          '<!DOCTYPE html><meta charset="utf-8"><title>Sin conexión</title>' +
          '<body style="font-family:Arial,sans-serif;background:#0b1220;color:#e2e8f0;padding:2rem">' +
          '<h2>Sin conexión</h2><p>No se pudo abrir el sistema y no hay una copia guardada en este equipo.</p>' +
          '<p>Vuelva a intentarlo cuando tenga señal.</p></body>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // js, css e imágenes → primero la caché: sus URL llevan ?v=N, así que una
  // versión nueva tiene otra URL y se descarga sola.
  if (esEstatico(url)) {
    e.respondWith((async () => {
      const cacheada = await caches.match(req);
      if (cacheada) return cacheada;
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(_CACHE_V);
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        return cacheada || Response.error();
      }
    })());
  }
});
