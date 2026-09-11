// ══ CARGAR SOLO LOS MÓDULOS CONTRATADOS ═════════════════════════════════════
//
// Los scripts de los módulos están en index.html marcados como
// `type="text/gdar"` con `data-src`: el navegador ignora un tipo que no conoce,
// así que NO los descarga. Aquí se decide cuáles hacen falta y se inyectan.
//
// Un cliente que compró Almacén y Equipos se ahorra el Last Planner, la
// planilla, el recrecimiento y todo lo demás: entre 297 y 438 KB comprimidos
// según el plan. Quien contrató todo descarga exactamente lo mismo que antes.
//
// ── El orden importa ──────────────────────────────────────────────────────
// Varios módulos esperan que otro se haya ejecutado antes —costcontrolAnual.js
// usa cosas de costcontrol.js—, así que se inyectan con `async=false`, que
// obliga al navegador a ejecutarlos en el orden en que se insertaron aunque
// lleguen de la red en otro.
//
// ── Se cargan todos de golpe, no uno por pantalla ─────────────────────────
// Cargar cada módulo al abrirlo ahorraría más en el primer pintado, pero
// dejaría a renderPage dibujando una pantalla en blanco mientras llega el
// archivo. El ahorro que importa es no traer lo que no se compró, y eso ya se
// consigue así, sin cambiar en nada la experiencia.
//
// Se carga DESPUÉS de utils.js, que es donde vive gdarContratado.

// ── Cuándo se buscan las etiquetas ────────────────────────────────────────
// Al terminar de parsear el documento, no antes. Este archivo se carga junto
// al núcleo, arriba del todo, y en ese momento las etiquetas de los módulos
// todavía no existen en el DOM: están más abajo. Buscarlas ahí devuelve cero
// y la aplicación arranca sin una sola pantalla, que es exactamente lo que
// pasó la primera vez que se probó esto.
const GDAR_CARGA = { cargados: 0, omitidos: 0, listo: null };

GDAR_CARGA.listo = new Promise(resolve => {
  const arrancar = () => resolve(_gdarInyectar());
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
});

function _gdarInyectar() {
  const pendientes = [...document.querySelectorAll('script[type="text/gdar"][data-src]')];

  // Un módulo entra si esta empresa lo contrató. Un archivo entra si entra
  // alguno de los suyos: personal.js pinta nueve pantallas y basta con una.
  const hace_falta = el => {
    const mods = (el.dataset.mods || '').split(/\s+/).filter(Boolean);
    if (!mods.length) return true;              // ayudante: siempre
    if (typeof gdarContratado !== 'function') return true;   // sin registro, todo
    return mods.some(k => gdarContratado(k));
  };

  const aCargar = pendientes.filter(hace_falta);
  const omitidos = pendientes.length - aCargar.length;

  const listo = aCargar.length
    ? Promise.all(aCargar.map(el => new Promise(resolve => {
        const s = document.createElement('script');
        s.src = el.dataset.src;
        s.async = false;                         // ejecuta en orden de inserción
        // Un módulo que no llega no debe dejar la aplicación colgada: se avisa
        // y se sigue. Su pantalla quedará vacía, que es mejor que ninguna.
        s.onload = () => resolve(true);
        s.onerror = () => {
          console.warn('[carga] no se pudo traer ' + el.dataset.src);
          resolve(false);
        };
        document.head.appendChild(s);
      })))
    : Promise.resolve([]);

  GDAR_CARGA.cargados = aCargar.length;
  GDAR_CARGA.omitidos = omitidos;

  if (omitidos) console.info('[carga] ' + aCargar.length + ' módulos · '
    + omitidos + ' omitidos por el plan contratado');

  return listo;
}

// Quien necesite esperar a que estén todos. Lo usa doLogin: si alguien escribe
// su clave muy rápido, la aplicación no debe arrancar a medio cargar.
function gdarCargaListo() {
  return GDAR_CARGA && GDAR_CARGA.listo ? GDAR_CARGA.listo : Promise.resolve([]);
}
