// ══ QUE LA APLICACIÓN ABRA SIN RED ══════════════════════════════════════════
//
// En faena, a 4400 metros, la conexión se cae. Sin esto, abrir el sistema con
// la red caída da una pantalla de error del navegador: ni siquiera se ve la
// pantalla de acceso.
//
// Lo que esto guarda es el CASCARÓN —el HTML, los estilos, los scripts, el
// logo—, no los datos. Los datos siguen necesitando red: una copia vieja del
// tareaje sería peor que no tener nada, porque nadie sabría que es vieja. Eso
// es otro trabajo (la cola de escrituras offline) y va aparte.
//
// ── La regla de oro de un service worker ──────────────────────────────────
// El desastre clásico es servir código viejo para siempre: el usuario queda
// atrapado en una versión y no hay forma de sacarlo desde el servidor.
//
// Aquí no puede pasar, por dos motivos:
//
//   1. index.html va SIEMPRE a la red primero. Si hay conexión, se sirve el
//      último; la copia guardada solo aparece cuando no hay red.
//   2. Los scripts y los estilos llevan el hash de su contenido en la URL
//      (?v=689aea48, lo pone `npm run sellar`). Si el archivo cambia, la URL
//      cambia, así que servir desde caché es servir exactamente lo pedido.
//      Sin esos sellos, este archivo sería una mala idea.
//
// ── Lo que NUNCA se guarda ────────────────────────────────────────────────
// Nada de Supabase. Son datos de la empresa, viajan con la sesión iniciada, y
// una respuesta guardada podría acabar en el navegador de otra persona que use
// el mismo equipo. Se dejan pasar a la red sin tocarlas.
//
// ── Cómo apagarlo ─────────────────────────────────────────────────────────
// Si algo sale mal: poner VERSION en 'desactivado', correr `npm run sellar` y
// publicar. El service worker se borra a sí mismo, limpia lo guardado y deja
// de intervenir en cada navegador que abra la aplicación.

// Lo escribe herramientas/sellar.js con el hash de index.html: cuando cambia
// el índice, cambia el nombre de la caché y la anterior se borra sola.
const VERSION = 'c1d53c15';

const CACHE = 'gdar-' + VERSION;
const DESACTIVADO = VERSION === 'desactivado';

// El cascarón mínimo: lo que hace falta para que se vea la pantalla de acceso.
// El resto —los módulos, el logo, las librerías— se guarda a medida que se
// pide, que es más honesto que adivinar una lista aquí y que se desactualice.
const CASCARON = ['./', './index.html'];

self.addEventListener('install', e => {
  if (DESACTIVADO) return;
  // Se toma el relevo en la siguiente carga, no a mitad de sesión: cambiar el
  // código debajo de una aplicación que ya está corriendo mezcla versiones.
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CASCARON)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    if (DESACTIVADO) {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter(n => n.startsWith('gdar-')).map(n => caches.delete(n)));
      await self.registration.unregister();
      const clientes = await self.clients.matchAll({ type: 'window' });
      clientes.forEach(c => c.navigate(c.url));      // que vuelvan a la red
      return;
    }
    // Fuera las cachés de versiones anteriores.
    const nombres = await caches.keys();
    await Promise.all(
      nombres.filter(n => n.startsWith('gdar-') && n !== CACHE).map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

function esDeLaCasa(url) {
  return url.origin === self.location.origin;
}

// Lo que lleva sello en la URL se puede servir de la caché sin miedo: si el
// contenido cambiara, la URL sería otra.
function llevaSello(url) {
  return /[?&]v=[A-Za-z0-9]{6,}/.test(url.search);
}

self.addEventListener('fetch', e => {
  if (DESACTIVADO) return;
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Supabase, nunca. Ni la API ni la autenticación.
  if (/supabase\.(co|in)$/.test(url.hostname)) return;

  // El índice y cualquier navegación: red primero, caché como red de emergencia.
  if (req.mode === 'navigate' || (esDeLaCasa(url) && url.pathname.endsWith('/index.html'))) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        const c = await caches.open(CACHE);
        c.put('./index.html', r.clone());
        return r;
      } catch (err) {
        const guardado = await caches.match('./index.html');
        return guardado || Response.error();
      }
    })());
    return;
  }

  // Scripts y estilos sellados, imágenes propias, y las librerías del CDN:
  // caché primero, y si no está, se pide y se guarda.
  const propioSellado = esDeLaCasa(url) && llevaSello(url);
  const imagenPropia = esDeLaCasa(url) && /\.(png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
  const libreria = !esDeLaCasa(url) &&
    /(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com|fonts\.(googleapis|gstatic)\.com)$/
      .test(url.hostname);

  if (!propioSellado && !imagenPropia && !libreria) return;

  e.respondWith((async () => {
    const guardado = await caches.match(req);
    if (guardado) return guardado;
    try {
      const r = await fetch(req);
      // Una respuesta opaca (las del CDN) no deja mirar el estado; se guarda
      // igual, porque servirla es exactamente lo que hace el navegador.
      if (r && (r.ok || r.type === 'opaque')) {
        const c = await caches.open(CACHE);
        c.put(req, r.clone());
      }
      return r;
    } catch (err) {
      return guardado || Response.error();
    }
  })());
});
