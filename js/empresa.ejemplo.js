// ══ PLANTILLA PARA UN CLIENTE NUEVO ═════════════════════════════════════════
// Copie este archivo sobre js/empresa.js en el repositorio del cliente nuevo y
// rellene los datos. Es lo ÚNICO que cambia: el resto del sistema es idéntico
// para todas las empresas.
//
// Este archivo no se carga nunca — no está en index.html. Solo sirve de molde.
// Los pasos completos están en herramientas/NUEVO-CLIENTE.md.

// ── Identidad, la que sale en pantalla y en la cabecera de los PDF ─────────
const EMPRESA={
  nombre:'NOMBRE DE LA EMPRESA',
  ruc:'00000000000',
  // Ponga el archivo en 09.-ERP/Imagenes/ y apunte aquí. Un PNG con fondo
  // transparente, de unos 400 px de ancho, se ve bien tanto en la pantalla de
  // acceso como en los PDF.
  logo:'09.-ERP/Imagenes/LOGO.png'
};

// ── Base de datos propia de esta empresa ──────────────────────────────────
// Cada cliente lleva su PROPIO proyecto de Supabase. Es lo que garantiza que
// los datos de una empresa no sean alcanzables desde otra: no comparten base,
// así que no hay forma de cruzarlas. Nunca reutilice aquí la URL de otro
// cliente.
const SUPA_URL = 'https://XXXXXXXXXXXX.supabase.co';
const SUPA_KEY = 'sb_publishable_XXXXXXXXXXXXXXXXXXXX';

// ── Quién entra y qué ve ──────────────────────────────────────────────────
// El código de acceso es lo que la persona escribe en la pantalla de inicio;
// conviene que sea corto y fácil de dictar. Debe ser único dentro de la lista.
//
// `areas` son las áreas completas a las que entra. Los nombres válidos salen
// de AREAS, en js/config.js: administracion, remuneraciones, bienestarSocial,
// almacenLogistica, operaciones, seguridad, mantenimiento, controlEquipos,
// controlProyecto, general, otros.
//
// `areaModules` (opcional) recorta un área a solo algunos módulos: útil para
// quien debe ver el tareaje pero no los sueldos, por ejemplo.
//
// Recibe AREAS como parámetro porque este archivo se carga antes que
// config.js; con Object.keys(A) se conceden todas las áreas de golpe.
const EMPRESA_USERS=A=>[
  {codigo:'ADMIN01',dni:'00000000',nombre:'Administrador',cargo:'Admin',areas:Object.keys(A)},
  {codigo:'ALMA01',dni:'00000001',nombre:'Jefe de Almacén',cargo:'Almacén',areas:['almacenLogistica','general']},
  {codigo:'RRHH01',dni:'00000002',nombre:'Recursos Humanos',cargo:'RR.HH.',
   areas:['remuneraciones','administracion'],
   areaModules:{administracion:['tareaje','resumenTareaje','roster']}}
];

// El logo de la pantalla de acceso.
(()=>{const el=document.getElementById('logoEmpresa');
  if(el){el.src=EMPRESA.logo;el.alt=EMPRESA.nombre;}})();
