// ══ CONFIGURACIÓN DE LA EMPRESA ═════════════════════════════════════════════
// ESTE ES EL ÚNICO ARCHIVO QUE CAMBIA ENTRE UN CLIENTE Y OTRO.
//
// El resto del sistema es idéntico para todas las empresas, así que se
// sincroniza con un git pull desde el repositorio base sin tocar nada de aquí.
// Para montar un cliente nuevo: copie js/empresa.ejemplo.js sobre este archivo
// y rellene sus datos.
//
// Se carga ANTES que config.js, porque config.js crea el cliente de Supabase
// con SUPA_URL y SUPA_KEY en cuanto se ejecuta.

// ── Identidad, la que sale en pantalla y en los PDF ────────────────────────
const EMPRESA={
  nombre:'ECOSERMO',
  ruc:'20571533180',
  logo:'09.-ERP/Imagenes/ECOSERMO-LOGO.png'   // relativa a index.html
};

// ── Base de datos propia de esta empresa ──────────────────────────────────
// Cada cliente tiene su propio proyecto de Supabase. Es lo que garantiza que
// los datos de una empresa no sean alcanzables desde la otra: no comparten
// base, así que no hay forma de cruzarlas.
const SUPA_URL_PROD = 'https://kotqxhpkjuaxbgwhiode.supabase.co';
const SUPA_KEY_PROD = 'sb_publishable_2vedvLuUivaSULcoSGJcpQ_Womkq8ST';

// ── La misma aplicación, contra la base de desarrollo ─────────────────────
// Proyecto gdar-dev, aparte del de producción. Sirve para probar migraciones
// y cambios sin tocar la base con la que trabaja la gente todos los días.
const SUPA_URL_DEV  = 'https://wezrieubjcvcrtinppfw.supabase.co';
const SUPA_KEY_DEV  = 'sb_publishable_xveXhZxiouPGxKuGJ1SgJQ_efhokWUP';

// Cuál de las dos se usa lo decide DÓNDE está abierta la aplicación, no una
// bandera que alguien pueda olvidarse de volver a cambiar. Es lo que hace
// imposible que un merge a main deje a ECOSERMO apuntando a desarrollo: en
// ecosermo.gdarei.com la condición es falsa y punto.
//
// La comprobación de `location` es para Node: las suites de pruebas/ evalúan
// este archivo fuera del navegador, y ahí no existe. Sin sitio conocido, se
// asume producción, que es el valor que esas pruebas verifican.
const _GDAR_DEV = typeof location !== 'undefined' && (
  location.hostname === 'localhost'  ||
  location.hostname === '127.0.0.1'  ||
  location.hostname === '' ||                 // abierto como archivo
  location.hostname.endsWith('.pages.dev')    // vistas previas de Cloudflare
);

const SUPA_URL = _GDAR_DEV ? SUPA_URL_DEV : SUPA_URL_PROD;
const SUPA_KEY = _GDAR_DEV ? SUPA_KEY_DEV : SUPA_KEY_PROD;

// ── Qué contrató esta empresa ─────────────────────────────────────────────
// No todas compran lo mismo: una contratista de movimiento de tierras suele
// querer RR.HH., almacén y equipos, y no el Last Planner sobre el plano del
// dique. Lo que no está contratado no aparece en el menú de nadie, por más
// permisos que tenga la persona.
//
//   areas    todo lo que ofrecen esas áreas.  null = todas.
//   modulos  módulos sueltos, del área que sean.  null = ninguno aparte.
//
// Se suman. Para vender módulos sueltos sin ningún área entera, deje
// `areas:[]` y ponga la lista en `modulos`. Los nombres válidos salen de
// js/registro.js.
//
// ⚠ Esto decide qué se OFRECE, no a qué se puede llegar: el JavaScript viaja
//   al navegador. Lo que protege los datos son las políticas RLS y qué tablas
//   existen en la base de este cliente.
//
// ECOSERMO tiene todo, así que no hay nada que recortar.
const EMPRESA_PLAN={nombre:'Integral',areas:null,modulos:null};

// ── Cómo se valida quién entra ────────────────────────────────────────────
// 'local'    → esquema anterior: la credencial se compara contra la lista de
//              aquí abajo. Solo funciona con las políticas RLS abiertas.
// 'mixto'    → transición: primero prueba Supabase Auth y, si esa credencial
//              no existe todavía, cae a la lista local. Permite migrar de a
//              pocos sin dejar a nadie fuera. Las tablas siguen abiertas
//              mientras dure, así que es un estado de paso, no de destino.
// 'supabase' → solo Supabase Auth. Los permisos llegan firmados en el token y
//              los datos quedan cerrados a quien no haya iniciado sesión.
//              Es el modo que exige sql/rls_cerrar.sql.
//
// Es el interruptor de emergencia: si el login por Auth fallara, ponga
// 'local', suba el cambio y ejecute sql/rls_revertir.sql.
const AUTH_MODO='supabase';

// ── Quién entra y qué ve ──────────────────────────────────────────────────
// Recibe AREAS como parámetro (vive en config.js, que carga después) para que
// un usuario pueda pedir todas las áreas con Object.keys(A).
const EMPRESA_USERS=A=>[
  {codigo:'EIBEL25',nombre:'Abel Rodríguez A.',cargo:'PCO',areas:Object.keys(A)},
  {codigo:'NOEPAL',nombre:'Noelia Palomino',cargo:'Asist. Administración',areas:['general','administracion','almacenLogistica','seguridad','remuneraciones'],areaModules:{almacenLogistica:['kardexEpp'],seguridad:['cursosSeguridad']}},
  {codigo:'BELCRU',nombre:'Bella E. Cruz Olivares ',cargo:'Asistenta Social',areas:['bienestarSocial','administracion','seguridad'],areaModules:{administracion:['tareaje','resumenTareaje','roster']}},
  {codigo:'JON_GO',nombre:'Jonatan Gonzales',cargo:'Jefe de Contabilidad',areas:['otros']},
  {codigo:'ANDMAR',nombre:'Andres Martines',cargo:'Ing. Residente',areas:['general','administracion','seguridad'],areaModules:{seguridad:['cursosSeguridad']}},
  {codigo:'YONMEL',nombre:'Yonder Melendrez',cargo:'Supervisor de Almacén',areas:['almacenLogistica']},
  {codigo:'ELIDA',nombre:'Elida Solano',cargo:'Jefa de Operaciones',areas:['mantenimiento','controlEquipos','administracion','seguridad'],areaModules:{mantenimiento:['masterEquipos'],controlEquipos:['reporteEquipos','panelHoras'],administracion:['resumenTareaje'],seguridad:['cursosSeguridad']}},
  {codigo:'CA-R-ZE',nombre:'Carlos Zelada',cargo:'Jefe de mantenimiento',areas:['general','mantenimiento','controlEquipos'], areaModules:{controlEquipos:['reporteEquipos']}},
  {codigo:'JAYOJA',nombre:'Jaime Aquino J.',cargo:'Asist. de Mantenimiento', areas:['general','mantenimiento','controlEquipos'], areaModules:{controlEquipos:['reporteEquipos']}},
  {codigo:'ANT_CER',nombre:'Antony Cerquin Z.',cargo:'Ing. Planeamiento',areas:['general','administracion','controlProyecto','controlEquipos','mantenimiento','seguridad','costControl'],areaModules:{mantenimiento:['masterEquipos'],seguridad:['cursosSeguridad']}},
  {codigo:'J_A_TA',nombre:'Javier Tamara C. ',cargo:'Data Enter - 01',areas:['controlEquipos','controlProyecto','administracion','seguridad'],areaModules:{controlProyecto:['pizarra','recrecimiento'],administracion:['asistencia','resumenTareaje'],seguridad:['cursosSeguridad']},pizarraTabs:[3,4,5]},
  {codigo:'SIX_GQUI',nombre:'Sixto Quisoccapa G.',cargo:'Lider Control de EQ.',areas:['controlEquipos','administracion','seguridad'],areaModules:{administracion:['asistencia','tareaje'],seguridad:['cursosSeguridad']},readOnlyModules:['tareaje']},
  {codigo:'MARTONY',nombre:'Antony Martinez',cargo:'Data Enter - 02',areas:['administracion','controlEquipos','controlProyecto','seguridad'],areaModules:{administracion:['asistencia','resumenTareaje','tareaje'],controlProyecto:['recrecimiento','dailyReport'],seguridad:['cursosSeguridad']}},
  {codigo:'PIE_SA',nombre:'Piero Sanchez',cargo:'Control de equipos - 02',areas:['administracion','controlEquipos','seguridad'],areaModules:{administracion:['asistencia','resumenTareaje','tareaje']},readOnlyModules:['tareaje']},
  // Remuneraciones ve todo; de Administración, solo el tareaje y sus vistas.
  {codigo:'JOR_JA',nombre:'Jorge Jala',cargo:'Jefe de Recursos Humanos',areas:['administracion','remuneraciones'],areaModules:{administracion:['tareaje','resumenTareaje','roster']}},
  // Supervisión externa (BISA): solo consulta. Del Panel de Horas ve los tres
  {codigo:'CP.BISA_',nombre:'Juan Guerreo',cargo:'Control de Proy. Senior Bisa.',areas:['controlEquipos','controlProyecto'],areaModules:{controlEquipos:['panelHoras'],controlProyecto:['avanceMT']},panelHorasTabs:[1,2,3,4]},
];

// El logo de la pantalla de acceso. El src del HTML queda como respaldo:
// si este archivo no cargara, al menos se ve algo en lugar de un hueco.
(()=>{const el=document.getElementById('logoEmpresa');
  if(el){el.src=EMPRESA.logo;el.alt=EMPRESA.nombre;}})();

// Aviso de que esto NO es producción. La base de desarrollo lleva una copia de
// los datos reales, así que las dos pantallas se ven idénticas: sin una marca
// visible es cuestión de tiempo que alguien corrija un tareo en la que no era.
(()=>{
  if(!_GDAR_DEV || typeof document === 'undefined')return;
  console.info('%c GDAR · BASE DE DESARROLLO ','background:#b45309;color:#fff;font-weight:700',
    '\n' + SUPA_URL_DEV + '\nLos cambios que haga aquí no llegan a ECOSERMO.');
  const marca = document.createElement('div');
  marca.textContent = 'BASE DE DESARROLLO';
  marca.title = SUPA_URL_DEV;
  marca.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;'
    + 'background:repeating-linear-gradient(135deg,#b45309,#b45309 12px,#92400e 12px,#92400e 24px);'
    + 'color:#fff;font:600 11px/1 system-ui,sans-serif;letter-spacing:.16em;'
    + 'text-align:center;padding:4px 0;pointer-events:none';
  const poner = ()=>document.body && document.body.appendChild(marca);
  if(document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', poner);
  else poner();
})();
