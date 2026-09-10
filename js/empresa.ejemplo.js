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
const SUPA_URL_PROD = 'https://XXXXXXXXXXXX.supabase.co';
const SUPA_KEY_PROD = 'sb_publishable_XXXXXXXXXXXXXXXXXXXX';

// Una segunda base para probar migraciones y cambios sin tocar la que usa la
// gente. Si todavía no tiene una, apunte las dos a la misma: el sistema
// funciona igual, pero pierde la red.
const SUPA_URL_DEV  = 'https://XXXXXXXXXXXX.supabase.co';
const SUPA_KEY_DEV  = 'sb_publishable_XXXXXXXXXXXXXXXXXXXX';

// Cuál se usa lo decide DÓNDE está abierta la aplicación, no una bandera que
// alguien pueda olvidarse de volver a cambiar: en el dominio del cliente,
// producción; en localhost y en las vistas previas, desarrollo.
const _GDAR_DEV = typeof location !== 'undefined' && (
  location.hostname === 'localhost'  ||
  location.hostname === '127.0.0.1'  ||
  location.hostname === '' ||
  location.hostname.endsWith('.pages.dev')
);

const SUPA_URL = _GDAR_DEV ? SUPA_URL_DEV : SUPA_URL_PROD;
const SUPA_KEY = _GDAR_DEV ? SUPA_KEY_DEV : SUPA_KEY_PROD;

// ── Las convenciones del contrato ─────────────────────────────────────────
// EMPRESA_CORTE es el día en que abre el período con el que se valoriza: 21
// significa "del 21 de un mes al 20 del siguiente", y 1 el mes calendario.
// Gobierna partes diarios, combustible, EDP de proveedores, tareaje, costo por
// m³ e informe de período.
//
// EMPRESA_DIAS_MES es el divisor que pasa días-hombre a mes-hombre en las
// partidas de personal de la valorización: con 30, quien trabajó 45 días vale
// 1.5. Otro contrato puede decir 26 (días útiles) o 30.4 (promedio del año).
//
// Los dos cambian lo que se le factura al cliente, así que conviene
// confirmarlos contra el contrato antes de la primera valorización.
const EMPRESA_CORTE=21;
const EMPRESA_DIAS_MES=30;

// El respaldo de partidas que queda en js/valPresupuesto.js es el contrato
// del PRIMER cliente, no el suyo. En false, la valorización sale vacía hasta
// que cargue su contrato en la tabla val_presupuesto — que es lo que debe
// pasar. Dejarlo en true haría que valorizara con precios de otra empresa.
const EMPRESA_VAL_RESPALDO=false;

// ── Qué contrató esta empresa ─────────────────────────────────────────────
// Lo que no esté aquí no aparece en el menú de nadie, por más permisos que
// tenga la persona. Es lo que permite vender el sistema por partes.
//
//   areas    todo lo que ofrecen esas áreas.  null = todas.
//   modulos  módulos sueltos, del área que sean.  null = ninguno aparte.
//
// Se suman, así que el ejemplo de abajo da RR.HH., almacén y equipos
// completos, más el histograma de recursos que vive en General.
//
// Las áreas válidas salen de GDAR_AREAS y los módulos de GDAR_MODULOS, los
// dos en js/registro.js.
//
// ⚠ Esto decide qué se OFRECE, no a qué se puede llegar: el JavaScript viaja
//   al navegador y cualquiera puede leerlo. Lo que protege los datos son las
//   políticas RLS y qué tablas existen en la base de este cliente. Si de
//   verdad no debe poder tocar un módulo, sus tablas no van en su base.
const EMPRESA_PLAN={
  nombre:'Operación',
  areas:['administracion','almacenLogistica','controlEquipos','mantenimiento'],
  modulos:['histograma']
};

// Para el que contrata todo:
//   const EMPRESA_PLAN={nombre:'Integral',areas:null,modulos:null};

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
